from django.db.models import Prefetch, Q
from django_filters import rest_framework as df
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Category, Product, ProductImage, Review
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer, ReviewSerializer


class ProductFilter(df.FilterSet):
    category = df.CharFilter(method="filter_category")
    promo = df.BooleanFilter(method="filter_promo")
    min_price = df.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = df.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model = Product
        fields = ["gender", "is_featured", "is_handmade", "made_to_order"]

    def filter_category(self, qs, name, value):
        """Accepte le slug ou l'id ; inclut les sous-catégories (Crochet > Sacs…)."""
        cat = Category.objects.filter(Q(slug=value) | Q(pk=value) if _is_uuid(value) else Q(slug=value)).first()
        return qs.filter(category_id__in=cat.descendant_ids()) if cat else qs.none()

    def filter_promo(self, qs, name, value):
        return qs.filter(compare_at_price__isnull=False) if value else qs


def _is_uuid(value):
    import uuid

    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["gender", "parent"]
    pagination_class = None
    lookup_field = "slug"


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    /api/products/?search=&category=&gender=&promo=true&ordering=price
    /api/products/{slug}/            -> détail complet (galerie HD, variantes, avis)
    /api/products/{slug}/reviews/    -> POST pour laisser un avis
    """

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    filter_backends = [df.DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "description", "sku", "material", "category__name"]
    ordering_fields = ["price", "created_at", "name"]

    def get_queryset(self):
        qs = (
            Product.objects.filter(is_active=True, category__is_active=True)
            .select_related("category")
            .prefetch_related(Prefetch("images", queryset=ProductImage.objects.order_by("-is_primary", "position")))
        )
        if self.action != "list":
            qs = qs.prefetch_related("variants", "reviews__user")
        return qs

    def get_serializer_class(self):
        return ProductListSerializer if self.action == "list" else ProductDetailSerializer

    @action(detail=True, methods=["get"])
    def related(self, request, slug=None):
        product = self.get_object()
        qs = self.get_queryset().filter(category=product.category).exclude(pk=product.pk)[:8]
        return Response(ProductListSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def reviews(self, request, slug=None):
        product = self.get_object()
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Review.objects.update_or_create(
            product=product, user=request.user, defaults=serializer.validated_data
        )
        return Response({"detail": "Merci pour votre avis !"}, status=201)
