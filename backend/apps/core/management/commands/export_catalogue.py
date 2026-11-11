"""
À lancer SUR TON PC (là où sont tes vrais articles et photos) :

    python manage.py export_catalogue

Crée backend/seed/catalogue.json + backend/seed/media/ (copie des photos).
Ces fichiers sont committés sur GitHub ; au déploiement, `import_catalogue`
les recrée sur la base de production et envoie les photos sur Cloudinary.
"""

import json
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.catalog.models import Category, Product


class Command(BaseCommand):
    help = "Exporte catégories, articles, variantes et photos vers backend/seed/."

    def handle(self, *args, **opts):
        seed = Path(settings.BASE_DIR) / "seed"
        media_out = seed / "media"
        media_out.mkdir(parents=True, exist_ok=True)

        def copy(field):
            if not field:
                return None
            try:
                src = Path(field.path)
            except NotImplementedError:  # stockage distant : rien à copier
                return None
            if not src.exists():
                self.stdout.write(self.style.WARNING(f"Photo introuvable : {src}"))
                return None
            dst = media_out / field.name
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            return field.name

        cats = []
        # parents d'abord pour pouvoir les recréer dans l'ordre
        for c in sorted(Category.objects.all(), key=lambda c: c.parent_id is not None):
            cats.append({
                "slug": c.slug, "name": c.name, "parent": c.parent.slug if c.parent else None,
                "gender": c.gender, "icon": c.icon, "position": c.position, "is_active": c.is_active,
                "image": copy(c.image),
            })
        prods = []
        for p in Product.objects.select_related("category").prefetch_related("images", "variants"):
            prods.append({
                "slug": p.slug, "name": p.name, "category": p.category.slug, "description": p.description,
                "gender": p.gender, "price": str(p.price),
                "compare_at_price": str(p.compare_at_price) if p.compare_at_price else None,
                "sku": p.sku, "stock_quantity": p.stock_quantity, "material": p.material,
                "is_handmade": p.is_handmade, "made_to_order": p.made_to_order, "production_days": p.production_days,
                "is_featured": p.is_featured, "is_active": p.is_active,
                "images": [{"file": copy(i.image), "alt_text": i.alt_text, "is_primary": i.is_primary, "position": i.position}
                           for i in p.images.all()],
                "variants": [{"size": v.size, "color": v.color, "color_hex": v.color_hex,
                              "stock_quantity": v.stock_quantity, "extra_price": str(v.extra_price)} for v in p.variants.all()],
            })
        (seed / "catalogue.json").write_text(json.dumps({"categories": cats, "products": prods}, ensure_ascii=False, indent=2), encoding="utf-8")
        n_img = sum(len(p["images"]) for p in prods)
        self.stdout.write(self.style.SUCCESS(f"Exporté : {len(cats)} catégories, {len(prods)} articles, {n_img} photos -> {seed}"))
