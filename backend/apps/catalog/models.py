import io
import logging
import os
import uuid

from django.core.files.base import ContentFile
from django.db import models
from django.utils.text import slugify
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


def optimize_image(field_file, max_side=1600, quality=82):
    """Photo de 3-5 Mo -> WebP de 150-300 Ko : l'appli charge beaucoup plus vite."""
    if not field_file or getattr(field_file, "_committed", True):
        return
    try:
        field_file.seek(0)
        img = ImageOps.exif_transpose(Image.open(field_file))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=4)
        base = os.path.splitext(os.path.basename(field_file.name))[0][:80]
        field_file.save(f"{base}.webp", ContentFile(buf.getvalue()), save=False)
    except Exception:
        logger.exception("Optimisation d'image impossible, original conservé")


GENDER_CHOICES = [
    ("women", "Femme"),
    ("men", "Homme"),
    ("kids", "Enfant"),
    ("unisex", "Unisexe"),
]


class Category(models.Model):
    """Ex: Vêtements, Chaussures, Accessoires, Voiles."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="unisex")
    icon = models.CharField(max_length=50, blank=True, help_text="Nom d'icône (ex: shirt, shoe, bag)")
    image = models.ImageField(upload_to="categories/", blank=True)
    position = models.PositiveSmallIntegerField("Ordre d'affichage", default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        ordering = ["position", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        optimize_image(self.image, max_side=1000)
        super().save(*args, **kwargs)

    def descendant_ids(self):
        ids = [self.pk]
        for child in self.children.filter(is_active=True):
            ids.extend(child.descendant_ids())
        return ids

    def __str__(self):
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="unisex")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Ancien prix, pour afficher une promo barrée"
    )
    sku = models.CharField(max_length=50, unique=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    material = models.CharField("Matière", max_length=120, blank=True, help_text="Ex : coton, laine, soie, wax…")
    is_handmade = models.BooleanField("Fait main", default=False)
    made_to_order = models.BooleanField(
        "Fabriqué sur commande", default=False,
        help_text="Crochet / sur-mesure : commandable sans stock, un acompte est demandé.",
    )
    production_days = models.PositiveSmallIntegerField("Délai de fabrication (jours)", default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active", "category"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            self.slug = f"{base}-{str(self.id)[:8]}"
        super().save(*args, **kwargs)

    @property
    def in_stock(self):
        return self.made_to_order or self.stock_quantity > 0

    def available_quantity(self, variant=None):
        if self.made_to_order:
            return 99
        if variant is not None and self.variants.exists():
            return variant.stock_quantity
        return self.stock_quantity

    @property
    def discount_percent(self):
        if self.compare_at_price and self.compare_at_price > self.price:
            return round((1 - self.price / self.compare_at_price) * 100)
        return 0

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """Galerie d'images produit. Plusieurs photos nettes par article."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/%Y/%m/")
    alt_text = models.CharField(max_length=150, blank=True)
    is_primary = models.BooleanField(default=False)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-is_primary", "position"]

    def __str__(self):
        return f"Image {self.position} - {self.product.name}"

    def save(self, *args, **kwargs):
        optimize_image(self.image)
        super().save(*args, **kwargs)


class ProductVariant(models.Model):
    """Taille / couleur avec stock indépendant (ex: Robe - Rouge - M)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    size = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=50, blank=True)
    color_hex = models.CharField(max_length=7, blank=True, help_text="#RRGGBB")
    stock_quantity = models.PositiveIntegerField(default=0)
    extra_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ["product", "size", "color"]

    def __str__(self):
        return f"{self.product.name} - {self.size} - {self.color}"


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["product", "user"]
        ordering = ["-created_at"]
