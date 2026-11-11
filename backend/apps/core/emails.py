"""Envoi des emails (Brevo en production, terminal en local). Gabarits : templates/emails/<nom>.html"""

import logging
import re
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def build_email(template, subject, to, context=None):
    from .models import ShopSettings

    ctx = {"site_url": settings.SITE_URL, "app_url": settings.APP_URL, "shop": ShopSettings.load()}
    ctx.update(context or {})
    html = render_to_string(f"emails/{template}.html", ctx)
    # version texte : les liens restent visibles
    text = strip_tags(re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', r"\2 : \1", html, flags=re.S))
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [to] if isinstance(to, str) else list(to))
    msg.attach_alternative(html, "text/html")
    return msg


def _send(messages):
    try:
        get_connection().send_messages(messages)
    except Exception:  # un email raté ne doit jamais bloquer une commande
        logger.exception("Échec d'envoi d'email")


def send_email(template, subject, to, context=None):
    if not to:
        return
    try:
        msg = build_email(template, subject, to, context)
    except Exception:
        logger.exception("Email %s non préparé", template)
        return
    if settings.EMAIL_ASYNC:
        threading.Thread(target=_send, args=([msg],), daemon=True).start()
    else:
        _send([msg])


def send_bulk(template, subject, users, context_for):
    def run():
        batch = []
        for user in users:
            try:
                batch.append(build_email(template, subject, user.email, context_for(user)))
            except Exception:
                logger.exception("Email promo non préparé")
            if len(batch) >= 50:
                _send(batch)
                batch = []
        if batch:
            _send(batch)

    if settings.EMAIL_ASYNC:
        threading.Thread(target=run, daemon=True).start()
    else:
        run()
