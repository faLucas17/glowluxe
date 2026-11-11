import hashlib
import hmac
import json
import time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Address
from apps.catalog.models import Category, Product, ProductVariant
from apps.core.models import ShopSettings
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.shipping import delivery as dsvc
from apps.shipping.models import CourierProfile, DeliveryZone

User = get_user_model()
FAST = dict(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", EMAIL_ASYNC=False)


@override_settings(**FAST)
class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.cat = Category.objects.create(name="Robes test", slug="robes-test")
        self.robe = Product.objects.create(category=self.cat, name="Robe", price=Decimal("20000"), sku="R1", stock_quantity=5)
        self.crochet = Product.objects.create(category=self.cat, name="Top crochet", price=Decimal("15000"), sku="C1",
                                              made_to_order=True, is_handmade=True)
        self.user = User.objects.create_user(email="awa@example.com", username="awa", password="Sup3r-secret!", first_name="Awa")
        self.address = Address.objects.create(user=self.user, full_name="Awa Ndiaye", phone_number="771234567", city="Tivaouane", street_address="Rue 1", latitude=Decimal("14.96"), longitude=Decimal("-16.81"))
        self.zone = DeliveryZone.objects.create(name="Test", fee=Decimal("1000"))
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def add(self, product, qty=1, variant=None):
        return self.api.post("/api/cart/add_item/", {"product": str(product.pk), "quantity": qty, "variant": variant}, format="json")

    def checkout(self, plan="full", fee_on_arrival=False, method="wave"):
        return self.api.post("/api/orders/checkout/", {
            "shipping_address_id": str(self.address.pk), "zone_id": self.zone.pk, "payment_plan": plan,
            "fee_on_arrival": fee_on_arrival, "payment_method": method}, format="json")


class DepositTest(TestCase):
    def test_rules(self):
        s = ShopSettings.load()
        self.assertIsNone(s.deposit_for(10000))
        self.assertEqual(s.deposit_for(50000), Decimal("15000"))
        self.assertEqual(s.deposit_for(8000, True), Decimal("5000"))


class CartTest(Base):
    def test_validation(self):
        self.assertEqual(self.add(self.robe, -2).status_code, 400)
        self.assertEqual(self.add(self.robe, 99).status_code, 400)
        self.assertEqual(self.add(self.robe, "abc").status_code, 400)
        ProductVariant.objects.create(product=self.robe, size="M", stock_quantity=2)
        self.assertEqual(self.add(self.robe, 1).status_code, 400)  # variante obligatoire
        v = self.robe.variants.first()
        self.assertEqual(self.add(self.robe, 2, str(v.pk)).status_code, 201)
        self.assertEqual(self.add(self.robe, 1, str(v.pk)).status_code, 400)  # stock de la variante

    def test_guest_cannot_use_cart(self):
        self.assertEqual(APIClient().get("/api/cart/").status_code, 401)


class CheckoutTest(Base):
    def test_full_payment_manual_then_confirm(self):
        self.add(self.robe)
        r = self.checkout()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn("/paiement/manuel/", r.data["payment_checkout_url"])
        order = Order.objects.get()
        self.assertEqual(order.total, Decimal("21000"))
        p = order.payments.get()
        self.assertEqual(p.amount, Decimal("21000"))
        p.confirm()
        p.confirm()  # idempotent
        order.refresh_from_db()
        self.robe.refresh_from_db()
        self.assertEqual((order.status, order.amount_paid, self.robe.stock_quantity), ("paid", Decimal("21000"), 4))
        self.assertEqual(len([m for m in mail.outbox if "confirmée" in m.subject]), 1)

    def test_deposit_and_fee_on_arrival(self):
        self.add(self.robe, 2)
        q = self.api.post("/api/orders/quote/", {"zone_id": self.zone.pk, "payment_plan": "deposit", "fee_on_arrival": True}, format="json")
        self.assertEqual(Decimal(q.data["pay_now"]), Decimal("12000"))
        self.checkout("deposit", True)
        order = Order.objects.get()
        order.payments.get().confirm()
        order.refresh_from_db()
        self.assertEqual((order.status, order.amount_due), ("deposit_paid", Decimal("29000")))
        r = self.api.post(f"/api/orders/{order.pk}/pay/", {"payment_method": "orange_money"}, format="json")
        self.assertEqual(Decimal(r.data["amount"]), Decimal("29000"))

    def test_crochet_deposit(self):
        self.add(self.crochet)
        q = self.api.post("/api/orders/quote/", {"zone_id": self.zone.pk, "payment_plan": "deposit"}, format="json")
        self.assertEqual(Decimal(q.data["deposit_option"]), Decimal("7500"))

    def test_card_refused_without_gateway(self):
        self.add(self.robe)
        self.assertEqual(self.checkout(method="card").status_code, 400)

    def test_privacy(self):
        self.add(self.robe)
        self.checkout()
        order = Order.objects.get()
        ref = order.payments.get().reference
        bob = User.objects.create_user(email="bob@example.com", username="bob", password="Sup3r-secret!")
        other = APIClient()
        other.force_authenticate(bob)
        self.assertEqual(other.get(f"/api/orders/{order.pk}/").status_code, 404)
        self.assertEqual(other.get(f"/api/tracking/{order.pk}/").status_code, 404)
        self.assertEqual(other.get(f"/api/payments/{ref}/status/").status_code, 404)


@override_settings(WAVE_API_KEY="k", WAVE_WEBHOOK_SECRET="whsec", **FAST)
class WaveWebhookTest(Base):
    def _payment(self):
        self.add(self.robe)
        with self.settings(WAVE_API_KEY=""):
            self.checkout()
        p = Payment.objects.get()
        p.gateway = "wave"
        p.save()
        return p

    def _post(self, p, amount=None, secret="whsec", ts=None):
        body = json.dumps({"type": "checkout.session.completed", "data": {
            "client_reference": p.reference, "payment_status": "succeeded", "currency": "XOF",
            "amount": str(int(amount or p.amount)), "transaction_id": "T1"}}).encode()
        ts = str(ts or int(time.time()))
        sig = hmac.new(secret.encode(), ts.encode() + body, hashlib.sha256).hexdigest()
        return self.client.post("/api/payments/webhooks/wave/", body, content_type="application/json",
                                HTTP_WAVE_SIGNATURE=f"t={ts},v1={sig}")

    def test_signature_replay_amount(self):
        p = self._payment()
        self.assertEqual(self._post(p, secret="bad").status_code, 401)
        self.assertEqual(self._post(p, ts=int(time.time()) - 3600).status_code, 401)
        self._post(p, amount=100)
        p.refresh_from_db()
        self.assertEqual(p.status, "pending")
        self.assertEqual(self._post(p).status_code, 200)
        p.refresh_from_db()
        self.assertEqual(p.status, "success")


@override_settings(PAYTECH_API_KEY="pk", PAYTECH_API_SECRET="ps", **FAST)
class PayTechTest(Base):
    def test_ipn(self):
        self.add(self.robe)
        with self.settings(PAYTECH_API_KEY=""):
            self.checkout()
        p = Payment.objects.get()
        p.gateway = "paytech"
        p.save()
        data = {"type_event": "sale_complete", "ref_command": p.reference, "item_price": str(int(p.amount)),
                "api_key_sha256": hashlib.sha256(b"pk").hexdigest(), "api_secret_sha256": hashlib.sha256(b"nope").hexdigest()}
        self.assertEqual(self.client.post("/api/payments/webhooks/paytech/", data).status_code, 401)
        data["api_secret_sha256"] = hashlib.sha256(b"ps").hexdigest()
        self.client.post("/api/payments/webhooks/paytech/", data)
        p.refresh_from_db()
        self.assertEqual(p.status, "success")


class DeliveryTest(Base):
    def test_full_flow_with_cash(self):
        self.add(self.robe, 2)
        self.checkout("deposit", True)
        order = Order.objects.get()
        order.payments.get().confirm()
        order.refresh_from_db()
        driver = User.objects.create_user(email="moussa@example.com", username="moussa", password="Sup3r-secret!")
        courier_api = APIClient()
        courier_api.force_authenticate(driver)
        self.assertEqual(courier_api.post("/api/courier/apply/", {"phone": "770000000", "vehicle": "moto", "zones": "Tivaouane", "accept_terms": True}, format="json").status_code, 201)
        self.assertEqual(courier_api.get("/api/courier/dashboard/").status_code, 404)  # pas encore validé
        c = CourierProfile.objects.get()
        c.status = "approved"
        c.save()
        courier_api.force_authenticate(User.objects.get(pk=driver.pk))  # comme une vraie nouvelle requête
        courier_api.post("/api/courier/availability/", {"is_available": True}, format="json")
        courier_api.post("/api/courier/location/", {"lat": "14.95", "lng": "-16.82"}, format="json")
        order.status = "ready"
        order.save()
        d = dsvc.dispatch(order)
        self.assertEqual((d.status, d.courier_id, d.cash_to_collect), ("offered", c.pk, Decimal("29000")))
        dash = courier_api.get("/api/courier/dashboard/").data
        self.assertIsNone(dash["offers"][0]["customer"])  # adresse cachée avant acceptation
        for act in ("accept", "picked_up"):
            self.assertEqual(courier_api.post(f"/api/courier/deliveries/{d.pk}/{act}/").status_code, 200)
        t = self.api.get(f"/api/tracking/{order.pk}/").data
        self.assertEqual(t["courier"]["name"], "moussa")
        self.assertIn("eta_min", t["courier"])
        self.assertEqual(self.client.get(t["map_url"].replace("http://localhost:8000", "")).status_code, 200)
        courier_api.post(f"/api/courier/deliveries/{d.pk}/delivered/", {"cash_collected": "29000"}, format="json")
        order.refresh_from_db()
        self.assertEqual((order.status, order.amount_due), ("delivered", Decimal("0")))


@override_settings(**FAST)
class AuthTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_register_login_reset(self):
        api = APIClient()
        r = api.post("/api/auth/register/", {"email": "Fatou@Example.com", "password": "Tr3s-solide-2026", "first_name": "Fatou"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn("access", r.data)
        self.assertTrue(any("Confirmez" in m.subject for m in mail.outbox))
        self.assertEqual(api.post("/api/auth/register/", {"email": "fatou@example.com", "password": "Tr3s-solide-2026", "first_name": "F"}, format="json").status_code, 400)
        r = api.post("/api/auth/login/", {"email": "FATOU@example.com", "password": "Tr3s-solide-2026"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(api.post("/api/auth/login/", {"email": "fatou@example.com", "password": "faux"}, format="json").status_code, 401)
        mail.outbox.clear()
        api.post("/api/auth/password/reset/", {"email": "fatou@example.com"}, format="json")
        code = mail.outbox[0].subject.split(":")[-1].strip()
        self.assertEqual(api.post("/api/auth/password/reset/confirm/", {"email": "fatou@example.com", "code": "000000", "new_password": "Nouveau-mdp-2026"}, format="json").status_code, 400)
        r = api.post("/api/auth/password/reset/confirm/", {"email": "fatou@example.com", "code": code, "new_password": "Nouveau-mdp-2026"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(api.post("/api/auth/login/", {"email": "fatou@example.com", "password": "Nouveau-mdp-2026"}, format="json").status_code, 200)

    def test_promotions_only_for_logged_in(self):
        self.assertEqual(APIClient().get("/api/promotions/").status_code, 401)


class PublicTest(Base):
    def test_public_endpoints(self):
        anon = APIClient()
        for url in ["/api/products/", "/api/products/?search=robe", "/api/products/?category=robes-test",
                    f"/api/products/{self.robe.slug}/", "/api/categories/", "/api/config/", "/api/delivery-zones/", "/healthz/", "/"]:
            self.assertEqual(anon.get(url).status_code, 200, url)
