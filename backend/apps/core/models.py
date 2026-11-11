from decimal import ROUND_UP, Decimal

from django.core.cache import cache
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class ShopSettings(models.Model):
    """Réglages modifiables dans l'admin (une seule ligne)."""

    shop_name = models.CharField("Nom", max_length=100, default="GlowLuxe By Sofa")
    contact_phone = models.CharField("Téléphone", max_length=30, default="+221 77 822 84 60")
    contact_email = models.EmailField("Email de contact", default="contact@glowluxe.com")
    address = models.CharField("Adresse", max_length=255, default="Tivaouane, Quartier Seydi Diamil SY, Sénégal")
    opening_hours = models.CharField(
        "Horaires", max_length=255, default="Lun - Ven : 9h00 - 22h00 · Sam : 10h00 - 19h00 · Dim : fermé"
    )
    whatsapp_number = models.CharField("WhatsApp (format 221…)", max_length=20, default="221778228460")
    pickup_latitude = models.DecimalField("Latitude boutique", max_digits=9, decimal_places=6, default=Decimal("14.950000"))
    pickup_longitude = models.DecimalField("Longitude boutique", max_digits=9, decimal_places=6, default=Decimal("-16.816700"))

    deposit_threshold = models.PositiveIntegerField(
        "Acompte possible à partir de (FCFA)", default=25000,
        help_text="En dessous, le paiement complet est demandé.",
    )
    deposit_percent = models.PositiveIntegerField(
        "Acompte (%)", default=30, validators=[MinValueValidator(10), MaxValueValidator(90)]
    )
    deposit_percent_made_to_order = models.PositiveIntegerField(
        "Acompte articles sur commande / crochet (%)", default=50,
        validators=[MinValueValidator(10), MaxValueValidator(100)],
    )
    minimum_deposit = models.PositiveIntegerField("Acompte minimum (FCFA)", default=5000)
    allow_delivery_fee_on_arrival = models.BooleanField("Livraison payable au livreur", default=True)
    courier_offer_minutes = models.PositiveIntegerField("Minutes pour qu'un livreur accepte", default=5)

    class Meta:
        verbose_name = "Réglages de la boutique"
        verbose_name_plural = "Réglages de la boutique"

    def __str__(self):
        return "Réglages de la boutique"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete("shop_settings")

    @classmethod
    def load(cls):
        obj = cache.get("shop_settings")
        if obj is None:
            obj, _ = cls.objects.get_or_create(pk=1)
            cache.set("shop_settings", obj, 300)
        return obj

    def deposit_for(self, subtotal, has_made_to_order=False):
        """Montant d'acompte proposé, ou None si le paiement complet est exigé."""
        subtotal = Decimal(subtotal)
        if has_made_to_order:
            percent = self.deposit_percent_made_to_order
        elif subtotal >= self.deposit_threshold:
            percent = self.deposit_percent
        else:
            return None
        if percent >= 100:
            return None
        amount = (subtotal * Decimal(percent) / 100).quantize(Decimal("1"), rounding=ROUND_UP)
        amount = (amount / 100).quantize(Decimal("1"), rounding=ROUND_UP) * 100  # arrondi à 100 F
        amount = max(amount, Decimal(self.minimum_deposit))
        return None if amount >= subtotal else amount


class PromotionQuerySet(models.QuerySet):
    def live(self):
        now = timezone.now()
        return self.filter(active=True, starts_at__lte=now).filter(
            models.Q(ends_at__isnull=True) | models.Q(ends_at__gte=now)
        )


class Promotion(models.Model):
    """Promo affichée aux clients connectés + envoyée par email aux inscrits."""

    title = models.CharField("Titre", max_length=150)
    message = models.TextField("Message")
    code = models.CharField("Code promo", max_length=40, blank=True)
    image = models.ImageField("Image", upload_to="promotions/", blank=True)
    category = models.ForeignKey(
        "catalog.Category", null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Catégorie liée"
    )
    starts_at = models.DateTimeField("Début", default=timezone.now)
    ends_at = models.DateTimeField("Fin", null=True, blank=True)
    active = models.BooleanField(default=True)
    emailed_at = models.DateTimeField("Email envoyé le", null=True, blank=True, editable=False)
    emailed_count = models.PositiveIntegerField("Destinataires", default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = PromotionQuerySet.as_manager()

    class Meta:
        ordering = ["-starts_at"]
        verbose_name = "Promotion"

    def __str__(self):
        return self.title


class DataImport(models.Model):
    """Trace des imports déjà faits : jamais rejoués, vos modifications sont préservées."""

    name = models.CharField(max_length=100, unique=True)
    done_at = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True)

    def __str__(self):
        return self.name
