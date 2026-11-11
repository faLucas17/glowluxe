import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Address

User = get_user_model()
PHONE_RE = re.compile(r"^\+?[0-9 ]{9,16}$")


def clean_phone(value):
    value = (value or "").strip()
    if value and not PHONE_RE.match(value):
        raise serializers.ValidationError("Numéro invalide (ex : 77 123 45 67).")
    return value


class UserSerializer(serializers.ModelSerializer):
    is_courier = serializers.SerializerMethodField()
    courier_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "first_name", "last_name", "phone_number",
            "email_verified", "newsletter", "is_courier", "courier_status",
        ]
        read_only_fields = ["id", "email", "email_verified", "is_courier", "courier_status"]

    def get_is_courier(self, obj):
        c = getattr(obj, "courier_profile", None)
        return bool(c and c.status == "approved")

    def get_courier_status(self, obj):
        c = getattr(obj, "courier_profile", None)
        return c.status if c else None

    def validate_phone_number(self, value):
        return clean_phone(value)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    newsletter = serializers.BooleanField(default=True)

    class Meta:
        model = User
        fields = ["email", "username", "password", "first_name", "last_name", "phone_number", "newsletter"]
        extra_kwargs = {"first_name": {"required": True}, "username": {"required": False}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value

    def validate_phone_number(self, value):
        return clean_phone(value)

    def validate(self, attrs):
        username = (attrs.get("username") or attrs["email"].split("@")[0])[:140]
        base, n = username, 1
        while User.objects.filter(username=username).exists():
            n += 1
            username = f"{base}{n}"
        attrs["username"] = username
        validate_password(attrs["password"], User(email=attrs["email"], username=username, first_name=attrs.get("first_name", "")))
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {"no_active_account": "Email ou mot de passe incorrect."}

    def validate(self, attrs):
        attrs[self.username_field] = (attrs.get(self.username_field) or "").strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": "Mot de passe actuel incorrect."})
        validate_password(attrs["new_password"], user)
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8)


class AddressSerializer(serializers.ModelSerializer):
    one_line = serializers.CharField(read_only=True)

    class Meta:
        model = Address
        fields = [
            "id", "full_name", "phone_number", "country", "city", "street_address", "landmark",
            "postal_code", "latitude", "longitude", "is_default", "one_line", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_phone_number(self, value):
        value = clean_phone(value)
        if not value:
            raise serializers.ValidationError("Le téléphone est obligatoire pour la livraison.")
        return value
