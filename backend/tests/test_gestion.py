"""Espace de gestion : accès réservé, commandes, paiements manuels, catalogue, livreurs, réglages."""
import io
from decimal import Decimal

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.catalog.models import Product
from apps.core.models import Promotion
from apps.orders.models import Order
from apps.shipping.models import CourierProfile

from .test_api import Base, User


def png():
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), (200, 150, 100)).save(buf, "PNG")
    return SimpleUploadedFile("photo.png", buf.getvalue(), content_type="image/png")


class GestionTest(Base):
    def setUp(self):
        super().setUp()
        self.boss = User.objects.create_user(email="sofa@example.com", username="sofa", password="Sup3r-secret!", is_staff=True)
        self.g = APIClient()
        self.g.force_authenticate(self.boss)

    def make_order(self):
        self.add(self.robe)
        self.assertEqual(self.checkout(method="wave").status_code, 201)
        return Order.objects.get()

    def test_reserved_to_staff(self):
        self.assertEqual(self.api.get("/api/gestion/tableau-de-bord/").status_code, 403)
        self.assertEqual(APIClient().get("/api/gestion/commandes/").status_code, 401)
        r = self.g.get("/api/gestion/tableau-de-bord/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["week"]), 7)
        self.assertTrue(self.g.get("/api/auth/me/").data["is_staff"])

    def test_order_flow(self):
        order = self.make_order()
        r = self.g.get("/api/gestion/commandes/?status=pending")
        self.assertEqual(r.data["count"], 1)
        # statut impossible
        self.assertEqual(self.g.post(f"/api/gestion/commandes/{order.pk}/status/", {"status": "delivered"}, format="json").status_code, 400)
        # paiement reçu sur WhatsApp
        self.assertEqual(self.g.post(f"/api/gestion/commandes/{order.pk}/payment/", {"amount": 999999}, format="json").status_code, 400)
        r = self.g.post(f"/api/gestion/commandes/{order.pk}/payment/", {"amount": 21000, "method": "manual"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        self.assertEqual(order.status, "paid")
        self.assertEqual(order.amount_paid, Decimal("21000"))
        self.assertEqual(Product.objects.get(pk=self.robe.pk).stock_quantity, 4)
        self.assertTrue(any("confirmée" in m.subject for m in mail.outbox))
        # prête : recherche d'un livreur
        r = self.g.post(f"/api/gestion/commandes/{order.pk}/status/", {"status": "ready"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["order"]["delivery"]["status"], "searching")
        self.assertEqual(self.g.post(f"/api/gestion/commandes/{order.pk}/relaunch/").status_code, 200)
        # annulation : stock remis
        r = self.g.post(f"/api/gestion/commandes/{order.pk}/status/", {"status": "cancelled"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Product.objects.get(pk=self.robe.pk).stock_quantity, 5)
        self.assertEqual(self.g.patch(f"/api/gestion/commandes/{order.pk}/", {"notes": "Appeler avant"}, format="json").data["notes"], "Appeler avant")

    def test_products(self):
        r = self.g.post("/api/gestion/articles/", {
            "name": "Sac crochet", "category": str(self.cat.pk), "price": "18000", "stock_quantity": 3,
            "is_handmade": True, "variants": [{"color": "Rouge", "stock_quantity": 2}]}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        pid = r.data["id"]
        self.assertTrue(r.data["sku"].startswith("GL-"))
        self.assertEqual(len(r.data["variants"]), 1)
        self.assertEqual(self.g.patch(f"/api/gestion/articles/{pid}/", {"price": "15000", "compare_at_price": "10000"}, format="json").status_code, 400)
        r = self.g.post(f"/api/gestion/articles/{pid}/images/", {"image": [png(), png()]}, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(len(r.data["images"]), 2)
        first, second = r.data["images"]
        self.assertTrue(first["is_primary"])
        r = self.g.patch(f"/api/gestion/articles/{pid}/images/{second['id']}/", {"is_primary": True}, format="json")
        self.assertTrue(next(i for i in r.data["images"] if i["id"] == second["id"])["is_primary"])
        r = self.g.delete(f"/api/gestion/articles/{pid}/images/{second['id']}/")
        self.assertTrue(r.data["images"][0]["is_primary"])
        self.assertEqual(self.g.patch(f"/api/gestion/articles/{pid}/", {"variants": []}, format="json").data["variants"], [])
        self.assertEqual(self.g.delete(f"/api/gestion/articles/{pid}/").status_code, 200)
        # article déjà commandé : masqué, pas supprimé
        self.make_order()
        r = self.g.delete(f"/api/gestion/articles/{self.robe.pk}/")
        self.assertTrue(r.data.get("hidden"))
        self.assertFalse(Product.objects.get(pk=self.robe.pk).is_active)

    def test_categories_clients_couriers_settings(self):
        self.assertEqual(self.g.delete(f"/api/gestion/categories/{self.cat.pk}/").status_code, 400)
        r = self.g.post("/api/gestion/categories/", {"name": "Bijoux test"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.g.patch(f"/api/gestion/categories/{r.data['id']}/", {"parent": r.data["id"]}, format="json").status_code, 400)
        r = self.g.get("/api/gestion/clientes/?search=awa")
        self.assertEqual(r.data["count"], 1)
        r = self.g.post(f"/api/gestion/clientes/{self.user.pk}/access/", {"what": "block"}, format="json")
        self.assertFalse(r.data["is_active"])
        self.assertEqual(self.g.post(f"/api/gestion/clientes/{self.boss.pk}/access/", {"what": "block"}, format="json").status_code, 400)
        c = CourierProfile.objects.create(user=self.user, phone="770000000", zones="Tivaouane")
        r = self.g.post(f"/api/gestion/livreurs/{c.pk}/decision/", {"what": "approve"}, format="json")
        self.assertEqual(r.data["courier"]["status"], "approved")
        r = self.g.patch("/api/gestion/reglages/", {"deposit_percent": 40}, format="json")
        self.assertEqual(r.data["deposit_percent"], 40)
        self.assertEqual(self.g.patch("/api/gestion/reglages/", {"deposit_percent": 5}, format="json").status_code, 400)
        r = self.g.post("/api/gestion/zones/", {"name": "Mbour", "fee": 2500}, format="json")
        self.assertEqual(r.status_code, 201)

    def test_promotion_email(self):
        p = Promotion.objects.create(title="Tabaski", message="-20 %")
        self.assertEqual(self.g.post(f"/api/gestion/promotions/{p.pk}/send/").status_code, 400)  # personne d'inscrit
        self.user.email_verified = True
        self.user.save()
        r = self.g.post(f"/api/gestion/promotions/{p.pk}/send/")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["promotion"]["emailed_count"], 1)
