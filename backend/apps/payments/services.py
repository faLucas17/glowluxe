"""
Passerelles de paiement.

- Wave Checkout (direct)  : https://docs.wave.com/checkout
- PayTech (Sénégal)       : Wave, Orange Money, Free Money ET carte bancaire - https://doc.paytech.sn
- Manuel (WhatsApp)       : tant qu'aucun compte marchand n'est actif ; validé dans l'admin
- Simulateur              : uniquement en local (DEBUG + PAYMENT_TEST_MODE)

Règle : un paiement n'est JAMAIS validé par le téléphone du client. Seulement par un
webhook signé ou une vérification serveur-à-serveur, avec contrôle du montant.
"""

import hashlib
import hmac
import json
import logging
import time
from decimal import Decimal

import requests
from django.conf import settings
from django.urls import reverse

logger = logging.getLogger(__name__)
TIMEOUT = 15


def amounts_match(received, expected):
    try:
        return Decimal(str(received)).quantize(Decimal("1")) == Decimal(expected).quantize(Decimal("1"))
    except Exception:
        return False


def wave_enabled():
    return bool(settings.WAVE_API_KEY and settings.WAVE_WEBHOOK_SECRET)


def paytech_enabled():
    return bool(settings.PAYTECH_API_KEY and settings.PAYTECH_API_SECRET)


def test_mode():
    return settings.DEBUG and settings.PAYMENT_TEST_MODE


def gateway_for(method):
    """Choisit la passerelle réelle pour le moyen choisi par le client."""
    if test_mode():
        return "test"
    if method == "wave" and wave_enabled():
        return "wave"
    if method in ("wave", "orange_money", "card") and paytech_enabled():
        return "paytech"
    if method in ("wave", "orange_money"):
        return "manual"
    return None  # carte impossible sans PayTech


def available_methods():
    """Ce que l'appli affiche dans « Mode de paiement »."""
    methods = [
        {"code": "wave", "label": "Wave", "description": "Paiement depuis l'appli Wave"},
        {"code": "orange_money", "label": "Orange Money", "description": "Paiement Orange Money"},
    ]
    if paytech_enabled() or test_mode():
        methods.append({"code": "card", "label": "Carte bancaire", "description": "Visa, Mastercard"})
    for m in methods:
        m["gateway"] = gateway_for(m["code"])
        if m["gateway"] == "manual":
            m["description"] = "Vous envoyez le montant, nous confirmons sur WhatsApp"
    return methods


def _abs(name, *args):
    return settings.SITE_URL + reverse(name, args=args)


def start(payment):
    """Retourne {'ok': bool, 'checkout_url': str, 'error': str}."""
    gateway = payment.gateway
    if gateway == "test":
        url = _abs("payment-simulator", payment.reference)
    elif gateway == "manual":
        url = _abs("payment-manual", payment.reference)
    elif gateway == "wave":
        return _wave_create(payment)
    elif gateway == "paytech":
        return _paytech_create(payment)
    else:
        return {"ok": False, "error": "Moyen de paiement indisponible pour le moment."}
    payment.checkout_url = url
    payment.save(update_fields=["checkout_url", "updated_at"])
    return {"ok": True, "checkout_url": url}


# ─────────────── Wave ───────────────
WAVE_URL = "https://api.wave.com/v1/checkout/sessions"


def _wave_headers(body=""):
    h = {"Authorization": f"Bearer {settings.WAVE_API_KEY}", "Content-Type": "application/json"}
    if settings.WAVE_SIGNING_SECRET:
        ts = str(int(time.time()))
        sig = hmac.new(settings.WAVE_SIGNING_SECRET.encode(), (ts + body).encode(), hashlib.sha256).hexdigest()
        h["Wave-Signature"] = f"t={ts},v1={sig}"
    return h


