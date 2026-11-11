from rest_framework import serializers

from .models import Category, Product, ProductImage, ProductVariant, Review


def image_url(field_file, request=None, width=None):
    """URL absolue ; avec Cloudinary, image redimensionnée et en WebP/AVIF automatique."""
    if not field_file:
        return None
    url = field_file.url
    marker = "/image/upload/"
    if "res.cloudinary.com" in url and marker in url:
        t = "f_auto,q_auto" + (f",c_limit,w_{int(width)}" if width else "")
        return url.replace(marker, f"{marker}{t}/", 1)
    return request.build_absolute_uri(url) if request else url


class CategorySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "gender", "icon", "image", "position"]

    def get_image(self, obj):
        return image_url(obj.image, self.context.get("request"), 600)


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "thumbnail", "alt_text", "is_primary", "position"]

    def get_image(self, obj):
        return image_url(obj.image, self.context.get("request"), 1200)

    def get_thumbnail(self, obj):
        return image_url(obj.image, self.context.get("request"), 200)


class ProductVariantSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ["id", "size", "color", "color_hex", "stock_quantity", "extra_price", "label"]

    def get_label(self, obj):
        return " · ".join(p for p in [obj.size, obj.color] if p) or "Unique"


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "user", "rating", "comment", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def get_user(self, obj):
        return obj.user.first_name or obj.user.username

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("La note doit être entre 1 et 5.")
        return value


def _primary(obj):
    # Utilise les images préchargées (prefetch) : aucune requête de plus par produit
    images = list(obj.images.all())
    for img in images:
        if img.is_primary:
            return img
    return images[0] if images else None


class ProductListSerializer(serializers.ModelSerializer):
    """Version légère pour les grilles (rapide à charger)."""

    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "price", "compare_at_price", "discount_percent", "gender",
            "category_name", "category_slug", "primary_image", "in_stock", "is_featured",
            "is_handmade", "made_to_order",
        ]

    def get_primary_image(self, obj):
        img = _primary(obj)
        return image_url(img.image, self.context.get("request"), 600) if img else None


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "gender", "price", "compare_at_price",
            "discount_percent", "sku", "stock_quantity", "in_stock", "category", "material",
            "is_handmade", "made_to_order", "production_days", "images", "variants", "reviews",
            "average_rating", "is_featured", "created_at",
        ]

    def get_reviews(self, obj):
        return ReviewSerializer(list(obj.reviews.all())[:20], many=True).data

    def get_average_rating(self, obj):
        reviews = list(obj.reviews.all())
        if not reviews:
            return None
        return round(sum(r.rating for r in reviews) / len(reviews), 1)
