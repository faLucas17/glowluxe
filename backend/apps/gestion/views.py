"""API de l'espace de gestion : réservée aux comptes gérante (is_staff)."""
from datetime import timedelta

from django.conf import settings as dj_settings
from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce, TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from apps.catalog.models import Category, Product, ProductImage, Review
from apps.core.models import Promotion, ShopSettings
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.shipping.models import CourierProfile, Delivery, DeliveryZone

from . import serializers as s
from .services import ActionError, approve_courier, change_status, record_payment, relaunch_delivery, send_promotion

User = get_user_model()
PARSERS = [JSONParser, MultiPartParser, FormParser]


class Pages(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 200


class Base(viewsets.GenericViewSet):
    permission_classes = [IsAdminUser]
    pagination_class = Pages
    parser_classes = PARSERS
    throttle_classes = []


def fail(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"detail": message}, status=code)


# ── Tableau de bord ──
@api_view(["GET"])
@permission_classes([IsAdminUser])
def dashboard(request):
    now = timezone.localtime()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month = today.replace(day=1)
    ok = Payment.objects.filter(status="success")
    zero = Value(0, output_field=DecimalField())

    def cash(qs):
        return int(qs.aggregate(t=Coalesce(Sum("amount"), zero))["t"])

    week_start = today - timedelta(days=6)
    per_day = {
        r["d"]: int(r["t"]) for r in ok.filter(created_at__gte=week_start)
        .annotate(d=TruncDate("created_at")).values("d").annotate(t=Sum("amount"))
    }
    days = []
    for i in range(7):
        d = (week_start + timedelta(days=i)).date()
        days.append({"date": d.isoformat(), "label": ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][d.weekday()], "amount": per_day.get(d, 0)})

    recent = Order.objects.select_related("user", "delivery_zone").annotate(items_count=Count("items"))[:6]
    low = Product.objects.filter(is_active=True, made_to_order=False, stock_quantity__lte=3).order_by("stock_quantity")[:8]
    return Response({
        "revenue_today": cash(ok.filter(created_at__gte=today)),
        "revenue_month": cash(ok.filter(created_at__gte=month)),
        "orders_today": Order.objects.filter(created_at__gte=today).count(),
        "to_prepare": Order.objects.filter(status__in=("deposit_paid", "paid", "processing")).count(),
        "awaiting_payment": Order.objects.filter(status="pending").count(),
        "awaiting_courier": Delivery.objects.filter(status__in=("searching", "failed")).count(),
        "in_delivery": Delivery.objects.filter(status__in=Delivery.ACTIVE).count(),
        "courier_applications": CourierProfile.objects.filter(status="pending").count(),
        "clients": User.objects.filter(is_staff=False).count(),
        "products": Product.objects.filter(is_active=True).count(),
        "week": days,
        "recent_orders": s.OrderListSerializer(recent, many=True).data,
        "low_stock": [{"id": str(p.id), "name": p.name, "stock": p.stock_quantity} for p in low],
    })


# ── Commandes ──
class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, Base):
    filter_backends = [filters.SearchFilter]
    search_fields = ["order_number", "user__email", "user__first_name", "user__last_name", "user__phone_number"]

    def get_queryset(self):
        qs = Order.objects.select_related("user", "delivery_zone", "delivery__courier__user").annotate(items_count=Count("items")).order_by("-created_at")
        st = self.request.query_params.get("status")
        groups = {"a_traiter": ("deposit_paid", "paid", "processing"), "en_livraison": ("ready", "shipped", "in_transit", "out_for_delivery")}
        if st in groups:
            qs = qs.filter(status__in=groups[st])
        elif st:
            qs = qs.filter(status=st)
        return qs

    def get_serializer_class(self):
        return s.OrderListSerializer if self.action == "list" else s.OrderDetailSerializer

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()  # seule la note interne est modifiable directement
        order.notes = request.data.get("notes", order.notes)
        order.save(update_fields=["notes", "updated_at"])
        return Response(s.OrderDetailSerializer(order, context={"request": request}).data)

    def _done(self, order, message):
        order.refresh_from_db()
        data = s.OrderDetailSerializer(order, context={"request": self.request}).data
        return Response({"message": message, "order": data})

    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        order = self.get_object()
        try:
            return self._done(order, change_status(order, request.data.get("status")))
        except ActionError as e:
            return fail(str(e))

    @action(detail=True, methods=["post"])
    def payment(self, request, pk=None):
        order = self.get_object()
        try:
            p = record_payment(order, request.data.get("amount", 0), request.data.get("method", "manual"))
        except (ActionError, ValueError, ArithmeticError) as e:
            return fail(str(e) if isinstance(e, ActionError) else "Montant invalide.")
        return self._done(order, f"Paiement de {int(p.amount)} F enregistré.")

    @action(detail=True, methods=["post"])
    def relaunch(self, request, pk=None):
        order = self.get_object()
        try:
            return self._done(order, relaunch_delivery(order))
        except ActionError as e:
            return fail(str(e))


