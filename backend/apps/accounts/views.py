from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.emails import send_email

from .models import Address, OneTimeCode
from .serializers import (
    AddressSerializer,
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .tokens import make_verify_token

User = get_user_model()


class AuthThrottle(ScopedRateThrottle):
    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class EmailThrottle(AuthThrottle):
    scope = "email"


def send_verification(user):
    url = settings.SITE_URL + reverse("verify-email", args=[make_verify_token(user)])
    send_email("verify_email", "Confirmez votre adresse email - GlowLuxe", user.email, {"user": user, "verify_url": url})


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token), "user": UserSerializer(user).data}


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification(user)
        # Connecté directement après l'inscription
        return Response(tokens_for(user), status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthThrottle]


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data.get("refresh", "")).blacklist()
        except TokenError:
            pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ResendVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [EmailThrottle]

    def post(self, request):
        if not request.user.email_verified:
            send_verification(request.user)
        return Response({"detail": f"Email de confirmation envoyé à {request.user.email}."})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        s = ChangePasswordSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        request.user.set_password(s.validated_data["new_password"])
        request.user.save()
        return Response(tokens_for(request.user))


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailThrottle]

    def post(self, request):
        s = PasswordResetRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=s.validated_data["email"], is_active=True).first()
        if user:
            code = OneTimeCode.issue(user, "password_reset")
            send_email("password_reset_code", f"Votre code GlowLuxe : {code}", user.email, {"user": user, "code": code})
        # Même réponse que le compte existe ou non (on ne révèle pas les emails inscrits)
        return Response({"detail": "Si un compte existe avec cet email, un code à 6 chiffres vient d'être envoyé."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        user = User.objects.filter(email__iexact=d["email"], is_active=True).first()
        if not user or not OneTimeCode.verify(user, "password_reset", d["code"]):
            return Response({"detail": "Code invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        try:
            validate_password(d["new_password"], user)
        except ValidationError as e:
            return Response({"new_password": e.messages}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(d["new_password"])
        user.email_verified = True  # il a prouvé qu'il reçoit les emails
        user.save()
        return Response(tokens_for(user))


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        first = not Address.objects.filter(user=self.request.user).exists()
        address = serializer.save(user=self.request.user, is_default=serializer.validated_data.get("is_default") or first)
        if address.is_default:
            Address.objects.filter(user=self.request.user).exclude(pk=address.pk).update(is_default=False)

    def perform_update(self, serializer):
        address = serializer.save()
        if address.is_default:
            Address.objects.filter(user=self.request.user).exclude(pk=address.pk).update(is_default=False)
