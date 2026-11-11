from django.conf import settings
from django.contrib import admin, messages
from django.utils import timezone

from apps.core.emails import send_email

from . import delivery as svc
from .models import CourierProfile, Delivery, DeliveryZone, Shipment, TrackingEvent


class TrackingEventInline(admin.TabularInline):
    model = TrackingEvent
    extra = 1


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ["tracking_number", "order", "carrier", "status", "updated_at"]
    inlines = [TrackingEventInline]


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ["name", "fee", "estimated_time", "position", "is_active"]
    list_editable = ["fee", "estimated_time", "position", "is_active"]


@admin.register(CourierProfile)
class CourierAdmin(admin.ModelAdmin):
    list_display = ["display_name", "phone", "vehicle", "zones", "status", "is_available", "last_seen"]
    list_filter = ["status", "is_available", "vehicle"]
    search_fields = ["user__email", "user__first_name", "phone"]
    readonly_fields = ["last_latitude", "last_longitude", "last_seen", "approved_at"]
    actions = ["approve", "suspend"]

    @admin.action(description="Valider les livreurs (après vérification d'identité)")
    def approve(self, request, qs):
        for c in qs.exclude(status="approved"):
            c.status, c.approved_at = "approved", timezone.now()
            c.save(update_fields=["status", "approved_at"])
            send_email("courier_approved", "Votre compte livreur GlowLuxe est validé", c.user.email, {"courier": c})
        self.message_user(request, "Livreur(s) validé(s) et prévenu(s) par email.")

    @admin.action(description="Suspendre")
    def suspend(self, request, qs):
        qs.update(status="suspended", is_available=False)
        self.message_user(request, "Suspendu(s).", messages.WARNING)


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ["order", "courier", "status", "cash_to_collect", "cash_collected", "offered_at", "delivered_at"]
    list_filter = ["status"]
    raw_id_fields = ["order"]
    actions = ["relaunch"]

    @admin.action(description="Relancer la recherche d'un livreur")
    def relaunch(self, request, qs):
        n = 0
        for d in qs.filter(status__in=("searching", "offered", "failed")):
            d.declined_by.clear()
            if svc.offer_next(d):
                n += 1
        self.message_user(request, f"{n} course(s) proposée(s).")
