# GlowLuxe By Sofa

Boutique de mode : prêt-à-porter, crochet fait main, accessoires, chaussures, voiles, bijoux.

- `backend/` : API Django (comptes, catalogue, panier, commandes, paiements, livraisons, emails)
- `mobile/` : application Expo (iPhone, Android, tablette) + version web (ordinateur)

## Ce que fait l'appli

| Fonction | Détail |
|---|---|
| Boutique | Grille responsive (2 colonnes téléphone, 3-4 tablette, 5 ordinateur), recherche, catégories, promos, favoris |
| Comptes | Inscription, connexion par email, mot de passe oublié (code à 6 chiffres par email), confirmation d'email, déconnexion sécurisée |
| Panier | Fonctionne sans compte, fusionné automatiquement à la connexion |
| Paiement | Wave, Orange Money, carte bancaire (PayTech) ; paiement complet ou acompte selon le montant ; livraison payable au livreur |
| Livraison | Zones et prix ; livreurs choisis automatiquement (disponibles, les moins occupés, les plus proches) ; suivi en direct sur une carte avec temps d'arrivée |
| Livreurs | Candidature dans l'appli, validation dans l'admin, espace livreur (disponibilité, GPS, accepter / refuser, encaissement) |
| Emails (Brevo) | Confirmation d'email, commande confirmée, paiement reçu, livreur désigné, changement de statut, promotions (clients inscrits seulement) |

## Lancer en local

**Prérequis :** Python 3.12+, **Node.js 22** (Expo 58 ne marche pas avec Node 20).

```bash
# Terminal 1 : API
cd backend
python -m venv venv
venv\Scripts\activate              # macOS/Linux : source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # macOS/Linux : cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

```bash
# Terminal 2 : appli
cd mobile
npm install
npx expo start -c
```

Scanne le QR code avec Expo Go (même Wi-Fi que le PC). **Plus besoin de changer l'IP dans le code** :
l'appli trouve toute seule l'adresse de ton PC, même quand le Wi-Fi t'en donne une nouvelle.
Touche `w` dans le terminal Expo pour ouvrir la version ordinateur.

Avec `PAYMENT_TEST_MODE=True` (dans `backend/.env`), un simulateur permet de tester tout le
parcours de paiement sans compte marchand.

Tests de l'API : `cd backend && python manage.py test tests`

## Gestion (admin Django)

- **Réglages de la boutique** : téléphone, horaires, règles d'acompte (seuil, %), coordonnées GPS de la boutique
- **Zones de livraison** : prix et délais
- **Commandes** : action « Passer Prête et chercher un livreur » lance l'attribution automatique
- **Paiements** : action « Confirmer la réception » pour les paiements WhatsApp
- **Livreurs** : action « Valider » après vérification d'identité
- **Promotions** : action « Envoyer par email aux clients inscrits »

Déploiement : voir `DEPLOIEMENT.md`.
