"""
Recrée le catalogue de backend/seed/ en production (exécuté par build.sh).
- Une seule fois (ensuite vos modifications dans l'admin sont respectées).
- Ne remplace jamais un article existant (même slug ou même SKU).
- Les photos partent sur Cloudinary.
Forcer : python manage.py import_catalogue --force
"""

import json
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Category, Product, ProductImage, ProductVariant
from apps.core.models import DataImport

NAME = "catalogue-initial"


class Command(BaseCommand):
    help = "Importe backend/seed/catalogue.json (une seule fois)."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **opts):
        seed = Path(settings.BASE_DIR) / "seed"
        path = seed / "catalogue.json"
        if not path.exists():
            self.stdout.write("Pas de seed/catalogue.json : rien à importer.")
            return
        if DataImport.objects.filter(name=NAME).exists() and not opts["force"]:
            self.stdout.write("Catalogue déjà importé : rien à faire.")
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        nc = np = 0

        def attach(field, rel):
            f = seed / "media" / rel
            if rel and f.exists():
                with open(f, "rb") as fh:
                    field.save(Path(rel).name, File(fh), save=False)

        with transaction.atomic():
            for c in data["categories"]:
                cat, created = Category.objects.get_or_create(slug=c["slug"], defaults={
                    "name": c["name"], "gender": c["gender"], "icon": c.get("icon", ""),
                    "position": c.get("position", 0), "is_active": c.get("is_active", True),
                    "parent": Category.objects.filter(slug=c.get("parent")).first() if c.get("parent") else None,
                })
                nc += created
                if c.get("image") and not cat.image:
                    attach(cat.image, c["image"])
                    cat.save()
            for p in data["products"]:
                if Product.objects.filter(slug=p["slug"]).exists() or Product.objects.filter(sku=p["sku"]).exists():
                    continue
                prod = Product.objects.create(
                    slug=p["slug"], name=p["name"], category=Category.objects.get(slug=p["category"]),
                    description=p.get("description", ""), gender=p.get("gender", "unisex"), price=Decimal(p["price"]),
                    compare_at_price=Decimal(p["compare_at_price"]) if p.get("compare_at_price") else None,
                    sku=p["sku"], stock_quantity=p.get("stock_quantity", 0), material=p.get("material", ""),
                    is_handmade=p.get("is_handmade", False), made_to_order=p.get("made_to_order", False),
                    production_days=p.get("production_days", 0), is_featured=p.get("is_featured", False),
                    is_active=p.get("is_active", True),
                )
                np += 1
                for img in p.get("images", []):
                    if not img.get("file"):
                        continue
                    pi = ProductImage(product=prod, alt_text=img.get("alt_text", "")[:150],
                                      is_primary=img.get("is_primary", False), position=img.get("position", 0))
                    attach(pi.image, img["file"])
                    pi.save()
                for v in p.get("variants", []):
                    ProductVariant.objects.create(
                        product=prod, size=v.get("size", ""), color=v.get("color", ""), color_hex=v.get("color_hex", ""),
                        stock_quantity=v.get("stock_quantity", 0), extra_price=Decimal(v.get("extra_price", "0")),
                    )
            DataImport.objects.update_or_create(name=NAME, defaults={"details": f"{nc} catégories, {np} articles"})
        self.stdout.write(self.style.SUCCESS(f"Import : {nc} catégorie(s), {np} article(s)."))
