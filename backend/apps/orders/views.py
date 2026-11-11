from django.db.models import Prefetch
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import Address
from apps.cart.models import Cart
from apps.payments import services as pay
from apps.payments.models import Payment
from apps.shipping.models import DeliveryZone

from .models import Order, OrderItem
from .serializers import CreateOrderSerializer, OrderSerializer, PaySerializer, QuoteSerializer
from .services import CheckoutError, build_quote, create_order, release_stock


def _start_payment(order, method, amount, purpose, phone=""):
    gateway = pay.gateway_for(method)
    if gateway is None:
        return None, {"detail": "Ce moyen de paiement n'est pas encore disponible. Choisissez Wave ou Orange Money."}
    payment = Payment.objects.create(
        order=order, method=method, gateway=gateway, purpose=purpose, amount=amount, payer_phone_number=phone or ""
    )
    result = pay.start(payment)
    if not result["ok"]:
        return payment, {"detail": result["error"]}
    return payment, None


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/orders/                 historique
    GET  /api/orders/{id}/            détail, livreur, paiements
    POST /api/orders/quote/           calcul (livraison, acompte, à payer maintenant)
    POST /api/orders/checkout/        panier -> commande -> lien de paiement
    POST /api/orders/{id}/pay/        réessayer / payer le solde
    POST /api/orders/{id}/cancel/     annuler une commande non payée
    """

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("delivery_zone", "delivery__courier__user")
            .prefetch_related(
                Prefetch("items", queryset=OrderItem.objects.select_related("product__category").prefetch_related("product__images")),
                "payments",
            )
        )

    def _cart(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return cart

    @action(detail=False, methods=["post"])
    def quote(self, request):
        s = QuoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        zone = DeliveryZone.objects.filter(pk=s.validated_data.get("zone_id"), is_active=True).first()
        q = build_quote(self._cart(), zone, s.validated_data["payment_plan"], s.validated_data["fee_on_arrival"])
        return Response(q.as_dict())

    @action(detail=False, methods=["post"])
    def checkout(self, request):
        s = CreateOrderSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        address = Address.objects.filter(id=d["shipping_address_id"], user=request.user).first()
        if not address:
            return Response({"detail": "Adresse de livraison introuvable."}, status=404)
        zone = DeliveryZone.objects.filter(pk=d["zone_id"], is_active=True).first()
        if not zone:
            return Response({"detail": "Choisissez une zone de livraison."}, status=400)
        if pay.gateway_for(d["payment_method"]) is None:
            return Response({"detail": "La carte bancaire n'est pas encore activée. Choisissez Wave ou Orange Money."}, status=400)
        cart = self._cart()
        q = build_quote(cart, zone, d["payment_plan"], d["fee_on_arrival"])
        try:
            order = create_order(request.user, cart, address, zone, q, d.get("notes", ""))
        except CheckoutError as e:
            return Response({"detail": str(e)}, status=400)
        purpose = "deposit" if order.payment_plan == "deposit" else "full"
        payment, error = _start_payment(order, d["payment_method"], q.pay_now, purpose, d.get("payer_phone_number"))
        body = {"order": OrderSerializer(order, context={"request": request}).data}
        if error:
            body.update(error)
            return Response(body, status=status.HTTP_201_CREATED)
        body["payment"] = {"reference": payment.reference, "checkout_url": payment.checkout_url, "gateway": payment.gateway, "amount": payment.amount}
        body["payment_checkout_url"] = payment.checkout_url
        return Response(body, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        order = self.get_object()
        s = PaySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if not order.can_pay_online:
            return Response({"detail": "Cette commande est déjà réglée."}, status=400)
        if order.status == "pending":
            amount = order.first_payment_amount - order.amount_paid
            purpose = "deposit" if order.payment_plan == "deposit" else "full"
        else:
            amount, purpose = order.amount_due, "balance"
        payment, error = _start_payment(order, s.validated_data["payment_method"], amount, purpose, s.validated_data.get("payer_phone_number"))
        if error:
            return Response(error, status=400)
        return Response({"reference": payment.reference, "checkout_url": payment.checkout_url, "gateway": payment.gateway, "amount": payment.amount})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status != "pending":
            return Response({"detail": "Seule une commande non payée peut être annulée. Contactez-nous."}, status=400)
        order.status = "cancelled"
        order.save(update_fields=["status", "updated_at"])
        release_stock(order)
        return Response(OrderSerializer(order, context={"request": request}).data)
