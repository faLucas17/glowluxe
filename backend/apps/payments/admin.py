from django.contrib import admin, messages

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["reference", "order", "method", "gateway", "purpose", "amount", "status", "created_at"]
    list_filter = ["status", "method", "gateway", "purpose"]
    search_fields = ["reference", "order__order_number", "provider_reference"]
    readonly_fields = [f.name for f in Payment._meta.fields]
    actions = ["confirm_manual"]

    def has_add_permission(self, request):
        return False

    @admin.action(description="Confirmer la réception (WhatsApp / espèces)")
    def confirm_manual(self, request, queryset):
        n = 0
        for p in queryset.filter(gateway__in=("manual", "cash")).exclude(status="success"):
            p.confirm(f"manuel:{request.user.email}")
            n += 1
        self.message_user(request, f"{n} paiement(s) confirmé(s), le client a reçu son email.")
        skipped = queryset.exclude(gateway__in=("manual", "cash")).count()
        if skipped:
            self.message_user(request, f"{skipped} paiement(s) en ligne ignoré(s) : ils se valident tout seuls.", messages.WARNING)
