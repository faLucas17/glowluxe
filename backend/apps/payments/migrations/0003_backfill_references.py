import secrets

from django.db import migrations


def fill(apps, schema_editor):
    Payment = apps.get_model("payments", "Payment")
    for p in Payment.objects.filter(reference__isnull=True):
        p.reference = "GLP-" + secrets.token_hex(8).upper()
        p.gateway = p.gateway or ("simulation" if (p.provider_reference or "").startswith("SIMULATED") else p.method)
        p.save(update_fields=["reference", "gateway"])


class Migration(migrations.Migration):
    dependencies = [("payments", "0002_alter_payment_options_payment_checkout_url_and_more")]
    operations = [migrations.RunPython(fill, migrations.RunPython.noop)]
