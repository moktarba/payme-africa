# Livrable 3 - Architecture recommandee

## Arbitrage de stack

### Mobile

**Choix: React Native + Expo**

Pourquoi:

- time-to-market rapide,
- une seule base mobile,
- bonne DX pour iterer en sprints,
- suffisant pour Android prioritaire,
- compatible avec stockage local, secure storage, notifications et partage.

Pourquoi pas natif Android au depart:

- trop couteux pour un MVP,
- freine les iterations produit,
- gain faible tant que l'app reste simple.

### Backend

**Choix: monolithe modulaire Node.js + Express**

Pourquoi:

- tres rapide a faire evoluer,
- faible cout ops,
- tres bon fit pour API CRUD + workflows transactionnels simples,
- suffisamment extensible avec modules clairs.

Pourquoi pas microservices:

- theatral pour ce stade,
- augmente fortement l'ops, le debug et la dette de coordination.

### Base de donnees

**Choix: PostgreSQL**

- transactions solides,
- JSONB utile pour snapshots et provider payloads,
- bon rapport robustesse/cout,
- compatible reporting simple.

### Cache / etats temporaires

**Choix: Redis**

- OTP rate limit,
- etats transitoires,
- filets de reprise simples plus tard,
- support futur de jobs leger.

### Jobs asynchrones

**Choix initial: pas de queue dediee**

- utiliser un cron/job simple plus tard pour reconciliation,
- introduire BullMQ seulement quand webhooks, retries et sync offline le justifieront.

## Architecture cible

### Mobile

- `auth`: inscription, OTP, session
- `checkout`: montant, provider, confirmation, preuve
- `history`: historique et detail
- `profile`: profil et moyens de paiement
- plus tard `offline`: file locale, sync, conflits

### Backend

- `auth`
- `merchant`
- `transactions`
- `catalog`
- `payments`
- `support/audit` plus tard

### Paiements

Chaque provider suit une interface commune:

- `initiate()`
- `checkStatus()`
- `handleWebhook()`
- `mapError()`
- `isAvailable()`

Types de connecteurs a supporter:

1. integre API
2. semi-manuel
3. assiste
4. manuel confirme par commercant

### Statuts transaction recommandes

- `draft`
- `pending`
- `awaiting_confirmation`
- `processing`
- `completed`
- `failed`
- `cancelled`
- `needs_review`

## Strategie offline / faible connexion

### Ce qui marche offline des le debut

- consultation du dernier profil stocke,
- consultation du dernier historique sync local si mis en cache,
- preparation d'un encaissement en brouillon local.

### Ce qui ne doit pas etre promis offline dans le MVP

- verification OTP,
- validation finale d'un paiement mobile money integre,
- synchronisation temps reel des statuts.

### Ce qui peut marcher en mode differe en V1 terrain

- creation de vente cash queuee localement,
- horodatage local + `clientReference` unique,
- synchronisation a la reconnexion,
- resolution simple des doublons par idempotence backend.

### SMS / USSD

- OTP par SMS: realiste.
- Paiement via USSD direct generic: peu realiste sans partenariats operateur/agrements.
- Recommandation: ne pas promettre de vrai flux USSD au MVP. Garder plutot une UX assistee pour paiements semi-manuels.

## Observabilite minimum

- logs structures JSON backend,
- correlation id / client reference,
- audit trail minimal sur actions critiques,
- healthcheck,
- analytics produit basique: activation, OTP envoye, OTP valide, transaction initiee, transaction completee.

## Securite minimum serieuse

- OTP rate-limite,
- refresh token avec hash en base a terme,
- JWT court + refresh,
- validation Joi,
- idempotence transaction,
- audit des confirmations/annulations,
- feature flags providers,
- secrets via variables d'environnement,
- CORS cadre,
- pas de PII sensible dans les logs.

## Deploiement recommande

### Phase 1

- Docker Compose pour dev et demo
- 1 VM simple ou PaaS leger pour backend
- PostgreSQL manage si budget, sinon VM separee minimale
- stockage local minimum, pas de S3 obligatoire au debut

### Phase 2

- CI GitHub Actions
- environments `dev`, `staging`, `prod`
- backups BDD quotidiens
- alerting sur healthcheck et erreurs 5xx

## Admin / support

Ne pas construire un gros backoffice tout de suite.

Phase 1:

- scripts support simples,
- logs consultables,
- recherche transaction par `transaction_id`, `clientReference`, telephone.

Phase 2:

- mini console support web.
