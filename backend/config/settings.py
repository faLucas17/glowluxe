"""
Configuration Django de l'API GlowLuxe.

Toutes les valeurs sensibles viennent des variables d'environnement
(fichier backend/.env en local, onglet "Environment" sur Render).
Voir backend/.env.example pour la liste complète.
"""

from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# ─────────────────────────────────────────────
# Sécurité
# ─────────────────────────────────────────────
DEBUG = config("DEBUG", default=False, cast=bool)  # désactivé par défaut

SECRET_KEY = config("SECRET_KEY", default="")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-insecure-key-never-use-in-production-0123456789"
    else:
        raise ImproperlyConfigured("SECRET_KEY doit être défini en production.")

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())
RENDER_HOST = config("RENDER_EXTERNAL_HOSTNAME", default="")
if RENDER_HOST:
    ALLOWED_HOSTS.append(RENDER_HOST)
if DEBUG:
    # En local, le téléphone joint le PC par son IP Wi-Fi (qui change souvent) ou par ngrok
    ALLOWED_HOSTS = ["*"]

CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())
if RENDER_HOST:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_HOST}")

# URL publique de l'API (emails, pages de paiement, webhooks)
SITE_URL = config("SITE_URL", default=f"https://{RENDER_HOST}" if RENDER_HOST else "http://localhost:8000").rstrip("/")
# URL publique de la version web de l'appli (Cloudflare Pages), utilisée dans les emails
APP_URL = config("APP_URL", default=SITE_URL).rstrip("/")

ADMIN_URL = config("ADMIN_URL", default="admin/")

# ─────────────────────────────────────────────
# Applications
# ─────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "anymail",
    # GlowLuxe
    "apps.core",
    "apps.accounts",
    "apps.catalog",
    "apps.cart",
    "apps.orders",
    "apps.shipping",
    "apps.payments",
]

USE_CLOUDINARY = bool(config("CLOUDINARY_URL", default=""))
if USE_CLOUDINARY:
    INSTALLED_APPS += ["cloudinary_storage", "cloudinary"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ─────────────────────────────────────────────
# Base de données : PostgreSQL en production (DATABASE_URL), SQLite en local
# ─────────────────────────────────────────────
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        conn_health_checks=True,
    )
}

AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["apps.accounts.backends.EmailBackend"]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = config("TIME_ZONE", default="Africa/Dakar")
USE_I18N = True
USE_TZ = True

# ─────────────────────────────────────────────
# Fichiers statiques et images
# ─────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Sans Cloudinary, Render efface les images à chaque déploiement.
STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"
        if USE_CLOUDINARY
        else "django.core.files.storage.FileSystemStorage"
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
        if not DEBUG
        else "django.contrib.staticfiles.storage.StaticFilesStorage"
    },
}
if not DEBUG and not USE_CLOUDINARY and not config("ALLOW_LOCAL_MEDIA", default=False, cast=bool):
    raise ImproperlyConfigured("CLOUDINARY_URL est obligatoire en production (sinon les photos seront perdues).")

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "glowluxe"}}

# ─────────────────────────────────────────────
# API REST
# ─────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser", "rest_framework.parsers.MultiPartParser"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"]
    + (["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
    # Limites anti-abus (essais de mots de passe, spam d'inscriptions…)
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/min",
        "user": "600/min",
        "auth": "10/min",
        "email": "5/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=60),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS : l'appli mobile n'en a pas besoin ; la version web (Cloudflare Pages) oui.
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())
CORS_ALLOW_ALL_ORIGINS = DEBUG

# ─────────────────────────────────────────────
# Emails : Brevo par API HTTPS (Render gratuit bloque les ports SMTP)
# ─────────────────────────────────────────────
if config("BREVO_API_KEY", default=""):
    EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
    ANYMAIL = {"BREVO_API_KEY": config("BREVO_API_KEY")}
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"  # emails affichés dans le terminal
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="GlowLuxe By Sofa <no-reply@glowluxe.sn>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL
SHOP_NOTIFICATION_EMAIL = config("SHOP_NOTIFICATION_EMAIL", default="")
EMAIL_ASYNC = config("EMAIL_ASYNC", default=True, cast=bool)

# ─────────────────────────────────────────────
# Paiements
# ─────────────────────────────────────────────
PAYMENT_TEST_MODE = config("PAYMENT_TEST_MODE", default=False, cast=bool)  # simulateur (DEBUG uniquement)
WAVE_API_KEY = config("WAVE_API_KEY", default="")
WAVE_WEBHOOK_SECRET = config("WAVE_WEBHOOK_SECRET", default="")
WAVE_SIGNING_SECRET = config("WAVE_SIGNING_SECRET", default="")
# PayTech : Wave + Orange Money + Free Money + carte bancaire en une seule intégration
PAYTECH_API_KEY = config("PAYTECH_API_KEY", default="")
PAYTECH_API_SECRET = config("PAYTECH_API_SECRET", default="")
PAYTECH_ENV = config("PAYTECH_ENV", default="test")
SHOP_WHATSAPP = config("SHOP_WHATSAPP", default="221778228460")

# ─────────────────────────────────────────────
# HTTPS en production (Render / Cloudflare)
# ─────────────────────────────────────────────
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SECURE_REDIRECT_EXEMPT = [r"^healthz/$"]
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"  # seule la carte de suivi est intégrable (exception dans la vue)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"django": {"handlers": ["console"], "level": "WARNING", "propagate": False}},
}
