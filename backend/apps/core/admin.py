from django.conf import settings
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from apps.accounts.tokens import make_unsubscribe_token

from .emails import send_bulk
from .models import DataImport, Promotion, ShopSettings


@admin.register(ShopSettings)
class ShopSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Boutique", {"fields": ("shop_name", "contact_phone", "contact_email", "address", "opening_hours", "whatsapp_number")}),
        ("Acompte", {"fields": ("deposit_threshold", "deposit_percent", "deposit_percent_made_to_order", "minimum_deposit")}),
        ("Livraison", {"fields": ("allow_delivery_fee_on_arrival", "courier_offer_minutes", "pickup_latitude", "pickup_longitude")}),
    )

    def has_add_permission(self, request):
        return not ShopSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ["title", "code", "starts_at", "ends_at", "active", "emailed_at", "emailed_count"]
    actions = ["send_by_email"]

    @admin.action(description="Envoyer par email aux clients inscrits (promos acceptées + email vérifié)")
    def send_by_email(self, request, queryset):
        users = list(get_user_model().objects.filter(is_active=True, newsletter=True, email_verified=True))
        if not users:
            self.message_user(request, "Aucun client inscrit avec un email vérifié.", messages.WARNING)
            return
        for promo in queryset:
            def ctx(user, promo=promo):
                return {"user": user, "promo": promo,
                        "unsubscribe_url": settings.SITE_URL + reverse("unsubscribe", args=[make_unsubscribe_token(user)])}

            send_bulk("promotion", f"{promo.title} - GlowLuxe", users, ctx)
            promo.emailed_at, promo.emailed_count = timezone.now(), len(users)
            promo.save(update_fields=["emailed_at", "emailed_count"])
        self.message_user(request, f"Envoi lancé vers {len(users)} client(s).")


admin.site.register(DataImport)
