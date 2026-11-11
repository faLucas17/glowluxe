from rest_framework import serializers

from apps.accounts.serializers import clean_phone

from .models import CourierProfile, Delivery, DeliveryZone, Shipment, TrackingEvent


class TrackingEventSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = TrackingEvent
        fields = ["id", "status", "status_display", "location", "description", "timestamp"]


class ShipmentSerializer(serializers.ModelSerializer):
    events = TrackingEventSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "id", "order_number", "tracking_number", "carrier", "status", "status_display",
            "current_location", "estimated_delivery", "events", "created_at", "updated_at",
        ]


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = ["id", "name", "fee", "estimated_time"]


class CourierApplicationSerializer(serializers.ModelSerializer):
    accept_terms = serializers.BooleanField(write_only=True)

    class Meta:
        model = CourierProfile
        fields = ["phone", "vehicle", "zones", "motivation", "accept_terms", "status"]
        read_only_fields = ["status"]

    def validate_phone(self, value):
        value = clean_phone(value)
        if not value:
            raise serializers.ValidationError("Téléphone obligatoire.")
        return value

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("Vous devez accepter les conditions.")
        return value

    def create(self, validated):
        validated.pop("accept_terms", None)
        return super().create(validated)


class CourierDeliverySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer = serializers.SerializerMethodField()
    zone = serializers.CharField(source="order.delivery_zone.name", read_only=True, default="")
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Delivery
        fields = [
            "id", "order_number", "status", "status_display", "cash_to_collect", "cash_collected",
            "zone", "customer", "items_count", "offered_at", "accepted_at", "delivered_at",
        ]

    def get_customer(self, obj):
        if obj.status == "offered":
            return None  # coordonnées révélées seulement après acceptation
        a = obj.order.address_snapshot or {}
        return {"name": a.get("full_name"), "phone": a.get("phone"), "address": a.get("line"),
                "lat": a.get("lat"), "lng": a.get("lng"), "notes": obj.order.notes}

    def get_items_count(self, obj):
        return sum(i.quantity for i in obj.order.items.all())
