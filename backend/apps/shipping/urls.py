from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("shipments", views.ShipmentViewSet, basename="shipment")
router.register("courier", views.CourierViewSet, basename="courier")

urlpatterns = [
    path("delivery-zones/", views.zones, name="delivery-zones"),
    path("tracking/<uuid:order_id>/", views.TrackingView.as_view(), name="tracking"),
] + router.urls
