from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    def get_by_natural_key(self, username):
        # connexion insensible à la casse de l'email
        return self.get(**{f"{self.model.USERNAME_FIELD}__iexact": username})

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_seller_admin", True)
        extra_fields.setdefault("email_verified", True)
        return self.create_user(email, username, password, **extra_fields)
