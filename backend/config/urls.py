from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.core import views as core_views

admin.site.site_header = "GlowLuxe By Sofa - Administration"
admin.site.site_title = "GlowLuxe"
admin.site.index_title = "Gestion de la boutique"

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("healthz/", core_views.healthz, name="healthz"),
    path("api/", core_views.api_root, name="api-root"),
    path("api/config/", core_views.app_config, name="app-config"),
    path("api/promotions/", core_views.PromotionListView.as_view(), name="promotions"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.cart.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.shipping.urls")),
    path("api/payments/", include("apps.payments.urls")),
    # Pages web (retour de paiement, carte de suivi, liens des emails)
    path("", include("apps.core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
