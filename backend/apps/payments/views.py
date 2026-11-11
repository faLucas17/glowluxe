import json
import logging
import urllib.parse

from django.conf import settings
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.models import ShopSettings

from . import services
from .models import Payment

logger = logging.getLogger(__name__)


# ─────────────── API (appli) ───────────────
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def payment_status(request, ref):
    """L'appli interroge ce point après le retour du navigateur de paiement."""
    p = get_object_or_404(Payment.objects.select_related("order"), reference=ref, order__user=request.user)
    if p.status == "pending" and p.gateway == "wave" and p.provider_reference:
        session = services.wave_get_session(p.provider_reference)
        if session and services.wave_session_paid(session, p):
            p.confirm(session.get("transaction_id", ""), session)
            p.refresh_from_db()
    p.order.refresh_from_db()
    return Response({
        "status": p.status, "status_display": p.get_status_display(),
        "order_id": str(p.order_id), "order_status": p.order.status,
        "order_status_display": p.order.get_status_display(),
    })


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def payment_methods(request):
    return Response(services.available_methods())


# ─────────────── Pages web (navigateur de paiement) ───────────────
def _payment(ref):
    return get_object_or_404(Payment.objects.select_related("order", "order__user"), reference=ref)


def _back(p):
    return f"{settings.APP_URL}/commandes/{p.order_id}"


def payment_return(request, ref):
    p = _payment(ref)
    if p.status == "pending" and p.gateway == "wave" and p.provider_reference:
        session = services.wave_get_session(p.provider_reference)
        if session and services.wave_session_paid(session, p):
            p.confirm(session.get("transaction_id", ""), session)
            p.refresh_from_db()
    return render(request, "payments/return.html", {"payment": p, "order": p.order, "back_url": _back(p)})


def payment_cancel(request, ref):
    p = _payment(ref)
    p.fail()
    return render(request, "payments/cancel.html", {"payment": p, "order": p.order, "back_url": _back(p)})


def payment_manual(request, ref):
    p = _payment(ref)
    shop = ShopSettings.load()
    lines = [f"- {i.product_name} {('(' + i.variant_label + ')') if i.variant_label else ''} x{i.quantity}" for i in p.order.items.all()]
    msg = (
        f"Bonjour GlowLuxe, je règle ma commande {p.order.order_number} par {p.get_method_display()}.\n"
        + "\n".join(lines)
        + f"\nMontant : {int(p.amount)} F CFA (réf. {p.reference})."
    )
    wa = f"https://wa.me/{shop.whatsapp_number}?text={urllib.parse.quote(msg)}"
    return render(request, "payments/manual.html", {"payment": p, "order": p.order, "whatsapp_url": wa, "shop": shop, "back_url": _back(p)})


def payment_simulator(request, ref):
    if not services.test_mode():
        raise Http404
    p = _payment(ref)
    if request.method == "POST":
        if request.POST.get("result") == "ok":
            p.confirm("SIMULATION")
            return redirect("payment-return", ref)
        return redirect("payment-cancel", ref)
    return render(request, "payments/simulator.html", {"payment": p})


# ─────────────── Webhooks ───────────────
@csrf_exempt
@require_POST
def wave_webhook(request):
    if not services.wave_verify_signature(request.body, request.headers.get("Wave-Signature", "")):
        logger.warning("Webhook Wave rejeté (signature)")
        return HttpResponse(status=401)
    try:
        event = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponse(status=400)
    session = event.get("data") or {}
    p = Payment.objects.filter(reference=session.get("client_reference", ""), gateway="wave").first()
    if p is None:
        return HttpResponse(status=200)
    if event.get("type") == "checkout.session.completed":
        if services.wave_session_paid(session, p):
            p.confirm(session.get("transaction_id", ""), event)
        else:
            logger.error("Wave : montant incohérent pour %s", p.reference)
    elif event.get("type") == "checkout.session.payment_failed":
        p.fail()
    return HttpResponse(status=200)


@csrf_exempt
@require_POST
def paytech_ipn(request):
    data = request.POST.dict()
    if not data:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse(status=400)
    if not services.paytech_verify_ipn(data):
        logger.warning("IPN PayTech rejeté (clés)")
        return HttpResponse("IPN KO", status=401)
    p = Payment.objects.filter(reference=data.get("ref_command", ""), gateway="paytech").first()
    if p is None:
        return HttpResponse("IPN OK")
    safe = {k: v for k, v in data.items() if "sha256" not in k}
    if data.get("type_event") == "sale_complete":
        if services.amounts_match(data.get("item_price"), p.amount):
            p.confirm(data.get("token", ""), safe)
        else:
            logger.error("PayTech : montant incohérent pour %s", p.reference)
    elif data.get("type_event") == "sale_canceled":
        p.fail()
    return HttpResponse("IPN OK")
