# PayMe Africa — État du développement

> Document de référence — généré le 02/05/2026  
> Application POS pour commerçants d'Afrique de l'Ouest (MVP Sénégal)

---

## 1. Vue d'ensemble

PayMe Africa est une application mobile (React Native / Expo) couplée à une API REST (Node.js / Express) permettant à un commerçant d'encaisser ses clients en moins de 30 secondes via Wave, Orange Money, Free Money ou Espèces.

**Environnement de production**
- API live : `https://gallant-unity-production-4292.up.railway.app`
- Hébergeur : Railway (`thriving-endurance`)
- Base de données : PostgreSQL 15 (Railway plugin)
- Cache / Sessions : Redis 7 (Railway plugin)
- SMS OTP : Africa's Talking (sandbox)

---

## 2. Backend — API REST

### 2.1 Architecture

```
backend/src/
├── app.js                  Point d'entrée Express
├── config/
│   └── database.js         Pool PostgreSQL + client Redis + logger Winston
├── middleware/
│   ├── auth.js             Validation JWT Bearer
│   ├── roles.js            Contrôle d'accès par rôle
│   └── errorHandler.js     Gestion globale des erreurs + 404
├── routes/                 Déclaration des endpoints
├── services/               Logique métier
└── adapters/payment/       Pattern Adaptateur (multi-prestataires)
```

### 2.2 Endpoints (23 routes)

#### Authentification `/auth`
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/send-otp` | Envoi OTP par SMS (login ou inscription) |
| POST | `/auth/register` | Création de compte marchand |
| POST | `/auth/verify-otp` | Vérification OTP → retourne access + refresh tokens |
| POST | `/auth/refresh` | Renouvellement de l'access token |
| POST | `/auth/logout` | Déconnexion, révocation du refresh token |

#### Marchand `/merchants`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/merchants/me` | Profil complet du marchand |
| PUT | `/merchants/me` | Mise à jour profil (nom, ville, zone, push token…) |
| GET | `/merchants/me/payment-methods` | Liste des moyens de paiement |
| PUT | `/merchants/me/payment-methods/:provider` | Activer / désactiver / configurer un moyen de paiement |

#### Transactions `/transactions`
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/transactions` | Créer un encaissement (idempotent via `clientReference`) |
| GET | `/transactions` | Historique paginé (filtres : status, dateFrom, dateTo) |
| GET | `/transactions/stats/day` | Stats du jour (total, compteurs, détail par prestataire) |
| GET | `/transactions/:id` | Détail d'une transaction |
| POST | `/transactions/:id/confirm` | Confirmation manuelle |
| POST | `/transactions/:id/cancel` | Annulation avec motif |

#### Catalogue `/catalog`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/catalog` | Liste des articles actifs |
| POST | `/catalog` | Créer un article |
| PUT | `/catalog/:id` | Modifier un article |
| DELETE | `/catalog/:id` | Supprimer (soft delete) |