class PaymentViewSet(mixins.ListModelMixin, Base):
    serializer_class = s.PaymentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["reference", "order__order_number", "payer_phone_number"]

    def get_queryset(self):
        qs = Payment.objects.select_related("order").order_by("-created_at")
        if st := self.request.query_params.get("status"):
            qs = qs.filter(status=st)
        return qs


# ── Catalogue ──
class ProductViewSet(viewsets.ModelViewSet, Base):
    serializer_class = s.ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "sku", "category__name"]

    def get_queryset(self):
        qs = Product.objects.select_related("category").prefetch_related("images", "variants").annotate(
            sold=Coalesce(Sum("orderitem__quantity", filter=~Q(orderitem__order__status__in=("pending", "cancelled"))), 0)
        ).order_by("-created_at")
        p = self.request.query_params
        if c := p.get("category"):
            qs = qs.filter(category_id=c)
        if p.get("state") == "inactive":
            qs = qs.filter(is_active=False)
        elif p.get("state") == "low":
            qs = qs.filter(made_to_order=False, stock_quantity__lte=3)
        elif p.get("state") == "active":
            qs = qs.filter(is_active=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        try:
            product.delete()
            return Response({"message": "Article supprimé."})
        except ProtectedError:
            product.is_active = False
            product.save(update_fields=["is_active", "updated_at"])
            return Response({"message": "Cet article a déjà été commandé : il a été masqué de la boutique au lieu d'être supprimé.", "hidden": True})

    @action(detail=True, methods=["post"], url_path="images")
    def add_images(self, request, pk=None):
        product = self.get_object()
        files = request.FILES.getlist("image") or request.FILES.getlist("images")
        if not files:
            return fail("Aucune photo reçue.")
        has_primary = product.images.filter(is_primary=True).exists()
        start = product.images.count()
        for i, f in enumerate(files[:10]):
            if f.size > 15 * 1024 * 1024:
                return fail("Photo trop lourde (15 Mo maximum).")
            ProductImage.objects.create(product=product, image=f, is_primary=not has_primary and i == 0, position=start + i)
        product = self.get_queryset().get(pk=product.pk)
        return Response(self.get_serializer(product).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"images/(?P<image_id>[0-9a-f-]+)")
    def image(self, request, pk=None, image_id=None):
        product = self.get_object()
        img = get_object_or_404(ProductImage, pk=image_id, product=product)
        if request.method == "DELETE":
            was_primary = img.is_primary
            img.image.delete(save=False)
            img.delete()
            if was_primary and (first := ProductImage.objects.filter(product=product).first()):
                first.is_primary = True
                first.save(update_fields=["is_primary"])
        elif request.data.get("is_primary"):
            ProductImage.objects.filter(product=product).update(is_primary=False)
            img.is_primary = True
            img.save(update_fields=["is_primary"])
        product = self.get_queryset().get(pk=product.pk)
        return Response(self.get_serializer(product).data)


class CategoryViewSet(viewsets.ModelViewSet, Base):
    serializer_class = s.CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.select_related("parent").annotate(products_count=Count("products")).order_by("parent__position", "position", "name")

    def destroy(self, request, *args, **kwargs):
        cat = self.get_object()
        if cat.products.exists():
            return fail("Cette catégorie contient des articles : déplacez-les ou masquez la catégorie.")
        cat.delete()
        return Response({"message": "Catégorie supprimée."})


class ReviewViewSet(mixins.ListModelMixin, mixins.DestroyModelMixin, Base):
    serializer_class = s.ReviewSerializer
    queryset = Review.objects.select_related("product", "user").order_by("-created_at")


# ── Clientes ──
class ClientViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, Base):
    filter_backends = [filters.SearchFilter]
    search_fields = ["email", "first_name", "last_name", "phone_number"]

    def get_queryset(self):
        paid = ~Q(orders__status__in=("pending", "cancelled", "refunded"))
        qs = User.objects.annotate(
            orders_count=Count("orders", distinct=True),
            spent=Coalesce(Sum("orders__amount_paid", filter=paid), Value(0, output_field=DecimalField())),
        ).order_by("-date_joined")
        if self.request.query_params.get("team") == "1":
            qs = qs.filter(is_staff=True)
        return qs

    def get_serializer_class(self):
        return s.ClientDetailSerializer if self.action == "retrieve" else s.ClientSerializer

    @action(detail=True, methods=["post"])
    def access(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return fail("Vous ne pouvez pas modifier votre propre accès.")
        what = request.data.get("what")
        if what == "block":
            user.is_active = False
        elif what == "unblock":
            user.is_active = True
        elif what == "make_staff":
            user.is_staff = True
        elif what == "remove_staff":
            if user.is_superuser:
                return fail("Ce compte principal ne peut pas perdre son accès.")
            user.is_staff = False
        else:
            return fail("Action inconnue.")
        user.save(update_fields=["is_active", "is_staff"])
        return Response(s.ClientDetailSerializer(self.get_queryset().get(pk=user.pk), context={"request": request}).data)


# ── Livreurs ──
class CourierViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, Base):
    serializer_class = s.CourierSerializer

    def get_queryset(self):
        qs = CourierProfile.objects.select_related("user").annotate(
            deliveries_done=Count("deliveries", filter=Q(deliveries__status="delivered"))
        ).order_by("status", "-created_at")
        if st := self.request.query_params.get("status"):
            qs = qs.filter(status=st)
        return qs

    @action(detail=True, methods=["post"])
    def decision(self, request, pk=None):
        c = self.get_object()
        what = request.data.get("what")
        if what == "approve":
            approve_courier(c)
            msg = "Livreur validé et prévenu par email."
        elif what in ("suspend", "reject"):
            c.status = "suspended" if what == "suspend" else "rejected"
            c.is_available = False
            c.save(update_fields=["status", "is_available"])
            msg = "Livreur suspendu." if what == "suspend" else "Candidature refusée."
        else:
            return fail("Action inconnue.")
        return Response({"message": msg, "courier": self.get_serializer(self.get_queryset().get(pk=c.pk)).data})


