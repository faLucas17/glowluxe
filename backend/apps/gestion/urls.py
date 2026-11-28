from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("commandes", views.OrderViewSet, basename="g-orders")
router.register("paiements", views.PaymentViewSet, basename="g-payments")
router.register("articles", views.ProductViewSet, basename="g-products")
router.register("categories", views.CategoryViewSet, basename="g-categories")
router.register("avis", views.ReviewViewSet, basename="g-reviews")
router.register("clientes", views.ClientViewSet, basename="g-clients")
router.register("livreurs", views.CourierViewSet, basename="g-couriers")
router.register("zones", views.ZoneViewSet, basename="g-zones")
router.register("promotions", views.PromotionViewSet, basename="g-promotions")

urlpatterns = [
    path("tableau-de-bord/", views.dashboard, name="g-dashboard"),
    path("reglages/", views.shop_settings, name="g-settings"),
    path("emails/", views.email_check, name="g-emails"),
] + router.urls