#### Employés `/employees`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/employees` | Liste des employés actifs |
| GET | `/employees/stats` | Ventes par employé (aujourd'hui) |
| POST | `/employees` | Créer un employé |
| PUT | `/employees/:id` | Modifier un employé |
| POST | `/employees/:id/pin` | Définir / modifier le PIN (4 chiffres) |
| DELETE | `/employees/:id` | Désactiver un employé |
| POST | `/employees/login-pin` | Connexion rapide par PIN → token 4h |

#### Rapports `/reports`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/reports/day?date=YYYY-MM-DD` | Rapport journalier (ventilation horaire) |
| GET | `/reports/week` | Rapport 7 jours (totaux par jour) |
| GET | `/reports/month?year=&month=` | Rapport mensuel (ventilation hebdomadaire) |
| GET | `/reports/top-items?limit=5` | Top 5 articles par chiffre d'affaires |
| GET | `/reports/export?dateFrom=&dateTo=&format=csv` | Export CSV (Excel-compatible, UTF-8 BOM) |
| GET | `/reports/pdf?year=&month=` | Rapport mensuel HTML imprimable |

#### Notifications `/notifications`
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/notifications` | Liste paginée (filtre : non lues) |
| POST | `/notifications/read` | Marquer comme lues (IDs ou toutes) |
| GET | `/notifications/preferences` | Préférences du marchand |
| PUT | `/notifications/preferences` | Modifier les préférences |

---

### 2.3 Services (logique métier)

#### `authService.js`
- Inscription marchand avec activation automatique Cash & Wave
- Normalisation des numéros sénégalais au format `+221`
- Génération access token JWT (1h) + refresh token UUID (30j)
- Gestion multi-appareils (device_info stocké avec chaque token)

#### `otpService.js`
- Génération de codes à 6 chiffres, expiration 5 minutes
- Envoi SMS via Africa's Talking (sandbox configuré)
- Rate limiting Redis (3 requêtes/heure, fallback DB si Redis indisponible)
- Maximum 3 tentatives par code
- En mode dev : code OTP exposé dans les logs et la réponse JSON

#### `transactionService.js`
- Initialisation transaction → appel de l'adaptateur de paiement
- Confirmation / annulation avec mise à jour du statut
- `clientReference` UUID côté mobile → idempotence garantie
- Stats journalières : montant total, compteurs, détail par prestataire

#### `employeeService.js`
- Création employé avec hash bcrypt du PIN (4 chiffres)
- Quota : 10 employés maximum par marchand
- Plafond de vente journalier par employé (`daily_limit`)
- Rôles : `owner`, `manager`, `cashier`
- Connexion PIN → token JWT 4h

#### `notificationService.js`
- Création / liste / marquage lu des notifications
- Types : `transaction_confirmed`, `transaction_pending`, `daily_summary`, `employee_login`, `system`
- Préférences par notification (activable/désactivable)
- Support Expo Push Notifications
- Nettoyage automatique des notifications > 30 jours

#### `reportService.js`
- Rapports jour / semaine / mois avec agrégation PostgreSQL
- Ventilation horaire (jour), quotidienne (semaine), hebdomadaire (mois)
- Top articles depuis le champ JSONB `items_snapshot`
- Export CSV avec BOM UTF-8 (compatible Excel)

#### `pdfService.js`
- Génération rapport mensuel en HTML/CSS inline
- Prêt pour impression navigateur (aucune dépendance PDF externe)
- Affiche : KPIs, tableau de transactions, résumé par prestataire

#### `cronService.js`
- **20h00** — Résumé journalier : envoi de la notification de synthèse à chaque marchand ayant eu des ventes
- **03h00** — Nettoyage : suppression des notifications > 30j et des refresh tokens expirés/révoqués
- Implémentation : `setInterval` toutes les 60s, protection contre les doublons par date d'exécution

---

### 2.4 Adaptateurs de paiement

**Pattern :** chaque prestataire implémente la même interface (`BasePaymentAdapter`) :
`initiate()`, `checkStatus()`, `handleWebhook()`, `refund()`, `isAvailable()`

| Adaptateur | Phase 1 (MVP) | Phase 2 (Roadmap) |
|------------|---------------|-------------------|
| **Cash** | ✅ Confirmation manuelle | — |
| **Wave** | ✅ Instructions manuelles + numéro Wave | 🔄 API Wave Business v2 (checkout sessions + webhooks) |
| **Orange Money** | ✅ Instructions manuelles (USSD `*144#`) | 🔄 API Orange Money REST |
| **Free Money** | ✅ Instructions manuelles (USSD `*555#`) | 🔄 API Free Money Business |

Feature flags : `FEATURE_WAVE_ENABLED`, `FEATURE_ORANGE_ENABLED`, `FEATURE_FREE_MONEY_ENABLED`

---

### 2.5 Middleware

| Fichier | Rôle |
|---------|------|
| `auth.js` | Validation Bearer JWT, vérification statut marchand (actif/suspendu) |
| `roles.js` | `requireRole(...roles)` + `ownerOnly` pour les routes sensibles |
| `errorHandler.js` | Mapping erreurs métier → codes HTTP (400, 401, 403, 409, 429, 500) |

---

## 3. Base de données

### 3.1 Schéma (11 tables)

#### `merchants`
Comptes marchands. Champs clés : `phone` (unique, format +221), `business_name`, `owner_name`, `city`, `zone`, `activity_type`, `status` (active/suspended/banned), `onboarding_level` (1→3), `push_token`, `currency` (XOF).

#### `otps`
Codes OTP. Champs clés : `phone`, `code`, `purpose` (login/register/reset), `attempts` (max 3), `is_used`, `expires_at` (5 min).

#### `refresh_tokens`
Sessions longues. Champs clés : `merchant_id`, `token_hash`, `device_info` (User-Agent), `is_revoked`, `expires_at` (30j).

#### `merchant_payment_methods`
Contrainte UNIQUE `(merchant_id, provider)`. Champs clés : `provider` (wave/orange_money/free_money/cash), `is_enabled`, `config` JSONB (clés API par prestataire), `display_name`.

#### `catalog_items`
Catalogue produits. Champs clés : `name`, `price` (entier, XOF), `category`, `is_active` (soft delete), `sort_order`.

#### `transactions`
Cœur du système. Champs clés : `client_reference` (UNIQUE — idempotence), `amount` (XOF), `payment_provider`, `payment_status` (pending/awaiting_confirmation/completed/failed/cancelled/refunded), `provider_reference`, `provider_response` JSONB, `items_snapshot` JSONB, `employee_id`, `created_offline`, `synced_at`.

#### `employees`
Employés par marchand. Champs clés : `name`, `phone`, `role` (owner/manager/cashier), `pin_hash` (bcrypt), `is_active`, `daily_limit`.

#### `employee_sessions`
Sessions PIN employé. `access_token`, `expires_at` (4h).

#### `notifications`
Historique des alertes. Champs clés : `type`, `title`, `body`, `data` JSONB, `is_read`.

#### `notification_preferences`
Une ligne par marchand. Flags : `tx_confirmed`, `tx_pending`, `daily_summary`, `employee_login`.

#### `audit_logs`
Traçabilité. `action`, `entity_type`, `entity_id`, `payload` JSONB, `ip_address`.

### 3.2 Migrations appliquées en production

| Fichier | Statut |
|---------|--------|
| `001_initial_schema.sql` | ✅ Appliquée |
| `002_employees_notifications.sql` | ✅ Appliquée |
| `003_push_tokens.sql` | ✅ Appliquée |

**Triggers actifs :** mise à jour automatique de `updated_at` sur `merchants`, `transactions`, `catalog_items`, `employees`.

---

## 4. Application mobile (React Native / Expo)

### 4.1 Navigation

```
RootNavigator
├── AuthNavigator  (isAuthenticated === false)
│   ├── PhoneScreen       Saisie numéro + envoi OTP
│   ├── OtpScreen         Vérification code (6 cases)
│   └── RegisterScreen    Création compte
│
└── AppNavigator  (isAuthenticated === true)
    ├── Tabs (Bottom Navigation)
    │   ├── home      → HomeScreen
    │   ├── history   → HistoryScreen
    │   ├── catalog   → CatalogScreen
    │   └── profile   → ProfileScreen
    │
    └── Modals / Détails (Stack)
        ├── encaissement   → EncaissementScreen
        ├── confirmation   → ConfirmationScreen (no gesture dismiss)
        ├── transactionDetail → TransactionScreen
        ├── reports        → ReportsScreen
        ├── employees      → EmployeesScreen
        └── notifications  → NotificationsScreen
```

### 4.2 Écrans développés

#### Flux authentification

**PhoneScreen**
- Saisie numéro avec indicatif +221 préfixé
- Formatage automatique "77 000 00 00"
- Redirection vers RegisterScreen si compte introuvable

**OtpScreen**
- 6 cases visuelles pour le code
- Auto-vérification à la saisie du 6e chiffre
- Renvoi du code (timer 30s)
- Mode dev : pré-remplissage automatique si `devCode` présent

**RegisterScreen**
- Champs : téléphone (pré-rempli), nom du commerce (obligatoire), nom du gérant, ville
- Sélection type d'activité par chips : vendeur ambulant, boutique, restaurant, coiffeur, réparateur, gargote, autre

#### Écrans principaux (tabs)

**HomeScreen**
- Bonjour + nom du commerce + date du jour
- Bouton principal "💰 Encaisser"
- Cartes statistiques : CA du jour, nombre de transactions
- Ventilation par prestataire (Wave / Orange Money / Cash)
- 5 dernières transactions avec badge de statut
- Pull-to-refresh

**HistoryScreen**
- Filtre par statut (Tous / Confirmés / En attente / Annulés)
- 20 transactions par page, chargement à la demande
- Carte par transaction : icône prestataire, montant, heure, statut

**CatalogScreen**
- Liste articles groupés par catégorie
- Recherche textuelle
- CRUD complet : ajout (modal), édition (crayon), suppression (corbeille + confirmation)
- État vide avec CTA

**ProfileScreen**
- Carte marchand : avatar, nom commerce, gérant, téléphone, ville
- Toggles moyens de paiement (activer/désactiver en temps réel)
- Version de l'app (1.0.0 — Sprint 0), devise (XOF)
- Bouton déconnexion

#### Modales / Écrans de flux

**EncaissementScreen** (3 étapes)
1. Saisie montant — clavier custom + boutons rapides (500, 1 000, 1 500, 2 000, 3 000, 5 000 FCFA) + note optionnelle
2. Sélection prestataire — cartes avec icônes, radio selection
3. Récapitulatif — montant, prestataire, note → bouton lancer l'encaissement

**ConfirmationScreen**
- État attente : icône prestataire, montant, instructions étape par étape, bouton "J'ai reçu le paiement", bouton Annuler
- État succès : ✅ vert, récapitulatif reçu (montant, mode, statut, référence), bouton Nouvel encaissement, bouton Retour

**TransactionScreen**
- Détail complet : montant, prestataire, date/heure, référence, statut
- Actions contextuelles : Confirmer (si en attente), Annuler, Partager le reçu
- Partage : texte plain avec tous les détails

**ReportsScreen**
- Onglets : Aujourd'hui / 7 jours / Ce mois
- Ventilation horaire (jour), quotidienne (semaine), hebdomadaire (mois)
- Top 5 articles avec médailles 🥇🥈🥉
- Export partage natif (texte)

---

### 4.3 Composants UI (`mobile/src/components/ui.js`)

| Composant | Props clés | Description |
|-----------|------------|-------------|
| `Button` | variant (primary/secondary/outline/ghost/danger/success), size (sm→xl), loading, icon | Bouton principal avec états |
| `Input` | label, prefix, suffix, error, multiline, secureTextEntry | Champ de formulaire |
| `Card` | onPress, style | Conteneur carte avec ombre |
| `StatusBadge` | status | Badge coloré (vert/orange/rouge/gris) |
| `EmptyState` | icon, title, subtitle | État vide avec illustration emoji |

---

### 4.4 State management & services

**Zustand store** (`useStore.js`)
- State : `merchant`, `accessToken`, `refreshToken`, `isAuthenticated`, `isLoading`, `activeTransaction`, `dayStats`, `catalogItems`
- Actions : `setAuth()`, `logout()`, `restoreSession()` (persistance SecureStore)

**Axios client** (`api.js`)
- Intercepteur request : injection Bearer token
- Intercepteur response : refresh token automatique, mapping erreurs → `userMessage` + `errorCode`
- Namespaces : `authApi`, `merchantApi`, `transactionApi`, `catalogApi`

**Utilitaires**
- `storage.js` — expo-secure-store (mobile) / localStorage (web)
- `haptics.js` — retours haptiques personnalisés
- `theme.js` — palette (vert forêt #1B4332, orange chaud #F4A261), typographie, espacements, `formatAmount()`, `PROVIDER_LABELS`, `PROVIDER_COLORS`
- `pushNotifications.js` — permissions, token Expo, envoi au serveur, listener

---

## 5. Infrastructure

### 5.1 Production (Railway)

| Service | Détail |
|---------|--------|
| **payme-africa** | Node.js 20, port 4000 |
| **Postgres** | PostgreSQL 15, `DATABASE_URL` injecté automatiquement |
| **Redis** | Redis 7, `REDIS_URL` injecté automatiquement |

**Variables d'environnement configurées :**
```
NODE_ENV=production
PORT=4000
DATABASE_URL=<Railway internal>
REDIS_URL=<Railway internal>
JWT_SECRET=<256 bits>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
AT_API_KEY=<Africa's Talking sandbox>
AT_USERNAME=sandbox
AT_SENDER_ID=PayMe
OTP_EXPIRES_MINUTES=5
OTP_LENGTH=6
FEATURE_WAVE_ENABLED=true
FEATURE_ORANGE_ENABLED=false
FEATURE_FREE_MONEY_ENABLED=false
LOG_LEVEL=info
CORS_ORIGINS=https://gallant-unity-production-4292.up.railway.app,...
```

### 5.2 Local (Docker Compose)

3 services : `postgres:15-alpine` (port 5432), `redis:7-alpine` (port 6379), `backend` Node 20 (port 4000). Health checks + volumes persistants.

---

## 6. Tests

**Framework :** Jest + Supertest

| Fichier | Couverture |
|---------|------------|
| `auth.test.js` | Inscription, envoi OTP, vérification OTP, tokens |
| `transactions.test.js` | Création, idempotence, confirmation, annulation, historique, stats |
| `catalog.test.js` | CRUD articles, validations |
| `employees.test.js` | Création, PIN, connexion, rôles |
| `notifications.test.js` | CRUD notifications, préférences |
| `reports.test.js` | Rapports jour/semaine/mois, export CSV, top articles |

---

## 7. Sécurité

- JWT (1h) + Refresh Token UUID (30j) avec révocation
- OTP 6 chiffres, TTL 5 min, max 3 tentatives
- Rate limiting : 20 req/15min sur `/auth`, 200 req/15min global
- Helmet.js (headers HTTP sécurisés)
- bcrypt pour les PINs employés
- Idempotence transactions via `clientReference` UUID côté mobile
- Aucune donnée sensible dans les logs

---

## 8. Récapitulatif des fonctionnalités

### ✅ Développé et déployé

| Fonctionnalité | Backend | Mobile |
|----------------|---------|--------|
| Authentification OTP SMS | ✅ | ✅ |
| Inscription marchand | ✅ | ✅ |
| Encaissement Cash | ✅ | ✅ |
| Encaissement Wave (semi-manuel) | ✅ | ✅ |
| Encaissement Orange Money (semi-manuel) | ✅ | ✅ |
| Encaissement Free Money (semi-manuel) | ✅ | ✅ |
| Confirmation / Annulation transaction | ✅ | ✅ |
| Historique des transactions | ✅ | ✅ |
| Stats du jour (dashboard) | ✅ | ✅ |
| Profil marchand | ✅ | ✅ |
| Gestion moyens de paiement | ✅ | ✅ |
| Catalogue articles | ✅ | ✅ |
| Gestion employés + PIN | ✅ | ✅ |
| Rapports (jour / semaine / mois) | ✅ | ✅ |
| Export CSV | ✅ | — |
| Rapport HTML imprimable | ✅ | — |
| Notifications in-app | ✅ | ✅ |
| Préférences notifications | ✅ | — |
| Push notifications (Expo) | ✅ | ✅ |
| CRON résumé journalier | ✅ | — |
| Nettoyage automatique | ✅ | — |

### 🔄 Prévu (Roadmap)

| Fonctionnalité | Sprint |
|----------------|--------|
| Intégration API Wave Business v2 | Sprint 3 |
| Intégration API Orange Money | Sprint 3 |
| Webhooks paiements | Sprint 3 |
| Mode offline (queue SQLite) | Sprint 1 |
| Gestion erreur réseau mobile | Sprint 1 |
| Partage reçu WhatsApp/SMS | Sprint 2 |
| Animation succès | Sprint 2 |
| Multi-employés avec rôles avancés | Sprint 5 |
| CI/CD | Sprint 5 |

---

*PayMe Africa — Construit pour les commerçants d'Afrique de l'Ouest*

---

## Note de reprise - 2026-05-26

Ce fichier contient encore des caracteres d'encodage casses issus d'une generation precedente. Il n'a pas ete reecrit pendant la reprise pour eviter une modification massive. Voir `PROJECT_RECOVERY.md` pour l'etat de stabilisation courant.

Audit reproductible du 2026-05-26 :

- `cd backend && npm test` : OK, 38 tests passes.
- `$env:API_URL='http://127.0.0.1:4000'; npm run qa:real` : OK.
- `npm run qa:demo` : OK.
- `npm run qa:keypad` : OK.
- `npm run qa:offline` : OK.
- `npm run qa:receipt` : OK.
- Docker Desktop / daemon Docker : non confirme, `docker info` et `docker compose ps` ont expire.

MVP retenu pour stabilisation : auth OTP locale, encaissement manuel Cash/Wave/Orange Money, confirmation/annulation, historique, stats du jour, recu, profil moyens de paiement, demo locale et backend local testables.

Hors scope temporaire : integrations paiement reelles, webhooks, refonte UI, refonte architecture, notifications push production, analytics avances.

### Relecture croisee - 2026-05-26

Les fichiers `PROJECT_RECOVERY.md`, `ETAT_DU_PROJET.md` et `TEST_INTERFACE.md` ont ete relus ensemble avant de continuer la reprise.

Alignement retenu :

- `PROJECT_RECOVERY.md` pilote les decisions de stabilisation.
- `ETAT_DU_PROJET.md` reste un etat historique utile mais non definitif.
- `TEST_INTERFACE.md` porte les commandes pratiques de verification.
- Le MVP a stabiliser reste limite au flux marchand essentiel : auth OTP, encaissement manuel, confirmation/annulation, historique, stats du jour, recu, profil moyens de paiement, demo et backend local.

Prochain risque technique a traiter : le healthcheck `/health` donne un signal DB ambigu en local quand `DATABASE_URL` n'est pas defini.

### Verification apres correctif healthcheck - 2026-05-26

Commandes relancees :

- `cd backend && npm test` : OK, 7 suites passees, 39 tests passes.
- `$env:API_URL='http://127.0.0.1:4000'; npm run qa:real` : OK.
- `Invoke-RestMethod http://127.0.0.1:4000/health` : repond, mais avec l'ancien payload tant que le serveur local deja actif n'est pas redemarre.

Etat : le correctif est valide par les tests automatises. La verification HTTP du nouveau payload `/health` necessite un redemarrage de l'API locale.

### Redemarrage API et nettoyage artefact - 2026-05-26

Apres redemarrage de l'API locale, `/health` confirme le nouveau signal :

- `db: true`
- `dbSource: DB_HOST`
- `dbCheck: not_checked`
- `redis: not_configured`

La QA backend reelle repassee apres redemarrage est OK.

Le dossier racine `{backend/` a ete inspecte : il ne contenait aucun fichier, seulement des dossiers vides avec des noms issus d'une generation invalide. Il a ete supprime comme artefact.

### Validation Docker backend - 2026-05-26

Docker Desktop repond maintenant (`25.0.3`).

La stack Docker locale a ete lancee avec succes :

- `payme_postgres` healthy ;
- `payme_redis` healthy ;
- `payme_backend` expose `http://127.0.0.1:4000`.

Le endpoint `/health` via Docker confirme :

- `db: true`
- `dbSource: DB_HOST`
- `dbCheck: not_checked`
- `redis: connected`

La commande `$env:API_URL='http://127.0.0.1:4000'; npm run qa:real` est OK contre le backend Docker.

Etat : le backend Docker local est valide. L'interface Expo Web reste a verifier en mode interactif via `npm run ui` ou `npm run ui:real`.

### Validation interface web - 2026-05-26

L'interface reelle a ete reconstruite et servie sur `http://localhost:8082` avec le backend Docker sur `http://127.0.0.1:4000`.

Verification reelle effectuee :

- ecran login charge ;
- saisie telephone marchand ;
- OTP dev pre-rempli ;
- validation OTP ;
- accueil authentifie visible (`Boutique Aminata`, `Encaisser`, `Historique`).

Resultat : OK.

Point CORS observe :

- `http://localhost:8082` fonctionne avec la configuration actuelle.
- `http://127.0.0.1:8082` sert l'interface mais les appels API sont bloques par CORS, car l'origine `127.0.0.1:8082` n'est pas dans `CORS_ORIGINS`.

QA interface demo relancees avec succes :

- `qa:demo` : OK.
- `qa:keypad` : OK.
- `qa:history` : OK.
- `qa:offline` : OK.

Etat : backend Docker, interface reelle login et parcours demo critiques sont valides. Le prochain sujet de stabilisation est la coherence des URLs locales/CORS.

### Passe QA finale MVP - 2026-05-26

Validation courte relancee apres stabilisation CORS :

- `cd backend && npm test` : OK, 7 suites, 39 tests.
- `docker compose ps` : backend up, Postgres healthy, Redis healthy.
- `/health` Docker : OK, Redis connecte, DB configuree via `DB_HOST`.
- `$env:API_URL='http://127.0.0.1:4000'; npm run qa:real` : OK.
- `$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo` : OK.
- `$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:keypad` : OK.
- `$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history` : OK.
- `npm run qa:offline` : OK.
- `npm run qa:receipt` : OK.

Etat MVP local : stable pour reprise controlee. Les fonctionnalites hors scope restent gelees jusqu'a validation/commit de cet etat.

### Cloture documentaire avant commit - 2026-05-26

Le README a ete complete avec une section courte `Etat MVP stabilise - 2026-05-26`.

Cette section documente :

- le chemin Docker local valide ;
- les URLs API, interface reelle et demo ;
- la commande de validation courte ;
- le rappel du hors scope.

Le README historique conserve encore des caracteres d'encodage casses. Il n'a pas ete reecrit integralement afin d'eviter une modification massive avant commit de stabilisation.

### Roadmap SMART consolidee - 2026-05-26

Une roadmap consolidee a ete ajoutee dans `docs/15-roadmap-sprints-smart.md`.

Ordre retenu :

1. Sprint 0 - Reprise et socle technique.
2. Sprint 1 - Encaissement terrain.
3. Sprint 2 - Stabilisation beta.
4. Sprint 3 - Confiance et preuve.
5. Sprint 4 - Connexion faible et offline cash.
6. Sprint 5 - Beta terrain.
7. Sprint 6 - Paiements integres.
8. Sprint 7 - Ops et production.
9. Sprint 8 - V1 commerce structure.

Decision : ne pas demarrer les sprints de croissance avant commit de stabilisation et validation courte verte.

### Plan de commit de stabilisation - 2026-05-26

Un plan de commit a ete ajoute dans `docs/16-plan-commit-stabilisation.md`.

Decision retenue :

- eviter un commit global ;
- faire d'abord un commit minimal de stabilisation locale MVP ;
- isoler ensuite les docs sprint, scripts QA et changements fonctionnels plus larges.

Message recommande pour le premier commit :

```text
chore: stabilize local MVP recovery flow
```

### Commit de stabilisation pousse - 2026-05-26

Le premier lot de reprise est maintenant fige dans GitHub :

- commit : `b3ec034 chore: stabilize local MVP recovery flow` ;
- branche : `main` synchronisee avec `origin/main` ;
- contenu : healthcheck backend, test healthcheck, configuration dev documentee, docs de reprise, roadmap SMART consolidee et plan de commit.

Etat courant :

- le MVP local reste stable et reproductible ;
- le working tree contient encore des changements non commites ;
- ces changements restants doivent etre classes par lots : documentation sprint, scripts QA, puis backend/mobile fonctionnel.

Prochain lot recommande :

- lot documentaire uniquement : `docs/06` a `docs/14` et `docs/README.md` ;
- aucun changement applicatif dans ce lot ;
- verification minimale : `git diff -- docs/README.md`, puis revue des nouveaux fichiers docs.

### Lot documentaire commite - 2026-05-26

Commit pousse :

```text
0826d8f docs: add SMART sprint roadmap and beta planning
```

Ce lot ajoute les documents de pilotage agile et beta sans changer le comportement applicatif.

Reste a traiter :

- lot scripts QA/lancement ;
- lot backend/mobile fonctionnel ;
- nettoyage eventuel de l'encodage historique, dans une etape dediee.

### Revue scripts QA/lancement - 2026-05-26

Le lot scripts en attente ajoute les commandes `npm run ui:*`, `npm run qa:*`, `npm run api:local`, `npm run otp` et `npm run dev:stop`.

Validation effectuee :

- `package.json` parse correctement ;
- backend Jest OK, 7 suites et 39 tests ;
- `qa:real`, `qa:demo`, `qa:history`, `qa:offline`, `qa:receipt` OK ;
- `qa:keypad` OK avec `QA_CHROME_PORT=9561` apres timeout du port par defaut.

Decision :

- le lot peut etre commite comme lot outillage/QA ;
- ne pas inclure les changements backend/mobile fonctionnels dans ce commit.

### Lot scripts QA/lancement commite - 2026-05-26

Commit pousse :

```text
6656485 test: add local launch and QA scripts
```

Ce commit ajoute l'outillage de lancement et de validation sans demarrer de nouvelle fonctionnalite produit.

Reste prioritaire :

- revue backend/mobile fonctionnelle ;
- verification des migrations `002_*` ;
- controle de l'encodage des fichiers historiques.

### Audit infra locale - 2026-05-26

Le prochain lot technique reste limite a trois fichiers :

- `.gitignore` ;
- `docker-compose.yml` ;
- `backend/src/config/database.js`.

Ce lot ne doit pas modifier les routes, services metier, migrations ou ecrans mobile.

Objectif :

- fiabiliser le lancement Docker de developpement ;
- garder les artefacts de build/CDP hors Git ;
- documenter le fallback Redis desactive par configuration.

Validation :

- `docker compose config` OK ;
- backend Jest OK, 7 suites et 39 tests ;
- `qa:real` OK contre `http://127.0.0.1:4000`.

Commit cree :

```text
7f49b68 chore: stabilize local docker infra
```

Risque suivant :

- les deux fichiers SQL `002_*` et le runner `backend/src/utils/migrate.js` doivent etre audites ensemble.

### Lot migrations/runner commite - 2026-05-26

Commit cree :

```text
1260f0a fix: make employee notification migrations idempotent
```

Decision :

- conserver les deux migrations `002_*` ;
- les rendre idempotentes au lieu de supprimer une migration ;
- garder le runner JS compatible avec les colonnes employees/sessions/preferences utilisees par les services.

Prochaine zone a auditer :

- services backend : auth, OTP, employee, notification, transaction ;
- tests backend associes.

### Lot transaction notifications/audit - 2026-05-26

Commit cree :

```text
782c91c feat: add transaction notifications and audit trail
```

Etat :

- transaction pending/confirmed cree des notifications selon preferences ;
- confirmation/annulation ecrit une trace `audit_logs` non bloquante ;
- le flux API reel reste OK.

Verification :

- `npx jest tests/transactions.test.js --runInBand --forceExit` OK ;
- `npm run qa:real` OK.

### Lot employes PIN/notifications - 2026-05-26

Commit cree :

```text
627c37a feat: improve employee PIN login visibility
```

Etat :

- les employes inactifs ne sont plus listes dans la liste active ;
- l'API expose `pin_set` au lieu du hash PIN ;
- la connexion PIN peut creer une notification employee_login si activee.

Verification :

- `npx jest tests/employees.test.js --runInBand --forceExit` OK, 7 tests.

### Lot auth/OTP dev QA - 2026-05-26

Commit cree :

```text
32f9291 fix: stabilize OTP validation for dev QA
```

Etat :

- `/auth/send-otp` accepte le champ optionnel `purpose` ;
- les tests et QA locales peuvent contourner le rate limit OTP sans impacter le defaut production.

Verification :

- `npx jest tests/auth.test.js --runInBand --forceExit` OK, 7 tests ;
- `npm run qa:real` OK.

### Lot environnement tests backend - 2026-05-26

Commit cree :

```text
8e55ffd test: harden backend test environment
```

Etat :

- Jest lit les `.env` utiles puis force les variables de test ;
- les variables `TEST_DB_*` et `TEST_DATABASE_URL` sont supportees ;
- notifications couvre le total pagine et les updates partiels de preferences.

Verification :

- `npx jest tests/notifications.test.js --runInBand --forceExit` OK, 6 tests ;
- `npm test` backend OK, 7 suites, 39 tests.

Backend :

- Les changements backend restants sont commites.
- Le prochain bloc non commite est le mobile.
