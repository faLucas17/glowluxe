import secrets

from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import serializers

from apps.catalog.models import Category, Product, ProductImage, ProductVariant, Review
from apps.catalog.serializers import image_url
from apps.core.models import Promotion, ShopSettings
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.shipping.models import CourierProfile, DeliveryZone

from .services import NEXT_STATUSES

User = get_user_model()


def money(v):
    return int(v or 0)


# ── Catalogue ──
class ImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "url", "is_primary", "position"]

    def get_url(self, obj):
        return image_url(obj.image, self.context.get("request"), 600)


class VariantSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = ProductVariant
        fields = ["id", "size", "color", "color_hex", "stock_quantity", "extra_price"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = ImageSerializer(many=True, read_only=True)
    variants = VariantSerializer(many=True, required=False)
    thumbnail = serializers.SerializerMethodField()
    sku = serializers.CharField(required=False, allow_blank=True)
    sold = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "category_name", "description", "gender", "price", "compare_at_price",
            "sku", "stock_quantity", "material", "is_handmade", "made_to_order", "production_days", "is_featured",
            "is_active", "images", "variants", "thumbnail", "sold", "created_at",
        ]
        read_only_fields = ["slug", "created_at"]

    def get_thumbnail(self, obj):
        imgs = list(obj.images.all())
        return image_url(imgs[0].image, self.context.get("request"), 200) if imgs else None

    def validate(self, data):
        price, old = data.get("price"), data.get("compare_at_price")
        if price is not None and price <= 0:
            raise serializers.ValidationError({"price": "Le prix doit être supérieur à 0."})
        if old is not None and price is not None and old and old <= price:
            raise serializers.ValidationError({"compare_at_price": "L'ancien prix doit être plus élevé que le prix actuel."})
        return data

    def _save_variants(self, product, variants):
        if variants is None:
            return
        keep = []
        for v in variants:
            vid = v.pop("id", None)
            obj = product.variants.filter(pk=vid).first() if vid else None
            if obj:
                for k, val in v.items():
                    setattr(obj, k, val)
                obj.save()
            else:
                obj = ProductVariant.objects.create(product=product, **v)
            keep.append(obj.pk)
        product.variants.exclude(pk__in=keep).delete()

    def create(self, data):
        variants = data.pop("variants", None)
        if not data.get("sku"):
            data["sku"] = "GL-" + secrets.token_hex(4).upper()
        product = Product.objects.create(**data)
        self._save_variants(product, variants)
        return product

    def update(self, product, data):
        variants = data.pop("variants", None)
        if "sku" in data and not data["sku"]:
            data.pop("sku")
        for k, v in data.items():
            setattr(product, k, v)
        product.save()
        self._save_variants(product, variants)
        return product


class CategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    products_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "parent_name", "gender", "icon", "image", "image_url", "position", "is_active", "products_count"]
        read_only_fields = ["slug"]
        extra_kwargs = {"image": {"write_only": True, "required": False}}

    def get_image_url(self, obj):
        return image_url(obj.image, self.context.get("request"), 400)

    def validate_parent(self, parent):
        if parent and self.instance and (parent.pk == self.instance.pk or parent.pk in self.instance.descendant_ids()):
            raise serializers.ValidationError("Une catégorie ne peut pas être rangée dans elle-même.")
        return parent


class ReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    client = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "product", "product_name", "client", "rating", "comment", "created_at"]

    def get_client(self, obj):
        return obj.user.get_full_name() or obj.user.email