def _wave_create(payment):
    body = json.dumps({
        "amount": str(int(payment.amount)),
        "currency": "XOF",
        "client_reference": payment.reference,
        "success_url": _abs("payment-return", payment.reference),
        "error_url": _abs("payment-cancel", payment.reference),
    })
    try:
        resp = requests.post(WAVE_URL, data=body, headers=_wave_headers(body), timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.error("Wave: %s %s", e, getattr(getattr(e, "response", None), "text", "")[:300])
        payment.fail()
        return {"ok": False, "error": "Wave est momentanément indisponible. Réessayez."}
    payment.provider_reference = data.get("id", "")
    payment.checkout_url = data.get("wave_launch_url", "")
    payment.raw_response = data
    payment.save()
    return {"ok": True, "checkout_url": payment.checkout_url}


def wave_get_session(session_id):
    try:
        resp = requests.get(f"{WAVE_URL}/{session_id}", headers=_wave_headers(), timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error("Wave get: %s", e)
        return None


def wave_session_paid(session, payment):
    return (
        session.get("payment_status") == "succeeded"
        and session.get("client_reference") == payment.reference
        and session.get("currency", "XOF") == "XOF"
        and amounts_match(session.get("amount"), payment.amount)
    )


def wave_verify_signature(raw_body, header, tolerance=300):
    """En-tête Wave-Signature : t=<ts>,v1=<hmac> ; HMAC-SHA256(secret, ts + corps brut)."""
    secret = settings.WAVE_WEBHOOK_SECRET
    if not secret or not header:
        return False
    ts, sigs = "", []
    for part in header.split(","):
        k, _, v = part.strip().partition("=")
        if k == "t":
            ts = v
        elif k == "v1":
            sigs.append(v)
    try:
        if not sigs or abs(time.time() - int(ts)) > tolerance:
            return False
    except ValueError:
        return False
    expected = hmac.new(secret.encode(), ts.encode() + raw_body, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in sigs)


# ─────────────── PayTech ───────────────
PAYTECH_URL = "https://paytech.sn/api/payment/request-payment"


def _paytech_create(payment):
    order = payment.order
    payload = {
        "item_name": f"Commande GlowLuxe {order.order_number}",
        "item_price": int(payment.amount),
        "currency": "XOF",
        "ref_command": payment.reference,
        "command_name": f"GlowLuxe {order.order_number} ({payment.get_purpose_display()})",
        "env": settings.PAYTECH_ENV,
        "ipn_url": _abs("payment-paytech-ipn"),
        "success_url": _abs("payment-return", payment.reference),
        "cancel_url": _abs("payment-cancel", payment.reference),
        "custom_field": json.dumps({"order": order.order_number, "method": payment.method}),
    }
    headers = {
        "Accept": "application/json", "Content-Type": "application/json",
        "API_KEY": settings.PAYTECH_API_KEY, "API_SECRET": settings.PAYTECH_API_SECRET,
    }
    try:
        data = requests.post(PAYTECH_URL, json=payload, headers=headers, timeout=TIMEOUT).json()
    except (requests.RequestException, ValueError) as e:
        logger.error("PayTech: %s", e)
        data = {}
    url = data.get("redirect_url") or data.get("redirectUrl")
    if str(data.get("success")) != "1" or not url:
        logger.error("PayTech refus: %s", str(data)[:300])
        payment.fail()
        return {"ok": False, "error": "Le paiement n'a pas pu démarrer. Réessayez dans un instant."}
    payment.provider_reference = data.get("token", "")
    payment.checkout_url = url
    payment.raw_response = data
    payment.save()
    return {"ok": True, "checkout_url": url}


def paytech_verify_ipn(data):
    k = hashlib.sha256(settings.PAYTECH_API_KEY.encode()).hexdigest()
    s = hashlib.sha256(settings.PAYTECH_API_SECRET.encode()).hexdigest()
    return hmac.compare_digest(k, str(data.get("api_key_sha256", ""))) and hmac.compare_digest(
        s, str(data.get("api_secret_sha256", ""))
    )
