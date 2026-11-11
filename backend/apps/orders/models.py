import secrets
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

ORDER_STATUS_CHOICES = [
    ("pending", "En attente de paiement"),
    ("deposit_paid", "Acompte reçu"),
    ("paid", "Payée"),
    ("processing", "En préparation"),
    ("ready", "Prête - recherche d'un livreur"),
    ("shipped", "Expédiée"),
    ("in_transit", "En transit"),
    ("out_for_delivery", "En cours de livraison"),
    ("delivered", "Livrée"),
    ("cancelled", "Annulée"),
    ("refunded", "Remboursée"),
]
CONFIRMED_STATUSES = ("deposit_paid", "paid", "processing", "ready", "shipped", "in_transit", "out_for_delivery", "delivered")


def generate_order_number():
    # secrets : numéro impossible à deviner
    return "GL-" + "".join(secrets.choice("0123456789") for _ in range(8))


class Order(models.Model):
    PAYMENT_PLANS = [("full", "Paiement complet"), ("deposit", "Acompte")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, default=generate_order_number)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    shipping_address = models.ForeignKey("accounts.Address", on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default="pending", db_index=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    delivery_zone = models.ForeignKey(
        "shipping.DeliveryZone", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    payment_plan = models.CharField(max_length=10, choices=PAYMENT_PLANS, default="full")
    deposit_amount = models.DecimalField("Acompte demandé", max_digits=10, decimal_places=2, default=0)
    delivery_fee_on_arrival = models.BooleanField("Livraison payée au livreur", default=False)
    amount_paid = models.DecimalField("Déjà payé", max_digits=10, decimal_places=2, default=0)
    address_snapshot = models.JSONField("Adresse au moment de la commande", default=dict, blank=True)

    stock_committed = models.BooleanField(default=False, editable=False)
    confirmation_sent = models.BooleanField(default=False, editable=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Commande"

    def __str__(self):
        return self.order_number

    @property
    def amount_due(self):
        return max(self.total - self.amount_paid, Decimal("0"))

    @property
    def first_payment_amount(self):
        base = self.deposit_amount if self.payment_plan == "deposit" else self.subtotal
        return base + (0 if self.delivery_fee_on_arrival else self.shipping_cost)

    @property
    def is_confirmed(self):
        return self.status in CONFIRMED_STATUSES

    @property
    def can_pay_online(self):
        return self.status not in ("cancelled", "refunded", "delivered") and self.amount_due > 0


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT)
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT, null=True, blank=True)
    product_name = models.CharField(max_length=200, help_text="Copie du nom au moment de l'achat")
    variant_label = models.CharField(max_length=100, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity
