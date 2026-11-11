from decimal import Decimal, InvalidOperation

from django import template

register = template.Library()


@register.filter
def fcfa(value):
    """12500.00 -> '12.500 F CFA' (même format que l'appli)"""
    try:
        amount = int(Decimal(value).quantize(Decimal("1")))
    except (InvalidOperation, TypeError, ValueError):
        return value
    return f"{amount:,}".replace(",", ".") + " F CFA"
