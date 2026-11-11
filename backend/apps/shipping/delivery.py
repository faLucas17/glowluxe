"""
Attribution des livraisons (façon Yango) :
1. l'admin passe la commande « Prête » -> une livraison est créée ;
2. elle est proposée au livreur validé, disponible, en ligne, le moins occupé et le plus proche ;
3. il a quelques minutes pour accepter, sinon le suivant ;
4. dès qu'il accepte, le client reçoit son nom + téléphone + lien de suivi en direct.
"""

from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.core.emails import send_email
from apps.core.models import ShopSettings

from .models import CourierProfile, Delivery, haversine_km, online_since

MAX_ACTIVE = 2


def candidates(exclude=()):
    return (
        CourierProfile.objects.filter(status="approved", is_available=True, last_seen__gte=online_since())
        .exclude(pk__in=exclude)
        .annotate(active=Count("deliveries", filter=Q(deliveries__status__in=Delivery.ACTIVE)))
        .filter(active__lt=MAX_ACTIVE)
        .select_related("user")
    )


def pick(delivery):
    shop = ShopSettings.load()
    pool = list(candidates(delivery.declined_by.values_list("pk", flat=True)))
    if not pool:
        return None

    def score(c):
        dist = 50.0
        if c.last_latitude is not None:
            dist = haversine_km(c.last_latitude, c.last_longitude, shop.pickup_latitude, shop.pickup_longitude)
        return (c.active, dist)

    return sorted(pool, key=score)[0]


def dispatch(order):
    d, _ = Delivery.objects.get_or_create(order=order)
    if d.status in ("searching", "offered", "failed"):
        d.cash_to_collect = Decimal(order.amount_due).quantize(Decimal("1"))
        d.save(update_fields=["cash_to_collect", "updated_at"])
        offer_next(d)
        d.refresh_from_db()
    return d


def offer_next(delivery):
    with transaction.atomic():
        d = Delivery.objects.select_for_update().get(pk=delivery.pk)
        courier = pick(d)
        d.courier = courier
        d.status = "offered" if courier else "searching"
        d.offered_at = timezone.now() if courier else None
        d.save(update_fields=["courier", "status", "offered_at", "updated_at"])
    if courier:
        send_email(
            "courier_offer", f"Nouvelle course GlowLuxe - {d.order.order_number}", courier.user.email,
            {"delivery": d, "courier": courier, "minutes": ShopSettings.load().courier_offer_minutes},
        )
    return courier


def expire_stale_offers():
    limit = timezone.now() - timezone.timedelta(minutes=ShopSettings.load().courier_offer_minutes)
    for d in Delivery.objects.filter(status="offered", offered_at__lt=limit):
        if d.courier_id:
            d.declined_by.add(d.courier_id)
        offer_next(d)
    for d in Delivery.objects.filter(status="searching")[:20]:
        offer_next(d)


def accept(delivery, courier):
    with transaction.atomic():
        d = Delivery.objects.select_for_update().select_related("order__user").get(pk=delivery.pk)
        if d.status != "offered" or d.courier_id != courier.pk:
            return False
        d.status = "accepted"
        d.accepted_at = timezone.now()
        d.save(update_fields=["status", "accepted_at", "updated_at"])
    order = d.order
    send_email(
        "delivery_assigned", f"Votre livreur arrive - {order.order_number}", order.user.email,
        {"order": order, "courier": courier, "tracking_url": f"{settings.APP_URL}/commandes/{order.pk}/suivi"},
    )
    return True


def decline(delivery, courier):
    with transaction.atomic():
        d = Delivery.objects.select_for_update().get(pk=delivery.pk)
        if d.courier_id != courier.pk or d.status not in ("offered", "accepted"):
            return False
        d.declined_by.add(courier)
    offer_next(d)
    return True


def advance(delivery, courier, new_status, cash=None, note=""):
    from apps.orders.services import notify_status

    allowed = {
        "accepted": ("picked_up", "failed"),
        "picked_up": ("on_the_way", "delivered", "failed"),
        "on_the_way": ("delivered", "failed"),
    }
    with transaction.atomic():
        d = Delivery.objects.select_for_update().select_related("order").get(pk=delivery.pk)
        if d.courier_id != courier.pk or new_status not in allowed.get(d.status, ()):
            return False
        now = timezone.now()
        order = d.order
        d.status = new_status
        if note:
            d.courier_note = note[:255]
        if new_status == "picked_up":
            d.picked_up_at = now
            order.status = "out_for_delivery"
        elif new_status == "on_the_way":
            order.status = "out_for_delivery"
        elif new_status == "delivered":
            d.delivered_at = now
            order.status = "delivered"
            if cash:
                d.cash_collected = cash
        elif new_status == "failed":
            order.status = "ready"
        d.save()
        order.save(update_fields=["status", "updated_at"])
    if new_status == "delivered" and d.cash_collected:
        from apps.payments.models import Payment

        Payment.objects.create(
            order=order, method="cash", gateway="cash", purpose="balance", amount=d.cash_collected
        ).confirm(f"livreur:{courier.pk}")
    if new_status in ("picked_up", "delivered"):
        notify_status(order)
    return True
