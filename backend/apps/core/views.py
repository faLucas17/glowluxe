from django.conf import settings
from django.db import connection
from django.http import Http404, JsonResponse
from django.shortcuts import render
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.http import require_GET
from rest_framework import generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Promotion, ShopSettings


def healthz(request):
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
    except Exception:
        return JsonResponse({"status": "db_error"}, status=503)
    return JsonResponse({"status": "ok"})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def api_root(request):
    return Response({"name": "GlowLuxe API", "products": request.build_absolute_uri("/api/products/")})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def app_config(request):
    """Infos boutique pour l'appli (À propos, règles d'acompte, moyens de paiement)."""
    from apps.payments.services import available_methods
    from apps.shipping.models import DeliveryZone
    from apps.shipping.serializers import DeliveryZoneSerializer

    s = ShopSettings.load()
    return Response({
        "shop": {
            "name": s.shop_name, "phone": s.contact_phone, "email": s.contact_email, "address": s.address,
            "hours": s.opening_hours, "whatsapp": s.whatsapp_number,
            "lat": float(s.pickup_latitude), "lng": float(s.pickup_longitude),
        },
        "deposit": {
            "threshold": s.deposit_threshold, "percent": s.deposit_percent,
            "percent_made_to_order": s.deposit_percent_made_to_order, "minimum": s.minimum_deposit,
        },
        "allow_fee_on_arrival": s.allow_delivery_fee_on_arrival,
        "payment_methods": available_methods(),
        "zones": DeliveryZoneSerializer(DeliveryZone.objects.filter(is_active=True), many=True).data,
    })


class PromotionSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    category_slug = serializers.CharField(source="category.slug", default=None, read_only=True)

    class Meta:
        model = Promotion
        fields = ["id", "title", "message", "code", "image", "category_slug", "ends_at"]

    def get_image(self, obj):
        from apps.catalog.serializers import image_url

        return image_url(obj.image, self.context.get("request"), 900)


class PromotionListView(generics.ListAPIView):
    """Promotions en cours : visibles uniquement par les clients connectés."""

    serializer_class = PromotionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Promotion.objects.live().select_related("category")[:5]


# ─────────────── Pages web ───────────────
def landing(request):
    return render(request, "core/landing.html", {"shop": ShopSettings.load(), "app_url": settings.APP_URL})


def verify_email(request, token):
    from apps.accounts.tokens import read_verify_token

    user = read_verify_token(token)
    if user and not user.email_verified:
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        from .emails import send_email

        send_email("welcome", "Bienvenue chez GlowLuxe", user.email, {"user": user})
    return render(request, "core/message.html", {
        "title": "Email confirmé ✨" if user else "Lien expiré",
        "text": "Merci ! Vous recevrez vos commandes et nos promotions à cette adresse." if user
        else "Ce lien n'est plus valide. Demandez un nouvel email depuis votre profil dans l'appli.",
    })


def unsubscribe(request, token):
    from apps.accounts.tokens import read_unsubscribe_token

    user = read_unsubscribe_token(token)
    if user is None:
        raise Http404
    done = False
    if request.method == "POST":
        user.newsletter = False
        user.save(update_fields=["newsletter"])
        done = True
    return render(request, "core/unsubscribe.html", {"done": done})


@xframe_options_exempt  # affichée dans l'appli web (autre domaine) ; page en lecture seule protégée par jeton
def tracking_map(request, token):
    from apps.shipping.views import read_map_token

    order = read_map_token(token)
    if order is None:
        raise Http404
    return render(request, "core/tracking_map.html", {"order": order, "token": token, "shop": ShopSettings.load()})


@require_GET
def tracking_map_data(request, token):
    from apps.shipping.delivery import expire_stale_offers
    from apps.shipping.views import read_map_token, tracking_payload

    order = read_map_token(token)
    if order is None:
        raise Http404
    expire_stale_offers()
    data = tracking_payload(order)
    if data["courier"]:
        data["courier"].pop("phone", None)  # la carte n'a pas besoin du numéro
    data["amount_due"] = str(data["amount_due"])
    resp = JsonResponse(data, json_dumps_params={"default": str})
    resp["Cache-Control"] = "no-store"
    return resp
