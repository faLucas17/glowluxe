from django.urls import path

from . import views

urlpatterns = [
    path("paiement/retour/<str:ref>/", views.payment_return, name="payment-return"),
    path("paiement/annule/<str:ref>/", views.payment_cancel, name="payment-cancel"),
    path("paiement/manuel/<str:ref>/", views.payment_manual, name="payment-manual"),
    path("paiement/simulateur/<str:ref>/", views.payment_simulator, name="payment-simulator"),
]
