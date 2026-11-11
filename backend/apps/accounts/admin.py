from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Address, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "username", "first_name", "phone_number", "email_verified", "newsletter", "is_staff"]
    list_filter = ["email_verified", "newsletter", "is_staff"]
    search_fields = ["email", "username", "first_name", "last_name", "phone_number"]
    ordering = ["-created_at"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("GlowLuxe", {"fields": ("phone_number", "is_seller_admin", "email_verified", "newsletter")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "username", "password1", "password2")}),)


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["full_name", "user", "city", "country", "is_default"]
    search_fields = ["full_name", "user__email", "city"]
