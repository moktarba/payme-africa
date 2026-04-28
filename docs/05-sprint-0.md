# Livrable 5 - Sprint 0

## Objectif business

Reduire le risque d'execution avant de rajouter des fonctionnalites.

## Objectif technique

- clarifier la direction produit,
- rendre le backend plus testable,
- definir une CI initiale,
- cadrer les environnements,
- verrouiller les conventions.

## Structure projet recommandee

```text
payme-africa/
  backend/
    src/
      app.js
      server.js
      routes/
      services/
      adapters/
      middleware/
      config/
      utils/
    tests/
  mobile/
    src/
      screens/
      navigation/
      services/
      store/
      utils/
  database/
    migrations/
  docs/
  .github/workflows/
```

## Conventions

- un monolithe modulaire backend,
- noms fonctionnels par domaine,
- aucune logique provider directement dans les routes,
- toute transaction doit avoir une reference idempotente,
- UX orientee 1 main, faible litteratie numerique, soleil, stress.

## Environnements

- `dev`: rapide, seed data, OTP expose
- `staging`: proche prod, donnees de test, providers sandbox si possible
- `prod`: OTP reel, logs cadres, flags prudents

## Secrets

- variables d'environnement seulement,
- aucune cle provider en dur,
- rotation manuelle documentee au debut,
- differencier secrets dev/staging/prod.

## Monitoring minimum

- healthcheck API,
- logs structures,
- suivi des erreurs auth et paiement,
- volume transactions par provider,
- taux echec OTP / verification.

## Analytics minimum

- compte cree,
- OTP envoye,
- OTP valide,
- session restauree,
- transaction initiee,
- transaction completee,
- transaction annulee,
- provider utilise.

## Strategie tests

- unitaires: adaptateurs, services, validations
- integration: auth, transactions, merchants
- E2E critiques plus tard: onboarding -> encaissement -> confirmation

## Risques Sprint 0 a traiter

- scripts casses,
- bootstrap backend couple au runtime,
- config mobile en dur,
- session incomplete au redemarrage,
- CI absente,
- doc produit insuffisante.

## Execution Sprint 0 lancee dans ce repo

Changements attendus:

- separation `app` / `server`,
- setup Jest present,
- URL API mobile via env,
- restauration de session plus fiable,
- workflow CI backend,
- docs produit et architecture versionnees.
