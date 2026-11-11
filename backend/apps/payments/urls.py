from django.urls import path

from . import views

urlpatterns = [
    path("methods/", views.payment_methods, name="payment-methods"),
    path("<str:ref>/status/", views.payment_status, name="payment-status"),
    path("webhooks/wave/", views.wave_webhook, name="payment-wave-webhook"),
    path("webhooks/paytech/", views.paytech_ipn, name="payment-paytech-ipn"),
]
