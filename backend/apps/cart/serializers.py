from rest_framework import serializers

from apps.catalog.serializers import ProductListSerializer

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source="product", read_only=True)
    variant_label = serializers.SerializerMethodField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_detail", "variant", "variant_label", "quantity", "unit_price", "subtotal"]

    def get_variant_label(self, obj):
        if not obj.variant:
            return ""
        return " · ".join(p for p in [obj.variant.size, obj.variant.color] if p)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total", "count", "updated_at"]

    def get_count(self, obj):
        return sum(i.quantity for i in obj.items.all())
