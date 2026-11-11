from django.core.management.base import BaseCommand

from apps.catalog.models import Category, Product


class Command(BaseCommand):
    help = "Crée des catégories et produits de démonstration GlowLuxe."

    def handle(self, *args, **options):
        categories = [
            ("Vêtements Femme", "women"),
            ("Vêtements Homme", "men"),
            ("Chaussures", "unisex"),
            ("Accessoires", "unisex"),
            ("Voiles & Hijabs", "women"),
            ("Sacs & Maroquinerie", "women"),
            ("Crochet fait main", "unisex"),
            ("Bijoux", "women"),
            ("Enfant", "kids"),
        ]
        created_categories = {}
        for name, gender in categories:
            cat, _ = Category.objects.get_or_create(name=name, defaults={"gender": gender})
            created_categories[name] = cat

        demo_products = [
            ("Blazer Beige Élégant", "Vêtements Femme", "women", 45000, 55000),
            ("Ensemble Tailleur Blanc", "Vêtements Femme", "women", 60000, None),
            ("Costume Noir Classique", "Vêtements Homme", "men", 75000, 90000),
            ("Sneakers Blanches Premium", "Chaussures", "unisex", 35000, None),
            ("Lunettes de Soleil Dorées", "Accessoires", "unisex", 20000, 25000),
            ("Sac à Main Matelassé Noir", "Sacs & Maroquinerie", "women", 55000, None),
            ("Voile Soie Beige", "Voiles & Hijabs", "women", 15000, None),
            ("Boucles d'Oreilles Créoles Or", "Accessoires", "women", 12000, None),
            ("Top Crochet Fait Main", "Crochet fait main", "women", 18000, None),
        ]
        for i, (name, cat_name, gender, price, compare) in enumerate(demo_products):
            Product.objects.get_or_create(
                name=name,
                defaults={
                    "category": created_categories[cat_name],
                    "gender": gender,
                    "price": price,
                    "compare_at_price": compare,
                    "sku": f"GL-{1000 + i}",
                    "stock_quantity": 25,
                    "is_featured": i % 2 == 0,
                    "is_handmade": cat_name == "Crochet fait main",
                    "made_to_order": cat_name == "Crochet fait main",
                    "production_days": 7 if cat_name == "Crochet fait main" else 0,
                    "description": (
                        f"{name} - pièce sélectionnée avec soin par GlowLuxe By Sofa. "
                        "Matière noble, finition premium, style intemporel."
                    ),
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f"{len(created_categories)} catégories et {len(demo_products)} produits créés. "
            "Va maintenant dans /admin/ pour ajouter les photos de chaque article."
        ))
