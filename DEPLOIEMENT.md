# Mettre GlowLuxe en ligne

Architecture : **API sur Render** (+ PostgreSQL), **photos sur Cloudinary**, **emails par Brevo**,
**version web sur Cloudflare Pages**, **appli Android / iPhone via EAS Build**.

## 0. Ne pas perdre tes articles et photos (à faire AVANT le premier push)

Sur ton PC, dans `backend/` (là où sont tes vrais articles) :

```bash
python manage.py migrate
python manage.py export_catalogue
```

Cela crée `backend/seed/catalogue.json` et `backend/seed/media/` (copie de tes photos). Ces fichiers
partent sur GitHub ; au premier déploiement, Render les importe automatiquement (une seule fois)
et envoie les photos sur Cloudinary. Relance `export_catalogue` si tu ajoutes des articles avant la mise en ligne.

## 1. Comptes à créer

| Service | Récupérer |
|---|---|
| Cloudinary (gratuit) | Dashboard › « API Environment variable » → `CLOUDINARY_URL` |
| Brevo (gratuit 300 emails/jour) | SMTP & API › API Keys (clé v3) → `BREVO_API_KEY` ; puis valider ton adresse d'envoi |
| PayTech (paytech.sn) | `PAYTECH_API_KEY`, `PAYTECH_API_SECRET` : active la **carte bancaire** + Wave + OM + Free Money |
| Wave Business (facultatif) | `WAVE_API_KEY` + `WAVE_WEBHOOK_SECRET` (webhook : `https://TON-API/api/payments/webhooks/wave/`) |

Sans PayTech ni Wave, Wave et Orange Money passent par WhatsApp (tu confirmes dans l'admin) et la
carte bancaire est masquée.

## 2. API sur Render

1. Render › **New › Blueprint** › dépôt `faLucas17/glowluxe` (le fichier `render.yaml` crée l'API et la base).
2. Remplis les variables demandées. Exemple sans nom de domaine :
   `SITE_URL=https://glowluxe-api.onrender.com`, `APP_URL=https://glowluxe.pages.dev`,
   `CORS_ALLOWED_ORIGINS=https://glowluxe.pages.dev`.
3. Teste : `https://glowluxe-api.onrender.com/api/products/` doit afficher tes articles.

Coût : API `starter` 7 $/mois (le plan gratuit s'endort et met ~50 s à se réveiller : c'est ce qui
donne l'impression de lenteur), base `basic-256mb` ~6 $/mois (la base gratuite est supprimée après 30 jours).

## 3. Version web sur Cloudflare Pages

Cloudflare › Workers & Pages › Create › Pages › Connect to Git › `glowluxe` :
- Root directory : `mobile`
- Build command : `npx expo export --platform web`
- Output directory : `dist`
- Variables : `EXPO_PUBLIC_API_URL=https://glowluxe-api.onrender.com/api`, `NODE_VERSION=22`

## 4. Nom de domaine (Cloudflare)

- `glowluxe.sn` → Cloudflare Pages (onglet Custom domains)
- `api.glowluxe.sn` → Render (Settings › Custom Domains), CNAME vers `glowluxe-api.onrender.com`
- SSL/TLS : **Full (strict)**
- Mets ensuite à jour sur Render : `SITE_URL`, `APP_URL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`

## 5. Appli Android / iPhone

```bash
cd mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview      # fichier .apk à installer / partager
eas build -p android --profile production   # .aab pour le Play Store
eas build -p ios --profile production       # nécessite un compte Apple Developer (99 $/an)
```

Modifie d'abord l'adresse de l'API dans `mobile/eas.json` si tu n'as pas `api.glowluxe.sn`.

## 6. Passer en paiement réel

1. PayTech : teste avec `PAYTECH_ENV=test` (100 FCFA débités), puis `prod`.
2. Mets `PAYMENT_TEST_MODE=False` (ou supprime-la) : le simulateur ne marche de toute façon jamais en production.
