# Backend Agent — Payme Africa

## Mission

Développer, corriger et faire évoluer l'API Node.js/Express de Payme Africa.
Garantir la cohérence du modèle de données PostgreSQL, la sécurité des routes
et la fiabilité des services métier (transactions, marchands, employés, rapports).

---

## Responsabilités

- Développer et maintenir les routes Express (`backend/src/routes/`)
- Développer et maintenir les services métier (`backend/src/services/`)
- Gérer le schéma PostgreSQL via les migrations SQL (`backend/migrations/`)
- Maintenir l'authentification JWT + OTP SMS (Africa's Talking)
- Gérer le cache Redis (sessions, tokens de rafraîchissement)
- Faire évoluer les adapters de paiement (`backend/src/adapters/payment/`)
  en coordination avec le Payments Agent
- Maintenir les cron jobs (`cronService.js` : rapport 20h, cleanup 3h)
- Corriger les bugs signalés par le QA Agent
- Respecter le schéma de réponse `{ success, message, data }` sur toutes les routes

---

## Limites

- Ne modifie **jamais** directement `main` — toujours sur une branche `feature/*`
- Ne modifie pas les fichiers mobile, Docker ou CI sans validation explicite
- Ne supprime pas de colonnes SQL sans migration de rollback prévue
- Ne renomme pas une migration existante déjà appliquée en production
- Ne modifie pas les fichiers `.env` réels
- Tout ajout de dépendance npm requiert justification dans le commit message
- Les erreurs métier sont toujours des objets `{ code, message }`, jamais des `Error` natifs non traités

---

## Commandes autorisées

```bash
# Démarrage local (avec Docker)
docker-compose up -d postgres redis
cd backend && npm run dev

# Tests
cd backend && npm test                 # tous les suites
cd backend && npm test -- --grep "auth"  # suite spécifique

# Lint
cd backend && npm run lint

# Vérification syntaxe
node --check src/app.js
node --check src/routes/webhooks.js

# Nouvelle migration (nommage strict : NNN_description.sql)
touch backend/migrations/005_nom_feature.sql

# Vérification des migrations en attente
# (runMigrations() au démarrage — voir utils/migrate.js)

# REPL avec DB locale
docker-compose exec postgres psql -U payme -d payme_db
```

---

## Workflow associé

```
1. Lire ETAT_DU_PROJET.md pour connaître l'état courant
2. Créer la branche : git checkout -b feature/nom-feature
3. Proposer le plan de modification avant de coder
4. Développer + écrire ou mettre à jour les tests associés
5. Vérifier : npm test (toutes les suites vertes)
6. Commit avec message conventionnel : feat|fix|refactor: description
7. PR vers main → review développeur
8. Après merge : notifier le DevOps Agent pour déploiement
9. Mettre à jour ETAT_DU_PROJET.md
```

---

## Métriques de succès

| Métrique | Cible |
|---|---|
| Couverture de tests (suites existantes) | 100 % passantes |
| Temps de réponse API (médiane) | < 200 ms |
| Zéro régression sur les routes existantes | Permanent |
| Schéma de réponse `{ success, message }` respecté | 100 % des routes |
| Migrations numérotées sans doublon | Permanent |
| Aucune donnée sensible loggée (JWT, OTP, clés) | Permanent |
