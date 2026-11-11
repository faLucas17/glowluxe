from rest_framework import serializers

from apps.catalog.serializers import ProductListSerializer

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source="product", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_detail", "variant", "variant_label", "product_name", "unit_price", "quantity", "subtotal"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    amount_due = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    first_payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    can_pay_online = serializers.BooleanField(read_only=True)
    zone_name = serializers.CharField(source="delivery_zone.name", read_only=True, default=None)
    tracking_number = serializers.CharField(source="shipment.tracking_number", read_only=True, default=None)
    delivery = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "status_display", "items", "subtotal", "shipping_cost", "total",
            "payment_plan", "deposit_amount", "delivery_fee_on_arrival", "amount_paid", "amount_due",
            "first_payment_amount", "can_pay_online", "zone_name", "address_snapshot", "notes",
            "tracking_number", "delivery", "payments", "created_at",
        ]

    def get_delivery(self, obj):
        d = getattr(obj, "delivery", None)
        if d is None:
            return None
        courier = None
        if d.courier and d.status not in ("offered", "searching"):
            courier = {"name": d.courier.display_name, "phone": d.courier.phone, "vehicle": d.courier.get_vehicle_display()}
        return {"status": d.status, "status_display": d.get_status_display(), "courier": courier}

    def get_payments(self, obj):
        return [
            {"reference": p.reference, "method": p.get_method_display(), "purpose": p.get_purpose_display(),
             "amount": p.amount, "status": p.status, "created_at": p.created_at}
            for p in obj.payments.all() if p.status == "success"
        ]


class QuoteSerializer(serializers.Serializer):
    zone_id = serializers.IntegerField(required=False, allow_null=True)
    payment_plan = serializers.ChoiceField(choices=["full", "deposit"], default="full")
    fee_on_arrival = serializers.BooleanField(default=False)


class CreateOrderSerializer(QuoteSerializer):
    shipping_address_id = serializers.UUIDField()
    zone_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=["wave", "orange_money", "card"])
    payer_phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)


class PaySerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=["wave", "orange_money", "card"])
    payer_phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
