# Livrable 4 - Plan de sprints

## Backlog initial

### Epic 1 - Activation commercant

- inscription Niveau 1
- OTP
- session persistante
- profil marchand

### Epic 2 - Encaissement MVP

- montant libre
- choix provider
- cash
- Wave semi-manuel
- confirmation
- detail transaction
- preuve simple

### Epic 3 - Suivi minimum

- historique
- total du jour
- detail transaction

### Epic 4 - Fondations

- CI
- migrations
- seeds
- logs
- erreurs
- audit minimal

## Sprint 0

### Objectif business

Se donner une base fiable pour iterer sans dette de structure inutile.

### Objectif technique

- repo propre
- architecture modulee
- environnement dev/test clair
- CI initiale
- conventions et documentation

### User stories

- En tant que developpeur, je peux lancer localement l'app sans comportements caches.
- En tant que QA, je peux identifier les flux critiques MVP.
- En tant que PM, je vois ce qui est dans le MVP et ce qui attend.

### Definition of done

- docs versionnees,
- scripts de base utilisables,
- CI initiale definie,
- bootstrap backend testable,
- conventions explicites.

## Sprint 1

### Objectif business

Permettre a un commercant de s'inscrire et d'acceder a son espace.

### Objectif technique

- auth OTP stable,
- persistance session,
- profil Niveau 1,
- ecrans auth clairs.

### User stories

- En tant que commercant, je cree un compte en moins de 2 minutes.
- En tant que commercant, je reviens dans l'app sans me reconnecter a chaque fois.

### Ecrans

- telephone
- OTP
- inscription
- profil de base

### APIs

- `POST /auth/send-otp`
- `POST /auth/register`
- `POST /auth/verify-otp`
- `POST /auth/refresh`
- `GET /merchants/me`

### Tests

- validation numero,
- OTP faux / expire / trop de tentatives,
- persistence session.

## Sprint 2

### Objectif business

Permettre un premier encaissement reel simple.

### Objectif technique

- transaction creation,
- cash,
- Wave semi-manuel,
- statuts clairs,
- ecran confirmation/recu.

### User stories

- En tant que vendeur ambulant, je peux encaisser en moins de 20 secondes.
- En tant que commercant, je peux confirmer qu'un paiement a bien ete recu.

### Ecrans

- accueil
- encaissement
- confirmation

### APIs

- `POST /transactions`
- `POST /transactions/:id/confirm`
- `POST /transactions/:id/cancel`
- `GET /transactions/:id`

### Tests

- idempotence,
- double confirmation,
- provider invalide,
- montant invalide.

## Sprint 3

### Objectif business

Permettre au commercant de suivre son activite quotidienne.

### Objectif technique

- historique fiable,
- total du jour,
- detail transaction,
- preuve simple partageable ensuite.

### User stories

- En tant que boutique, je vois mes ventes du jour.
- En tant que commercant, je retrouve une transaction en cas de contestation.

### Ecrans

- accueil
- historique
- detail transaction

### APIs

- `GET /transactions`
- `GET /transactions/stats/day`
- `GET /transactions/:id`

### Tests

- pagination,
- filtres statut,
- calcul stats.
