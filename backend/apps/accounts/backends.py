from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    """Connexion par email, insensible à la casse, temps de réponse constant."""

    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        User = get_user_model()
        login = (email or username or "").strip().lower()
        if not login or password is None:
            return None
        user = User.objects.filter(email__iexact=login).first()
        if user is None:
            User().set_password(password)  # évite de révéler si le compte existe
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
