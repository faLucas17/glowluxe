"""Crée l'admin au 1er déploiement (variables DJANGO_SUPERUSER_EMAIL / _PASSWORD). Ne touche jamais un compte existant."""

from decouple import config
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **opts):
        email = config("DJANGO_SUPERUSER_EMAIL", default="")
        password = config("DJANGO_SUPERUSER_PASSWORD", default="")
        if not email or not password:
            self.stdout.write("Pas de DJANGO_SUPERUSER_* : étape ignorée.")
            return
        User = get_user_model()
        if User.objects.filter(email__iexact=email).exists():
            self.stdout.write("Administrateur déjà présent.")
            return
        User.objects.create_superuser(email=email, username=email.split("@")[0], password=password)
        self.stdout.write(self.style.SUCCESS(f"Administrateur {email} créé."))
