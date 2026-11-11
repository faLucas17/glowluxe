import math
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


CARRIER_CHOICES = [
    ("dhl", "DHL"),
    ("fedex", "FedEx"),
    ("ups", "UPS"),
    ("local", "Coursier local"),
]

SHIPMENT_STATUS_CHOICES = [
    ("label_created", "Étiquette créée"),
    ("picked_up", "Colis récupéré"),
    ("in_transit", "En transit"),
    ("customs", "Dédouanement"),
    ("out_for_delivery", "En cours de livraison"),
    ("delivered", "Livré"),
    ("failed_attempt", "Tentative échouée"),
    ("returned", "Retourné"),
]


class Shipment(models.Model):
    """Un colis lié à une commande, livrable n'importe où dans le monde."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="shipment")
    tracking_number = models.CharField(max_length=50, unique=True)
    carrier = models.CharField(max_length=20, choices=CARRIER_CHOICES, default="local")
    status = models.CharField(max_length=20, choices=SHIPMENT_STATUS_CHOICES, default="label_created")
    estimated_delivery = models.DateField(null=True, blank=True)
    current_location = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.tracking_number} ({self.get_status_display()})"


class TrackingEvent(models.Model):
    """Historique du colis, affiché comme une timeline dans l'app (façon DHL/UPS)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=20, choices=SHIPMENT_STATUS_CHOICES)
    location = models.CharField(max_length=150, blank=True)
    description = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]


# ─────────────────────────────────────────────
# Livraison locale façon Yango : zones, livreurs, courses
# ─────────────────────────────────────────────


class DeliveryZone(models.Model):
    name = models.CharField("Zone", max_length=100)
    fee = models.DecimalField("Prix de livraison (FCFA)", max_digits=8, decimal_places=0)
    estimated_time = models.CharField("Délai indicatif", max_length=60, default="24 à 48 h")
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["position", "name"]
        verbose_name = "Zone de livraison"
        verbose_name_plural = "Zones de livraison"

    def __str__(self):
        return f"{self.name} ({int(self.fee)} F)"


class CourierProfile(models.Model):
    VEHICLES = [("moto", "Moto / Jakarta"), ("voiture", "Voiture"), ("velo", "Vélo"), ("pied", "À pied")]
    STATUS = [("pending", "Candidature en attente"), ("approved", "Validé"), ("suspended", "Suspendu"), ("rejected", "Refusé")]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courier_profile")
    phone = models.CharField("Téléphone", max_length=20)
    vehicle = models.CharField("Transport", max_length=10, choices=VEHICLES, default="moto")
    zones = models.CharField("Zones couvertes", max_length=255)
    motivation = models.TextField("Présentation", blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default="pending")
    is_available = models.BooleanField("Disponible", default=False)
    last_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Livreur"
        verbose_name_plural = "Livreurs"

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        return self.user.get_full_name() or self.user.username


class Delivery(models.Model):
    STATUS = [
        ("searching", "Recherche d'un livreur"),
        ("offered", "Proposée à un livreur"),
        ("accepted", "Livreur en route vers la boutique"),
        ("picked_up", "Colis récupéré"),
        ("on_the_way", "En route vers vous"),
        ("delivered", "Livrée"),
        ("failed", "Échec de livraison"),
        ("cancelled", "Annulée"),
    ]
    ACTIVE = ("offered", "accepted", "picked_up", "on_the_way")
    TRACKABLE = ("accepted", "picked_up", "on_the_way")

    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="delivery")
    courier = models.ForeignKey(CourierProfile, null=True, blank=True, on_delete=models.SET_NULL, related_name="deliveries")
    status = models.CharField(max_length=12, choices=STATUS, default="searching")
    declined_by = models.ManyToManyField(CourierProfile, blank=True, related_name="declined_deliveries")
    cash_to_collect = models.DecimalField("À encaisser", max_digits=10, decimal_places=0, default=0)
    cash_collected = models.DecimalField("Encaissé", max_digits=10, decimal_places=0, null=True, blank=True)
    courier_note = models.CharField(max_length=255, blank=True)
    offered_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Livraison"

    def __str__(self):
        return f"Livraison {self.order.order_number}"


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = (float(x) for x in (lat1, lon1, lat2, lon2))
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def eta_minutes(km, vehicle="moto"):
    speed = {"moto": 25, "voiture": 20, "velo": 12, "pied": 5}.get(vehicle, 20)
    return max(1, math.ceil(km * 1.3 / speed * 60))


def online_since():
    return timezone.now() - timezone.timedelta(minutes=15)
