#!/usr/bin/env bash
# Build Render (exécuté à chaque déploiement)
set -o errexit
pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py import_catalogue   # tes articles + photos (une seule fois)
python manage.py ensure_admin
