from django.contrib.auth import get_user_model
from django.core import signing

VERIFY_SALT = "glowluxe.verify-email"
UNSUB_SALT = "glowluxe.unsubscribe"


def make_verify_token(user):
    return signing.dumps({"u": str(user.pk), "e": user.email}, salt=VERIFY_SALT)


def read_verify_token(token, max_age=60 * 60 * 24 * 3):
    try:
        data = signing.loads(token, salt=VERIFY_SALT, max_age=max_age)
    except signing.BadSignature:
        return None
    user = get_user_model().objects.filter(pk=data.get("u"), is_active=True).first()
    return user if user and user.email == data.get("e") else None


def make_unsubscribe_token(user):
    return signing.dumps({"u": str(user.pk)}, salt=UNSUB_SALT)


def read_unsubscribe_token(token):
    try:
        data = signing.loads(token, salt=UNSUB_SALT)
    except signing.BadSignature:
        return None
    return get_user_model().objects.filter(pk=data.get("u")).first()
