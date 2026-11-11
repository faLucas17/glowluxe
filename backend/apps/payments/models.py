import secrets
import uuid

from django.db import models

PAYMENT_METHOD_CHOICES = [
    ("wave", "Wave"),
    ("orange_money", "Orange Money"),
    ("card", "Carte bancaire"),
    ("manual", "Paiement manuel (WhatsApp)"),
    ("cash", "Espèces à la livraison"),
    ("test", "Simulateur (test)"),
]

PAYMENT_STATUS_CHOICES = [
    ("pending", "En attente"),
    ("success", "Réussi"),
    ("failed", "Échoué"),
    ("refunded", "Remboursé"),
]

PURPOSES = [("full", "Paiement complet"), ("deposit", "Acompte"), ("balance", "Solde")]


def new_reference():
    return "GLP-" + secrets.token_hex(8).upper()


class Payment(models.Model):
    """Chaque tentative de paiement. `reference` est notre identifiant unique (envoyé au fournisseur)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="payments")
    reference = models.CharField(max_length=40, unique=True, null=True, blank=True)
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    gateway = models.CharField("Passerelle", max_length=20, blank=True, help_text="wave, paytech, manual…")
    purpose = models.CharField(max_length=10, choices=PURPOSES, default="full")
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending", db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="XOF")
    provider_reference = models.CharField(max_length=150, blank=True)
    checkout_url = models.URLField(max_length=500, blank=True)
    payer_phone_number = models.CharField(max_length=20, blank=True, help_text="Pour Wave / Orange Money")
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Paiement"

    def __str__(self):
        return f"{self.reference or self.pk} - {self.get_method_display()} - {self.amount} {self.currency} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = new_reference()
        super().save(*args, **kwargs)

    def confirm(self, provider_reference="", raw=None):
        from apps.orders.services import confirm_payment

        return confirm_payment(self, provider_reference, raw)

    def fail(self):
        if self.status != "success":
            self.status = "failed"
            self.save(update_fields=["status", "updated_at"])
