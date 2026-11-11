from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product, ProductImage, ProductVariant, Review


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["image", "preview", "alt_text", "is_primary", "position"]
    readonly_fields = ["preview"]

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:80px;border-radius:6px;" />', obj.image.url)
        return "-"


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "gender", "position", "is_active"]
    list_editable = ["position", "is_active"]
    list_filter = ["gender", "is_active", "parent"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "compare_at_price", "stock_quantity", "made_to_order", "is_active", "is_featured"]
    list_editable = ["price", "compare_at_price", "stock_quantity", "is_active", "is_featured"]
    list_filter = ["category", "gender", "is_active", "is_featured", "made_to_order", "is_handmade"]
    list_select_related = ["category"]
    search_fields = ["name", "sku"]
    inlines = [ProductImageInline, ProductVariantInline]
    fieldsets = (
        ("Informations générales", {
            "fields": ("name", "category", "gender", "description", "sku")
        }),
        ("Prix & stock", {
            "fields": ("price", "compare_at_price", "stock_quantity")
        }),
        ("Fabrication (crochet, sur-mesure…)", {
            "fields": ("material", "is_handmade", "made_to_order", "production_days")
        }),
        ("Visibilité", {
            "fields": ("is_active", "is_featured")
        }),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "rating", "created_at"]
