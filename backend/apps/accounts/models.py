import hashlib
import secrets
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractUser):
    """Utilisateur GlowLuxe. Le login se fait par email."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_seller_admin = models.BooleanField(default=False)
    email_verified = models.BooleanField("Email vérifié", default=False)
    newsletter = models.BooleanField("Accepte les promotions", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


class Address(models.Model):
    """Carnet d'adresses de livraison."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    full_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default="Sénégal")
    city = models.CharField(max_length=100)
    street_address = models.CharField(max_length=255)
    landmark = models.CharField("Point de repère", max_length=150, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.full_name} - {self.city}, {self.country}"

    @property
    def one_line(self):
        parts = [self.street_address, self.landmark, self.city, self.country]
        return ", ".join(p for p in parts if p)


class OneTimeCode(models.Model):
    """Code à 6 chiffres envoyé par email (mot de passe oublié). Stocké haché, 15 min, 5 essais."""

    PURPOSES = [("password_reset", "Mot de passe oublié")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="codes")
    purpose = models.CharField(max_length=20, choices=PURPOSES)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def _hash(code):
        return hashlib.sha256(code.encode()).hexdigest()

    @classmethod
    def issue(cls, user, purpose, minutes=15):
        cls.objects.filter(user=user, purpose=purpose, used=False).update(used=True)
        code = f"{secrets.randbelow(1_000_000):06d}"
        cls.objects.create(
            user=user, purpose=purpose, code_hash=cls._hash(code),
            expires_at=timezone.now() + timezone.timedelta(minutes=minutes),
        )
        return code

    @classmethod
    def verify(cls, user, purpose, code):
        otc = cls.objects.filter(user=user, purpose=purpose, used=False).order_by("-created_at").first()
        if otc is None or otc.expires_at < timezone.now() or otc.attempts >= 5:
            return False
        otc.attempts += 1
        if secrets.compare_digest(otc.code_hash, cls._hash(str(code).strip())):
            otc.used = True
        otc.save(update_fields=["attempts", "used"])
        return otc.used
