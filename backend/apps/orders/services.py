"""
Logique des commandes : devis, création, confirmation de paiement.
Tous les montants sont calculés ici, côté serveur : l'appli n'envoie jamais de prix.
"""

import logging
from dataclasses import dataclass
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F

from apps.core.emails import send_email
from apps.core.models import ShopSettings

from .models import Order, OrderItem

logger = logging.getLogger(__name__)


class CheckoutError(Exception):
    pass


@dataclass
class Quote:
    subtotal: Decimal
    delivery_fee: Decimal
    deposit_option: Decimal | None
    plan: str
    fee_on_arrival: bool

    @property
    def total(self):
        return self.subtotal + self.delivery_fee

    @property
    def pay_now(self):
        items = self.deposit_option if (self.plan == "deposit" and self.deposit_option) else self.subtotal
        return items + (Decimal("0") if self.fee_on_arrival else self.delivery_fee)

    @property
    def pay_later(self):
        return self.total - self.pay_now

    def as_dict(self):
        return {
            "subtotal": self.subtotal, "delivery_fee": self.delivery_fee, "total": self.total,
            "deposit_option": self.deposit_option, "plan": self.plan, "fee_on_arrival": self.fee_on_arrival,
            "pay_now": self.pay_now, "pay_later": self.pay_later,
        }


def cart_lines(cart):
    return list(cart.items.select_related("product", "variant"))


def build_quote(cart, zone=None, plan="full", fee_on_arrival=False):
    shop = ShopSettings.load()
    lines = cart_lines(cart)
    subtotal = sum((line.unit_price * line.quantity for line in lines), Decimal("0"))
    deposit = shop.deposit_for(subtotal, any(line.product.made_to_order for line in lines))
    fee = Decimal(zone.fee) if zone else Decimal("0")
    if plan != "deposit" or deposit is None:
        plan = "full"
    if not shop.allow_delivery_fee_on_arrival or fee == 0:
        fee_on_arrival = False
    return Quote(subtotal, fee, deposit, plan, bool(fee_on_arrival))


@transaction.atomic
def create_order(user, cart, address, zone, quote, notes=""):
    lines = cart_lines(cart)
    if not lines:
        raise CheckoutError("Votre panier est vide.")
    for line in lines:
        if not line.product.is_active:
            raise CheckoutError(f"« {line.product.name} » n'est plus disponible.")
        if line.quantity > line.product.available_quantity(line.variant):
            raise CheckoutError(f"Stock insuffisant pour « {line.product.name} ».")
    order = Order.objects.create(
        user=user,
        shipping_address=address,
        delivery_zone=zone,
        subtotal=quote.subtotal,
        shipping_cost=quote.delivery_fee,
        total=quote.total,
        payment_plan=quote.plan,
        deposit_amount=quote.deposit_option if quote.plan == "deposit" else 0,
        delivery_fee_on_arrival=quote.fee_on_arrival,
        notes=notes[:500],
        address_snapshot={
            "full_name": address.full_name, "phone": address.phone_number, "line": address.one_line,
            "lat": str(address.latitude) if address.latitude is not None else None,
            "lng": str(address.longitude) if address.longitude is not None else None,
        },
    )
    OrderItem.objects.bulk_create([
        OrderItem(
            order=order, product=line.product, variant=line.variant, product_name=line.product.name,
            variant_label=" · ".join(p for p in [getattr(line.variant, "size", ""), getattr(line.variant, "color", "")] if p),
            unit_price=line.unit_price, quantity=line.quantity,
        )
        for line in lines
    ])
    cart.items.all().delete()
    return order


def _commit_stock(order):
    from apps.catalog.models import Product, ProductVariant

    if order.stock_committed:
        return
    for item in order.items.select_related("product"):
        if item.product.made_to_order:
            continue
        Product.objects.filter(pk=item.product_id, stock_quantity__gte=item.quantity).update(
            stock_quantity=F("stock_quantity") - item.quantity
        )
        if item.variant_id:
            ProductVariant.objects.filter(pk=item.variant_id, stock_quantity__gte=item.quantity).update(
                stock_quantity=F("stock_quantity") - item.quantity
            )
    order.stock_committed = True


def release_stock(order):
    from apps.catalog.models import Product, ProductVariant

    if not order.stock_committed:
        return
    for item in order.items.select_related("product"):
        if item.product.made_to_order:
            continue
        Product.objects.filter(pk=item.product_id).update(stock_quantity=F("stock_quantity") + item.quantity)
        if item.variant_id:
            ProductVariant.objects.filter(pk=item.variant_id).update(stock_quantity=F("stock_quantity") + item.quantity)
    Order.objects.filter(pk=order.pk).update(stock_committed=False)


def confirm_payment(payment, provider_reference="", raw=None):
    """Idempotent : appelé 2 fois (webhook + retour), l'argent n'est compté qu'une fois."""
    from apps.payments.models import Payment

    with transaction.atomic():
        p = Payment.objects.select_for_update().get(pk=payment.pk)
        if p.status == "success":
            return p
        p.status = "success"
        if provider_reference:
            p.provider_reference = provider_reference
        if raw:
            p.raw_response = raw
        p.save()
        order = Order.objects.select_for_update().get(pk=p.order_id)
        first = not order.is_confirmed
        order.amount_paid += p.amount
        if order.status in ("pending", "deposit_paid", "paid"):
            items_paid = order.amount_paid >= order.subtotal + (0 if order.delivery_fee_on_arrival else order.shipping_cost)
            order.status = "paid" if items_paid else "deposit_paid"
        _commit_stock(order)
        order.save()
    notify_payment(order, p, first)
    return p


def order_link(order):
    return f"{settings.APP_URL}/commandes/{order.pk}"


def notify_payment(order, payment, first):
    ctx = {"order": order, "payment": payment, "order_url": order_link(order)}
    if first and not order.confirmation_sent:
        send_email("order_confirmation", f"Commande {order.order_number} confirmée - GlowLuxe", order.user.email, ctx)
        Order.objects.filter(pk=order.pk).update(confirmation_sent=True)
        if settings.SHOP_NOTIFICATION_EMAIL:
            send_email("shop_new_order", f"Nouvelle commande {order.order_number}", settings.SHOP_NOTIFICATION_EMAIL, ctx)
    elif not first:
        send_email("payment_received", f"Paiement reçu - {order.order_number}", order.user.email, ctx)


def notify_status(order):
    if order.status in ("processing", "ready", "shipped", "out_for_delivery", "delivered", "cancelled"):
        send_email(
            "order_status", f"Commande {order.order_number} : {order.get_status_display()}", order.user.email,
            {"order": order, "order_url": order_link(order)},
        )
