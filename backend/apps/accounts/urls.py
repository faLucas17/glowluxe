from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()
router.register("addresses", views.AddressViewSet, basename="address")

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="login-refresh"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("verify-email/resend/", views.ResendVerificationView.as_view(), name="verify-email-resend"),
    path("password/change/", views.ChangePasswordView.as_view(), name="password-change"),
    path("password/reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
] + router.urls
