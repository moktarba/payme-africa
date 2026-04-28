# 💚 PayMe Africa

> Application POS (Point of Sale) simple et rapide pour petits commerçants d'Afrique de l'Ouest.
> MVP ciblant le Sénégal — Wave, Orange Money, Espèces.

---

## 🎯 Vision

Permettre à n'importe quel vendeur de marché, gargote ou boutique de quartier d'encaisser ses clients en moins de 30 secondes, de suivre ses ventes et d'obtenir une preuve de transaction — sans avoir besoin d'une formation technique.

---

## 📱 Stack technique

| Couche | Technologie |
|---|---|
| Mobile | React Native + Expo |
| Backend | Node.js + Express |
| Base de données | PostgreSQL 15 |
| Cache / Sessions | Redis 7 |
| Auth | JWT + OTP SMS (Africa's Talking) |
| Paiements | Pattern Adaptateur (Wave, Orange Money, Cash) |
| Containerisation | Docker Compose |

---

## 🚀 Installation et lancement

### Prérequis
- Docker + Docker Compose
- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)

### 1. Cloner et configurer

```bash
git clone <repo>
cd payme-africa
cp .env.example .env
# Éditez .env si nécessaire (les valeurs par défaut fonctionnent en dev)
```

### 2. Démarrer le backend

```bash
make start
# ou manuellement :
docker compose up -d
```

Services démarrés :
- PostgreSQL → `localhost:5432`
- Redis → `localhost:6379`
- API → `http://localhost:4000`

### 3. Vérifier que l'API tourne

```bash
make health
# ou :
curl http://localhost:4000/health
```

### 4. Démarrer l'application mobile

```bash
make mobile
# ou :
cd mobile && npm install && npx expo start
```

Scannez le QR code avec **Expo Go** (Android/iOS) ou appuyez sur `a` pour Android, `i` pour iOS simulateur.

---

## 🧪 Comptes de test

### Marchand seed (pré-créé)

```
Téléphone : +221 77 123 45 67
Commerce  : Boutique Aminata
Ville     : Dakar
```

En mode développement, le code OTP est affiché dans :
1. Les logs du backend (`make logs-api`)
2. La réponse JSON de l'API (champ `devCode`)
3. Directement pré-rempli dans l'écran OTP de l'app

### Créer un compte de test

```bash
make test-register
# Puis récupérer l'OTP :
make test-otp
```

---

## 🔍 Comment tester les parcours principaux

### Parcours 1 : Encaissement Cash (< 30 secondes)
1. Ouvrir l'app → se connecter avec `+221771234567`
2. Saisir le code OTP (affiché dans les logs)
3. Sur l'écran d'accueil → appuyer sur **Encaisser**
4. Saisir un montant (ex: 2500) ou choisir un montant rapide
5. Sélectionner **Espèces**
6. Appuyer sur **J'ai reçu le paiement**
7. Le reçu s'affiche ✅

### Parcours 2 : Encaissement Wave
1. Même étapes 1-4
2. Sélectionner **Wave**
3. Les instructions Wave s'affichent
4. Confirmer manuellement après réception

### Parcours 3 : Voir l'historique
1. Onglet **Historique** en bas
2. Filtrer par statut
3. Tapper sur une transaction pour voir le détail

### Parcours 4 : Dashboard du jour
- L'écran d'accueil affiche automatiquement les ventes du jour
- Tirez vers le bas pour rafraîchir

### Parcours 5 : Gérer les modes de paiement
1. Onglet **Profil**
2. Section **Moyens de paiement**
3. Activer/désactiver Wave, Orange Money, Espèces

---

## 🗂️ Structure du projet

