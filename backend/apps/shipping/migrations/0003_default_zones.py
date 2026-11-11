from decimal import Decimal

from django.db import migrations

ZONES = [
    ("Tivaouane", "1000", "Le jour même ou 24 h"),
    ("Thiès", "2000", "24 h"),
    ("Dakar et banlieue", "3000", "24 à 48 h"),
    ("Autres régions du Sénégal", "5000", "48 à 72 h"),
]


def create(apps, schema_editor):
    Zone = apps.get_model("shipping", "DeliveryZone")
    if Zone.objects.exists():
        return
    for i, (name, fee, eta) in enumerate(ZONES):
        Zone.objects.create(name=name, fee=Decimal(fee), estimated_time=eta, position=i)


class Migration(migrations.Migration):
    dependencies = [("shipping", "0002_deliveryzone_courierprofile_delivery")]
    operations = [migrations.RunPython(create, migrations.RunPython.noop)]
