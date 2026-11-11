from django.contrib import admin, messages

from apps.payments.models import Payment
from apps.shipping import delivery as dispatch_service

from .models import Order, OrderItem
from .services import notify_status, release_stock


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "variant", "product_name", "variant_label", "unit_price", "quantity"]
    can_delete = False


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    fields = ["reference", "method", "gateway", "purpose", "amount", "status", "created_at"]
    readonly_fields = fields
    can_delete = False
    show_change_link = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "total", "amount_paid", "reste", "delivery_zone", "created_at"]
    list_filter = ["status", "payment_plan", "delivery_zone", "created_at"]
    search_fields = ["order_number", "user__email", "user__phone_number"]
    readonly_fields = [
        "order_number", "user", "shipping_address", "subtotal", "shipping_cost", "total", "payment_plan",
        "deposit_amount", "delivery_fee_on_arrival", "amount_paid", "address_snapshot", "created_at",
    ]
    inlines = [OrderItemInline, PaymentInline]
    actions = ["mark_processing", "mark_ready", "mark_cancelled"]
    date_hierarchy = "created_at"

    @admin.display(description="Reste à payer")
    def reste(self, obj):
        return obj.amount_due

    def save_model(self, request, obj, form, change):
        old = Order.objects.filter(pk=obj.pk).values_list("status", flat=True).first() if change else None
        super().save_model(request, obj, form, change)
        if change and old != obj.status:
            self._after(request, obj)

    def _after(self, request, order):
        if order.status == "cancelled":
            release_stock(order)
        if order.status == "ready":
            d = dispatch_service.dispatch(order)
            if d.courier_id:
                self.message_user(request, f"{order.order_number} : course proposée à {d.courier}.")
            else:
                self.message_user(request, f"{order.order_number} : aucun livreur disponible, proposée dès qu'un livreur se connecte.", messages.WARNING)
        notify_status(order)

    def _bulk(self, request, queryset, new, allowed):
        n = 0
        for order in queryset:
            if order.status in allowed:
                order.status = new
                order.save(update_fields=["status", "updated_at"])
                self._after(request, order)
                n += 1
        self.message_user(request, f"{n} commande(s) mise(s) à jour.")

    @admin.action(description="Passer « En préparation »")
    def mark_processing(self, request, qs):
        self._bulk(request, qs, "processing", ("deposit_paid", "paid"))

    @admin.action(description="Passer « Prête » et chercher un livreur")
    def mark_ready(self, request, qs):
        self._bulk(request, qs, "ready", ("deposit_paid", "paid", "processing"))

    @admin.action(description="Annuler")
    def mark_cancelled(self, request, qs):
        self._bulk(request, qs, "cancelled", ("pending", "deposit_paid", "paid", "processing", "ready"))