# ── Commandes ──
class PaymentSerializer(serializers.ModelSerializer):
    method_label = serializers.CharField(source="get_method_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    purpose_label = serializers.CharField(source="get_purpose_display", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_id = serializers.UUIDField(source="order.id", read_only=True)
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ["id", "reference", "order_id", "order_number", "method", "method_label", "purpose_label", "status",
                  "status_label", "amount", "payer_phone_number", "created_at"]

    def get_amount(self, obj):
        return money(obj.amount)


class OrderListSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    total = serializers.SerializerMethodField()
    amount_paid = serializers.SerializerMethodField()
    amount_due = serializers.SerializerMethodField()
    items_count = serializers.IntegerField(read_only=True, default=0)
    zone = serializers.CharField(source="delivery_zone.name", read_only=True, default="")

    class Meta:
        model = Order
        fields = ["id", "order_number", "client", "status", "status_label", "total", "amount_paid", "amount_due",
                  "payment_plan", "items_count", "zone", "created_at"]

    def get_client(self, o):
        snap = o.address_snapshot or {}
        return snap.get("full_name") or o.user.get_full_name() or o.user.email

    def get_total(self, o):
        return money(o.total)

    def get_amount_paid(self, o):
        return money(o.amount_paid)

    def get_amount_due(self, o):
        return money(o.amount_due)


class OrderDetailSerializer(OrderListSerializer):
    items = serializers.SerializerMethodField()
    payments = PaymentSerializer(many=True, read_only=True)
    customer = serializers.SerializerMethodField()
    delivery = serializers.SerializerMethodField()
    next_statuses = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    shipping_cost = serializers.SerializerMethodField()
    deposit_amount = serializers.SerializerMethodField()

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + [
            "items", "payments", "customer", "address_snapshot", "delivery", "next_statuses", "subtotal",
            "shipping_cost", "deposit_amount", "delivery_fee_on_arrival", "notes",
        ]

    def get_items(self, o):
        req = self.context.get("request")
        out = []
        for it in o.items.select_related("product").prefetch_related("product__images"):
            imgs = list(it.product.images.all())
            out.append({
                "id": str(it.id), "name": it.product_name, "variant": it.variant_label, "quantity": it.quantity,
                "unit_price": money(it.unit_price), "total": money(it.subtotal),
                "image": image_url(imgs[0].image, req, 200) if imgs else None,
                "made_to_order": it.product.made_to_order,
            })
        return out

    def get_customer(self, o):
        u = o.user
        return {"id": str(u.id), "name": u.get_full_name(), "email": u.email, "phone": u.phone_number}

    def get_delivery(self, o):
        d = getattr(o, "delivery", None)
        if not d:
            return None
        c = d.courier
        return {
            "status": d.status, "status_label": d.get_status_display(),
            "courier": {"name": c.display_name, "phone": c.phone, "vehicle": c.get_vehicle_display()} if c else None,
            "cash_to_collect": money(d.cash_to_collect),
            "cash_collected": money(d.cash_collected) if d.cash_collected is not None else None,
            "note": d.courier_note,
        }

    def get_next_statuses(self, o):
        labels = dict(Order._meta.get_field("status").choices)
        return [{"value": s, "label": labels[s]} for s in NEXT_STATUSES.get(o.status, [])]

    def get_subtotal(self, o):
        return money(o.subtotal)

    def get_shipping_cost(self, o):
        return money(o.shipping_cost)

    def get_deposit_amount(self, o):
        return money(o.deposit_amount)


# ── Clientes ──
class ClientSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    orders_count = serializers.IntegerField(read_only=True, default=0)
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "email", "phone_number", "email_verified", "newsletter", "is_active", "is_staff",
                  "date_joined", "orders_count", "total_spent"]

    def get_name(self, u):
        return u.get_full_name() or u.username

    def get_total_spent(self, u):
        return money(getattr(u, "spent", 0))


class ClientDetailSerializer(ClientSerializer):
    addresses = serializers.SerializerMethodField()
    orders = serializers.SerializerMethodField()

    class Meta(ClientSerializer.Meta):
        fields = ClientSerializer.Meta.fields + ["addresses", "orders"]

    def get_addresses(self, u):
        return [{"id": str(a.id), "label": a.one_line, "phone": a.phone_number} for a in u.addresses.all()]

    def get_orders(self, u):
        qs = u.orders.annotate(items_count=Count("items"))[:20]
        return OrderListSerializer(qs, many=True).data


# ── Livreurs, zones, promos, réglages ──
class CourierSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    vehicle_label = serializers.CharField(source="get_vehicle_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    deliveries_done = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = CourierProfile
        fields = ["id", "name", "email", "phone", "vehicle", "vehicle_label", "zones", "motivation", "status",
                  "status_label", "is_available", "last_seen", "created_at", "approved_at", "deliveries_done"]
        read_only_fields = fields


class ZoneSerializer(serializers.ModelSerializer):
    fee = serializers.DecimalField(max_digits=8, decimal_places=0, coerce_to_string=False)

    class Meta:
        model = DeliveryZone
        fields = ["id", "name", "fee", "estimated_time", "position", "is_active"]


class PromotionSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)

    class Meta:
        model = Promotion
        fields = ["id", "title", "message", "code", "image", "image_url", "category", "category_name", "starts_at",
                  "ends_at", "active", "emailed_at", "emailed_count", "created_at"]
        read_only_fields = ["emailed_at", "emailed_count", "created_at"]
        extra_kwargs = {"image": {"write_only": True, "required": False}}

    def get_image_url(self, obj):
        return image_url(obj.image, self.context.get("request"), 600)


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopSettings
        exclude = ["id"]
