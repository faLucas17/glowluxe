from django.db import migrations

PAID = ("paid", "processing", "shipped", "in_transit", "out_for_delivery", "delivered")


def backfill(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    for o in Order.objects.select_related("shipping_address"):
        a = o.shipping_address
        if not o.address_snapshot and a:
            o.address_snapshot = {
                "full_name": a.full_name, "phone": a.phone_number,
                "line": ", ".join(x for x in [a.street_address, a.city, a.country] if x),
                "lat": None, "lng": None,
            }
        if o.status in PAID and o.amount_paid == 0:
            o.amount_paid = o.total
            o.confirmation_sent = True
            o.stock_committed = True
        o.save()


class Migration(migrations.Migration):
    dependencies = [("orders", "0003_order_delivery_zone_order_deposit_amount_and_more")]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
