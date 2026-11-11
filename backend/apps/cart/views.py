from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.catalog.models import Product, ProductVariant

from .models import Cart, CartItem
from .serializers import CartSerializer

MAX_QTY = 20


def _qty(raw, default=1):
    try:
        return int(raw if raw is not None else default)
    except (TypeError, ValueError):
        return None


class CartViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartSerializer

    def get_cart(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return cart

    def respond(self, cart, code=status.HTTP_200_OK):
        cart = Cart.objects.prefetch_related("items__product__images", "items__product__category", "items__variant").get(pk=cart.pk)
        return Response(self.get_serializer(cart).data, status=code)

    def list(self, request):
        return self.respond(self.get_cart())

    @action(detail=False, methods=["post"])
    def add_item(self, request):
        cart = self.get_cart()
        product = Product.objects.filter(id=request.data.get("product"), is_active=True).first()
        if product is None:
            return Response({"detail": "Article introuvable."}, status=404)
        variant = None
        if request.data.get("variant"):
            variant = ProductVariant.objects.filter(id=request.data["variant"], product=product).first()
            if variant is None:
                return Response({"detail": "Taille / couleur invalide."}, status=400)
        elif product.variants.exists():
            return Response({"detail": "Choisissez une taille / couleur."}, status=400)

        quantity = _qty(request.data.get("quantity"))
        if quantity is None or quantity < 1:
            return Response({"detail": "Quantité invalide."}, status=400)

        item = CartItem.objects.filter(cart=cart, product=product, variant=variant).first()
        new_qty = min((item.quantity if item else 0) + quantity, MAX_QTY)
        if new_qty > product.available_quantity(variant):
            return Response({"detail": f"Stock insuffisant (reste {product.available_quantity(variant)})."}, status=400)
        if item:
            item.quantity = new_qty
            item.save(update_fields=["quantity"])
        else:
            CartItem.objects.create(cart=cart, product=product, variant=variant, quantity=new_qty)
        return self.respond(cart, status.HTTP_201_CREATED)

    @action(detail=False, methods=["patch"], url_path="update-item/(?P<item_id>[^/.]+)")
    def update_item(self, request, item_id=None):
        cart = self.get_cart()
        item = CartItem.objects.filter(id=item_id, cart=cart).select_related("product", "variant").first()
        if item is None:
            return Response({"detail": "Article introuvable."}, status=404)
        quantity = _qty(request.data.get("quantity"), item.quantity)
        if quantity is None:
            return Response({"detail": "Quantité invalide."}, status=400)
        if quantity <= 0:
            item.delete()
        else:
            quantity = min(quantity, MAX_QTY)
            if quantity > item.product.available_quantity(item.variant):
                return Response({"detail": "Stock insuffisant."}, status=400)
            item.quantity = quantity
            item.save(update_fields=["quantity"])
        return self.respond(cart)

    @action(detail=False, methods=["delete"], url_path="remove-item/(?P<item_id>[^/.]+)")
    def remove_item(self, request, item_id=None):
        cart = self.get_cart()
        CartItem.objects.filter(id=item_id, cart=cart).delete()
        return self.respond(cart)

    @action(detail=False, methods=["post"])
    def merge(self, request):
        """Le panier fait avant connexion (stocké sur le téléphone) est ajouté au compte."""
        cart = self.get_cart()
        for line in (request.data.get("items") or [])[:50]:
            product = Product.objects.filter(id=line.get("product"), is_active=True).first()
            if not product:
                continue
            variant = ProductVariant.objects.filter(id=line.get("variant"), product=product).first() if line.get("variant") else None
            qty = _qty(line.get("quantity")) or 1
            item, _ = CartItem.objects.get_or_create(cart=cart, product=product, variant=variant, defaults={"quantity": 0})
            item.quantity = max(1, min(item.quantity + qty, MAX_QTY, product.available_quantity(variant)))
            item.save(update_fields=["quantity"])
        return self.respond(cart)