```
payme-africa/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Point d'entrée Express
│   │   ├── config/
│   │   │   └── database.js         # PostgreSQL + Redis + Logger
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT middleware
│   │   │   └── errorHandler.js     # Gestion erreurs globale
│   │   ├── routes/
│   │   │   ├── auth.js             # /auth/*
│   │   │   ├── merchants.js        # /merchants/*
│   │   │   ├── transactions.js     # /transactions/*
│   │   │   └── catalog.js          # /catalog/*
│   │   ├── services/
│   │   │   ├── authService.js      # Inscription, login, tokens
│   │   │   ├── otpService.js       # OTP SMS via Africa's Talking
│   │   │   └── transactionService.js # Logique encaissement
│   │   └── adapters/payment/
│   │       ├── BasePaymentAdapter.js
│   │       ├── CashAdapter.js
│   │       ├── WaveAdapter.js      # Mode semi-manuel (phase 1)
│   │       └── index.js            # Registry + feature flags
│   └── tests/
│       ├── auth.test.js
│       └── transactions.test.js
│
├── mobile/
│   ├── App.js
│   └── src/
│       ├── navigation/
│       │   └── RootNavigator.js    # Stack + Tab navigation
│       ├── screens/
│       │   ├── auth/
│       │   │   ├── PhoneScreen.js  # Saisie numéro
│       │   │   ├── OtpScreen.js    # Vérification OTP
│       │   │   └── RegisterScreen.js
│       │   └── main/
│       │       ├── HomeScreen.js   # Dashboard + bouton encaissement
│       │       ├── EncaissementScreen.js  # Cœur du MVP
│       │       ├── ConfirmationScreen.js  # Confirmation + reçu
│       │       ├── HistoryScreen.js
│       │       └── ProfileScreen.js
│       ├── components/
│       │   └── ui.js               # Button, Input, Card, Badge...
│       ├── services/
│       │   └── api.js              # Axios + intercepteurs auth
│       ├── store/
│       │   └── useStore.js         # Zustand global state
│       └── utils/
│           └── theme.js            # Couleurs, typo, spacing
│
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql  # Schéma + seed data
│
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

---

## 🌐 API — Endpoints principaux

### Auth
| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/send-otp` | Envoyer un code OTP |
| POST | `/auth/register` | Créer un compte |
| POST | `/auth/verify-otp` | Vérifier OTP → tokens |
| POST | `/auth/refresh` | Rafraîchir l'access token |
| POST | `/auth/logout` | Déconnexion |

### Transactions
| Méthode | Route | Description |
|---|---|---|
| POST | `/transactions` | Créer un encaissement |
| GET | `/transactions` | Historique paginé |
| GET | `/transactions/stats/day` | Stats du jour |
| POST | `/transactions/:id/confirm` | Confirmer manuellement |
| POST | `/transactions/:id/cancel` | Annuler |

### Marchand
| Méthode | Route | Description |
|---|---|---|
| GET | `/merchants/me` | Profil + modes de paiement |
| PUT | `/merchants/me` | Mettre à jour le profil |
| PUT | `/merchants/me/payment-methods/:provider` | Activer/désactiver |

### Catalogue
| Méthode | Route | Description |
|---|---|---|
| GET | `/catalog` | Liste des articles |
| POST | `/catalog` | Créer un article |
| PUT | `/catalog/:id` | Modifier |
| DELETE | `/catalog/:id` | Supprimer (soft) |

---

## 🧪 Tests

```bash
# Tous les tests
make test

# Watch mode
make test-watch

# Couverture
make test-coverage
```

---

## 📅 Roadmap

### ✅ Sprint 0 — Structure complète (LIVRÉ)
- Backend Express complet (auth, transactions, catalogue)
- Schéma PostgreSQL + migrations + seed
- Adaptateurs de paiement (Cash, Wave semi-manuel)
- App mobile : auth, encaissement, historique, profil
- Docker Compose
- Tests backend

### 🔄 Sprint 1 — Auth terrain (à venir)
- Tests E2E auth complets
- Gestion erreur réseau mobile
- Mode offline basique (queue SQLite)
- Amélioration UX onboarding

### 🔄 Sprint 2 — Encaissement enrichi
- Catalogue rapide intégré à l'écran d'encaissement
- Calcul automatique depuis articles
- Partage reçu (WhatsApp, SMS)
- Animation de succès

### 🔄 Sprint 3 — Wave API + Orange Money
- Intégration API Wave Business
- Adaptateur Orange Money
- Polling statut transaction
- Webhook reception

### 🔄 Sprint 4 — Rapports
- Rapport hebdomadaire
- Export PDF simple
- Graphiques ventes

### 🔄 Sprint 5 — Multi-employés + déploiement VPS
- Gestion rôles basique
- CI/CD
- Déploiement production OVH/DigitalOcean

---

## 🔒 Sécurité

- JWT access token (1h) + refresh token (30 jours)
- OTP 6 chiffres, expire en 5 minutes, max 3 tentatives
- Rate limiting : 20 req/15min sur `/auth`, 200 req/15min global
- Helmet.js (headers sécurisés)
- Idempotence des transactions (UUID côté mobile)
- Pas de données sensibles dans les logs

---

## 📞 Support

En cas de problème :
```bash
make logs-api   # Voir les erreurs backend
make status     # État des services Docker
make health     # Vérifier l'API
```

---

*Construit avec ❤️ pour les commerçants d'Afrique de l'Ouest*
