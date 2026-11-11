import uuid

from django.db import migrations

# (slug, nom, public, parent, icône, ordre) - les catégories existantes ne sont jamais modifiées
NEW = [
    ("crochet-fait-main", "Crochet fait main", "unisex", None, "color-palette", 1),
    ("crochet-vetements", "Vêtements en crochet", "women", "crochet-fait-main", "shirt", 1),
    ("crochet-sacs", "Sacs en crochet", "women", "crochet-fait-main", "bag-handle", 2),
    ("crochet-accessoires", "Bonnets, écharpes & accessoires crochet", "unisex", "crochet-fait-main", "sparkles", 3),
    ("crochet-bebe-enfant", "Crochet bébé & enfant", "kids", "crochet-fait-main", "happy", 4),
    ("tenues-traditionnelles", "Tenues traditionnelles", "unisex", None, "ribbon", 5),
    ("bijoux", "Bijoux", "women", None, "diamond", 6),
    ("enfant", "Enfant", "kids", None, "happy", 7),
]


def create(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    for slug, name, gender, parent, icon, pos in NEW:
        if Category.objects.filter(slug=slug).exists() or Category.objects.filter(name__iexact=name).exists():
            continue
        Category.objects.create(
            id=uuid.uuid4(), slug=slug, name=name, gender=gender, icon=icon, position=pos, is_active=True,
            parent=Category.objects.filter(slug=parent).first() if parent else None,
        )


class Migration(migrations.Migration):
    dependencies = [("catalog", "0002_alter_category_options_alter_productimage_options_and_more")]
    operations = [migrations.RunPython(create, migrations.RunPython.noop)]
