"""Actions de l'espace de gestion (mêmes règles que l'ancienne administration Django)."""
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from apps.accounts.tokens import make_unsubscribe_token
from apps.core.emails import send_bulk, send_email
from apps.orders.services import confirm_payment, notify_status, release_stock
from apps.payments.models import Payment
from apps.shipping import delivery as dispatch_service

# Statuts vers lesquels la gérante peut faire passer une commande
NEXT_STATUSES = {
    "pending": ["cancelled"],
    "deposit_paid": ["processing", "ready", "cancelled"],
    "paid": ["processing", "ready", "cancelled"],
    "processing": ["ready", "cancelled"],
    "ready": ["out_for_delivery", "delivered", "cancelled"],
    "shipped": ["out_for_delivery", "delivered"],
    "in_transit": ["out_for_delivery", "delivered"],
    "out_for_delivery": ["delivered"],
    "delivered": ["refunded"],
    "cancelled": [],
    "refunded": [],
}


class ActionError(Exception):
    pass


def change_status(order, new_status):
    if new_status not in NEXT_STATUSES.get(order.status, []):
        raise ActionError("Ce changement de statut n'est pas possible pour cette commande.")
    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    message = "Statut mis à jour."
    if new_status == "cancelled":
        release_stock(order)
        message = "Commande annulée, le stock a été remis."
    if new_status == "ready":
        d = dispatch_service.dispatch(order)
        message = (
            f"Course proposée à {d.courier}." if d.courier_id
            else "Aucun livreur disponible : la course sera proposée dès qu'un livreur se connecte."
        )
    notify_status(order)
    return message


def record_payment(order, amount, method="manual"):
    """Paiement reçu hors appli (WhatsApp, Wave direct, espèces) : compté une seule fois."""
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ActionError("Montant invalide.")
    if amount > order.amount_due:
        raise ActionError(f"Le montant dépasse le reste à payer ({int(order.amount_due)} F).")
    if method not in ("manual", "cash", "wave", "orange_money"):
        method = "manual"
    if order.status in ("cancelled", "refunded"):
        raise ActionError("Commande annulée : paiement impossible.")
    purpose = "balance" if order.amount_paid > 0 else ("full" if amount >= order.amount_due else "deposit")
    payment = Payment.objects.create(
        order=order, method=method, gateway="manual", purpose=purpose, amount=amount,
        raw_response={"source": "espace de gestion", "at": timezone.now().isoformat()},
    )
    confirm_payment(payment, provider_reference="gestion")
    return payment


def relaunch_delivery(order):
    d = getattr(order, "delivery", None)
    if not d:
        if order.status != "ready":
            raise ActionError("Passez d'abord la commande en « Prête ».")
        d = dispatch_service.dispatch(order)
    elif d.status in ("searching", "offered", "failed"):
        d.declined_by.clear()
        dispatch_service.offer_next(d)
        d.refresh_from_db()
    else:
        raise ActionError("Un livreur a déjà accepté cette course.")
    return f"Course proposée à {d.courier}." if d.courier_id else "Toujours aucun livreur disponible."


def send_promotion(promo):
    users = list(get_user_model().objects.filter(is_active=True, newsletter=True, email_verified=True))
    if not users:
        raise ActionError("Aucune cliente inscrite avec un email vérifié pour le moment.")

    def ctx(user):
        return {"user": user, "promo": promo,
                "unsubscribe_url": settings.SITE_URL + reverse("unsubscribe", args=[make_unsubscribe_token(user)])}

    send_bulk("promotion", f"{promo.title} - GlowLuxe", users, ctx)
    promo.emailed_at, promo.emailed_count = timezone.now(), len(users)
    promo.save(update_fields=["emailed_at", "emailed_count"])
    return len(users)


def approve_courier(courier):
    courier.status, courier.approved_at = "approved", timezone.now()
    courier.save(update_fields=["status", "approved_at"])
    send_email("courier_approved", "Votre compte livreur GlowLuxe est validé", courier.user.email, {"courier": courier})