class ZoneViewSet(viewsets.ModelViewSet, Base):
    serializer_class = s.ZoneSerializer
    queryset = DeliveryZone.objects.all()
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        zone = self.get_object()
        if zone.orders.exists():
            zone.is_active = False
            zone.save(update_fields=["is_active"])
            return Response({"message": "Zone déjà utilisée par des commandes : elle a été désactivée."})
        zone.delete()
        return Response({"message": "Zone supprimée."})


class PromotionViewSet(viewsets.ModelViewSet, Base):
    serializer_class = s.PromotionSerializer
    queryset = Promotion.objects.select_related("category").order_by("-starts_at")

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        promo = self.get_object()
        try:
            n = send_promotion(promo)
        except ActionError as e:
            return fail(str(e))
        return Response({"message": f"Email envoyé à {n} cliente(s).", "promotion": self.get_serializer(promo).data})


@api_view(["GET", "PATCH"])
@permission_classes([IsAdminUser])
def shop_settings(request):
    obj, _ = ShopSettings.objects.get_or_create(pk=1)
    if request.method == "PATCH":
        ser = s.SettingsSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
    return Response(s.SettingsSerializer(obj).data)


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def email_check(request):
    """État de l'envoi d'emails + email de test envoyé tout de suite à la gérante."""
    configured = "anymail" in dj_settings.EMAIL_BACKEND
    info = {"configured": configured, "sender": dj_settings.DEFAULT_FROM_EMAIL, "shop_email": dj_settings.SHOP_NOTIFICATION_EMAIL}
    if request.method == "GET":
        return Response(info)
    if not configured:
        return fail("Brevo n'est pas encore relié : ajoutez BREVO_API_KEY sur Render.")
    from apps.core.emails import build_email

    try:
        msg = build_email("test_email", "Test des emails GlowLuxe", request.user.email, {"user": request.user})
        msg.send(fail_silently=False)
    except Exception as e:  # message clair pour la gérante (expéditeur non validé, clé invalide...)
        text = str(e)
        if "sender" in text.lower() or "expéditeur" in text.lower():
            text = f"Brevo refuse l'expéditeur {dj_settings.DEFAULT_FROM_EMAIL} : validez cette adresse dans Brevo (Senders)."
        elif "key" in text.lower() or "unauthorized" in text.lower() or "401" in text:
            text = "Clé Brevo refusée : vérifiez BREVO_API_KEY sur Render."
        return fail(f"Échec de l'envoi. {text}"[:400])
    return Response({**info, "message": f"Email de test envoyé à {request.user.email}. Pensez à regarder dans les spams."})
