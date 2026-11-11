from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core import signing
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.emails import send_email
from apps.core.models import ShopSettings
from apps.orders.models import Order

from . import delivery as svc
from .models import CourierProfile, Delivery, DeliveryZone, Shipment, eta_minutes, haversine_km
from .serializers import (
    CourierApplicationSerializer,
    CourierDeliverySerializer,
    DeliveryZoneSerializer,
    ShipmentSerializer,
)

MAP_SALT = "glowluxe.tracking-map"


class ShipmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "tracking_number"

    def get_queryset(self):
        return Shipment.objects.filter(order__user=self.request.user).prefetch_related("events")


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def zones(request):
    return Response(DeliveryZoneSerializer(DeliveryZone.objects.filter(is_active=True), many=True).data)


def _coord(v, lo, hi):
    try:
        d = Decimal(str(v))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return d.quantize(Decimal("0.000001")) if lo <= d <= hi else None


def tracking_payload(order):
    """Données de suivi (utilisées par l'appli et par la carte)."""
    shop = ShopSettings.load()
    d = Delivery.objects.select_related("courier__user").filter(order=order).first()
    snap = order.address_snapshot or {}
    data = {
        "order_number": order.order_number,
        "order_status": order.status,
        "order_status_display": order.get_status_display(),
        "status": d.status if d else None,
        "status_display": d.get_status_display() if d else order.get_status_display(),
        "shop": {"lat": float(shop.pickup_latitude), "lng": float(shop.pickup_longitude), "name": shop.shop_name},
        "destination": {"lat": float(snap["lat"]), "lng": float(snap["lng"])} if snap.get("lat") else None,
        "courier": None,
        "amount_due": order.amount_due,
    }
    if d and d.courier and d.status in Delivery.TRACKABLE:
        c = d.courier
        info = {"name": c.display_name, "phone": c.phone, "vehicle": c.get_vehicle_display()}
        if c.last_latitude is not None:
            info.update(lat=float(c.last_latitude), lng=float(c.last_longitude), updated=c.last_seen)
            target = data["destination"] if d.status in ("picked_up", "on_the_way") else data["shop"]
            if target:
                km = haversine_km(c.last_latitude, c.last_longitude, target["lat"], target["lng"])
                info.update(distance_km=round(km, 1), eta_min=eta_minutes(km, c.vehicle))
        data["courier"] = info
    return data


class TrackingView(APIView):
    """GET /api/tracking/{order_id}/ : statut, livreur, position, temps estimé, lien carte."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, pk=order_id, user=request.user)
        svc.expire_stale_offers()
        data = tracking_payload(order)
        token = signing.dumps(str(order.pk), salt=MAP_SALT)
        data["map_url"] = settings.SITE_URL + reverse("tracking-map", args=[token])
        return Response(data)


def read_map_token(token):
    try:
        order_id = signing.loads(token, salt=MAP_SALT, max_age=60 * 60 * 24 * 7)
    except signing.BadSignature:
        return None
    return Order.objects.filter(pk=order_id).first()


# ─────────────── Espace livreur ───────────────
class CourierViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _courier(self, approved=True):
        c = getattr(self.request.user, "courier_profile", None)
        if c is None or (approved and c.status != "approved"):
            raise NotFound("Espace livreur non activé.")
        return c

    @action(detail=False, methods=["get", "post"])
    def apply(self, request):
        """GET : état de ma candidature. POST : devenir livreur."""
        existing = getattr(request.user, "courier_profile", None)
        if request.method == "GET":
            return Response({"status": existing.status if existing else None})
        if existing:
            return Response({"detail": "Candidature déjà envoyée.", "status": existing.status}, status=400)
        s = CourierApplicationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        profile = s.save(user=request.user)
        send_email("courier_application", f"Candidature livreur : {profile.display_name}",
                   ShopSettings.load().contact_email, {"profile": profile})
        return Response({"status": profile.status, "detail": "Candidature envoyée ! Nous vous contactons rapidement."}, status=201)

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        c = self._courier()
        svc.expire_stale_offers()
        qs = c.deliveries.select_related("order__delivery_zone").prefetch_related("order__items")
        ser = lambda q: CourierDeliverySerializer(q, many=True).data  # noqa: E731
        return Response({
            "is_available": c.is_available,
            "offer_minutes": ShopSettings.load().courier_offer_minutes,
            "shop": {"address": ShopSettings.load().address},
            "offers": ser(qs.filter(status="offered")),
            "active": ser(qs.filter(status__in=("accepted", "picked_up", "on_the_way"))),
            "history": ser(qs.filter(status__in=("delivered", "failed"))[:20]),
        })

    @action(detail=False, methods=["post"])
    def availability(self, request):
        c = self._courier()
        c.is_available = bool(request.data.get("is_available"))
        c.last_seen = timezone.now()
        c.save(update_fields=["is_available", "last_seen"])
        if c.is_available:
            svc.expire_stale_offers()
        return Response({"is_available": c.is_available})

    @action(detail=False, methods=["post"])
    def location(self, request):
        """Le téléphone du livreur envoie sa position toutes les ~15 s."""
        c = self._courier()
        lat, lng = _coord(request.data.get("lat"), -90, 90), _coord(request.data.get("lng"), -180, 180)
        fields = {"last_seen": timezone.now()}
        if lat is not None and lng is not None:
            fields.update(last_latitude=lat, last_longitude=lng)
        CourierProfile.objects.filter(pk=c.pk).update(**fields)
        svc.expire_stale_offers()
        return Response({"offers": c.deliveries.filter(status="offered").count()})

    @action(detail=False, methods=["post"], url_path=r"deliveries/(?P<delivery_id>\d+)/(?P<act>[a-z_]+)")
    def act(self, request, delivery_id=None, act=None):
        c = self._courier()
        d = get_object_or_404(Delivery, pk=delivery_id, courier=c)
        if act == "accept":
            ok = svc.accept(d, c)
        elif act == "decline":
            ok = svc.decline(d, c)
        elif act in ("picked_up", "on_the_way", "delivered", "failed"):
            cash = None
            if act == "delivered" and d.cash_to_collect > 0:
                cash = _coord(request.data.get("cash_collected", 0), 0, d.cash_to_collect)
                if cash is None:
                    return Response({"detail": "Montant encaissé invalide."}, status=400)
                cash = cash.quantize(Decimal("1"))
            ok = svc.advance(d, c, act, cash, request.data.get("note", ""))
        else:
            raise NotFound
        if not ok:
            return Response({"detail": "Action impossible (course réattribuée ?)."}, status=status.HTTP_409_CONFLICT)
        return Response({"detail": "OK"})
