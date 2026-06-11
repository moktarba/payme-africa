# ETAT DU PROJET — Payme Africa

> Dernière mise à jour : 2026-06-10
> Branche active : `feature/payme-africa-v1`
> Dernier commit : `14bc55a` (2026-05-05)

---

## Statut global

| Dimension | État |
|---|---|
| Backend API | ✅ Opérationnel (Railway + VPS staging) |
| App mobile | 🔄 En développement (Expo, non publié) |
| Base de données | ✅ Migrations automatiques actives |
| Tests backend | ⚠️ Écrits mais non vérifiés sur branche actuelle |
| CI/CD | ✅ GitHub Actions configuré (push sur `main` / `develop`) |
| Déploiement prod | ✅ n8n webhook (pipeline actif) |
| Railway | ⚠️ Legacy / optionnel — ne plus utiliser en priorité |

---

## Branche et commits

- Branche de travail : `feature/payme-africa-v1`
- **~90 fichiers modifiés stagés mais non committés** depuis le 2026-05-05
- Ces fichiers couvrent l'ensemble des fonctionnalités Sprint 1 → 3+ (voir ci-dessous)
- **Action requise : créer un commit documentaire avant toute autre modification**

---

## Fonctionnalités livrées (code présent, pas nécessairement testé en prod)

### Sprint 0 — Fondations ✅
- Structure projet (backend / mobile / database / docs)
- Docker Compose dev + prod
- Migrations PostgreSQL automatiques au démarrage
- Seed data (marchand de test : +221 77 123 45 67)
- CI GitHub Actions (tests + lint)
- Healthcheck : `GET /health`

### Sprint 1 — Auth ✅
- `POST /auth/send-otp` — envoi OTP (Africa's Talking ou mode dev)
- `POST /auth/register` — création compte marchand
- `POST /auth/verify-otp` — vérification OTP → JWT access + refresh tokens
- `POST /auth/refresh` — renouvellement access token
- `POST /auth/logout` — invalidation session Redis
- Blocage OTP pour numéros non enregistrés
- Rate limiting auth : 20 req/15min

### Sprint 2 — Encaissement ✅
- `POST /transactions` — création encaissement (idempotence UUID)
- `POST /transactions/:id/confirm` — confirmation manuelle
- `POST /transactions/:id/cancel` — annulation
- `GET /transactions/:id` — détail transaction
- Adaptateurs : Cash, Wave (semi-manuel), Orange Money, FreeMoney

### Sprint 3 — Suivi activité ✅
- `GET /transactions` — historique paginé avec filtres
- `GET /transactions/stats/day` — total et comptage du jour
- Écrans mobile : Historique, Détail transaction, Dashboard

### Fonctionnalités avancées (Sprint 4-5, code présent)
- **Employés** : routes `/employees`, service, migration `002_employees.sql`
- **Notifications** : routes `/notifications`, service push, migration `003_push_tokens.sql`
- **Rapports** : routes `/reports`, service, export PDF (`pdfService.js`)
- **Catalogue** : routes `/catalog`, CRUD articles
- **Crons** : `cronService.js` (rapports automatiques, nettoyage sessions)

---

## Routes API actives

| Domaine | Préfixe | Fichier |
|---|---|---|
| Auth | `/auth` | `routes/auth.js` |
| Marchand | `/merchants` | `routes/merchants.js` |
| Transactions | `/transactions` | `routes/transactions.js` |
| Catalogue | `/catalog` | `routes/catalog.js` |
| Employés | `/employees` | `routes/employees.js` |
| Notifications | `/notifications` | `routes/notifications.js` |
| Rapports | `/reports` | `routes/reports.js` |

---

## Adaptateurs de paiement

| Adaptateur | Fichier | Statut |
|---|---|---|
| Cash | `CashAdapter.js` | ✅ Actif |
| Wave | `WaveAdapter.js` | ✅ Semi-manuel (phase 1) |
| Orange Money | `OrangeMoneyAdapter.js` | 🔄 Implémenté, à valider |
| Free Money | `FreeMoneyAdapter.js` | 🔄 Implémenté, à valider |

---

## Migrations base de données

| Fichier | Contenu |
|---|---|
| `001_initial_schema.sql` | Schéma principal : merchants, transactions, catalog |
| `002_employees.sql` | Table employees, rôles |
| `002_employees_notifications.sql` | Extension notifications sur employees |
| `003_push_tokens.sql` | Tokens push Expo |

---

## Tests

| Suite | Fichier | Statut |
|---|---|---|
| Auth | `backend/tests/auth.test.js` | ⚠️ À vérifier |
| Transactions | `backend/tests/transactions.test.js` | ⚠️ À vérifier |
| Catalogue | `backend/tests/catalog.test.js` | ⚠️ À vérifier |
| Employés | `backend/tests/employees.test.js` | ⚠️ À vérifier |
| Notifications | `backend/tests/notifications.test.js` | ⚠️ À vérifier |
| Rapports | `backend/tests/reports.test.js` | ⚠️ À vérifier |

Lancer les tests : `cd backend && npm test` ou `make test`

---

## Environnements

| Env | URL | Pipeline |
|---|---|---|
| Production | `https://api.faymafrica.fr` | n8n webhook (actif) |
| Healthcheck prod | `https://api.faymafrica.fr/health` | — |
| Dev local | `http://localhost:4000` | Docker Compose |
| Railway | — | Legacy — optionnel |

---

## Stack technique

- **Backend** : Node.js 20 + Express
- **Base de données** : PostgreSQL 15
- **Cache / Sessions** : Redis 7
- **Auth** : JWT (access 1h, refresh 30j) + OTP SMS (Africa's Talking)
- **Mobile** : React Native + Expo
- **Containerisation** : Docker Compose
- **Déploiement** : n8n sur VPS `/opt/ai-factory/payme-africa`
- **CI** : GitHub Actions (`.github/workflows/ci.yml`)
