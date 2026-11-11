from django.urls import include, path

from . import views

urlpatterns = [
    path("", views.landing, name="landing"),
    path("compte/verifier-email/<str:token>/", views.verify_email, name="verify-email"),
    path("compte/desinscription/<str:token>/", views.unsubscribe, name="unsubscribe"),
    path("suivi/<str:token>/", views.tracking_map, name="tracking-map"),
    path("suivi/<str:token>/donnees/", views.tracking_map_data, name="tracking-map-data"),
    path("", include("apps.payments.web_urls")),
]
