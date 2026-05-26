# Plan de commit de stabilisation

Derniere mise a jour : 2026-05-26

## Objectif

Preparer un commit lisible qui fige l'etat MVP stable sans melanger toutes les modifications du working tree dans un bloc opaque.

## Etat observe

Le working tree contient :

- des changements de reprise effectues pendant la stabilisation ;
- des changements fonctionnels plus larges deja presents avant la reprise ;
- des fichiers de documentation et scripts QA non suivis ;
- un dossier `.claude/` local a ne pas inclure sans decision explicite.

## Regle de commit

Ne pas faire un commit global avec `git add .`.

Chaque commit doit avoir un objectif lisible et verifier au moins une commande de test pertinente.

## Commit 1 recommande - Stabilisation locale MVP

Objectif :

- figer le chemin local stable : Docker, healthcheck, CORS dev, documentation de reprise et commandes de validation.

Inclure :

```powershell
git add .env.example
git add backend/src/app.js
git add backend/tests/health.test.js
git add PROJECT_RECOVERY.md
git add TEST_INTERFACE.md
git add ETAT_DU_PROJET.md
git add README.md
git add docs/15-roadmap-sprints-smart.md
git add docs/16-plan-commit-stabilisation.md
```

Verifier avant commit :

```powershell
cd backend
npm test
cd ..
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:keypad
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history
npm run qa:offline
npm run qa:receipt
```

Message propose :

```text
chore: stabilize local MVP recovery flow
```

## Commit 2 recommande - Backlog sprint et docs produit

Objectif :

- ajouter les documents agiles/roadmap qui structurent les sprints et la beta.

Inclure apres revue :

```powershell
git add docs/06-scrum-startup-operating-model.md
git add docs/07-smart-objectives-and-roadmap.md
git add docs/08-sprint-1-smart-backlog.md
git add docs/09-sprint-2-stabilisation-beta.md
git add docs/10-sprint-3-confiance-preuve.md
git add docs/11-sprint-4-offline-basique.md
git add docs/12-sprint-5-beta-terrain.md
git add docs/13-sprints-6-plus-croissance.md
git add docs/14-test-faible-connexion.md
git add docs/README.md
```

Message propose :

```text
docs: add SMART sprint roadmap and beta planning
```

## Commit 3 recommande - Scripts QA et lancement

Objectif :

- ajouter les scripts qui rendent les validations reproductibles.

Inclure apres revue :

```powershell
git add package.json
git add scripts/qa-*.js
git add scripts/request-otp.ps1
git add scripts/serve-static.js
git add scripts/start-demo-interface.ps1
git add scripts/start-local-backend.ps1
git add scripts/start-real-interface.ps1
git add scripts/test-interface.ps1
git add backend/Dockerfile.dev
```

Verifier :

```powershell
npm run qa:demo
npm run qa:real
npm run qa:offline
```

Message propose :

```text
test: add local launch and QA scripts
```

## Commit 4 recommande - Fonctionnel backend/mobile deja present

Objectif :

- isoler les changements fonctionnels importants deja presents dans backend, mobile et migrations.

Inclure seulement apres revue fichier par fichier :

```powershell
git add backend/src/config/database.js
git add backend/src/routes/auth.js
git add backend/src/services/employeeService.js
git add backend/src/services/notificationService.js
git add backend/src/services/otpService.js
git add backend/src/services/transactionService.js
git add backend/src/utils/migrate.js
git add backend/tests/employees.test.js
git add backend/tests/globalSetup.js
git add backend/tests/notifications.test.js
git add backend/tests/setup.js
git add backend/tests/transactions.test.js
git add database/migrations/002_employees.sql
git add database/migrations/002_employees_notifications.sql
git add docker-compose.yml
git add mobile/App.js
git add mobile/src/screens/main/*.js
git add mobile/src/services/api.js
git add mobile/src/store/useStore.js
git add mobile/src/utils/*.js
```

Verifier :

```powershell
cd backend
npm test
cd ..
npm run qa:demo
npm run qa:real
npm run qa:offline
```

Message propose :

```text
feat: complete MVP cash flow and offline demo support
```

## A exclure sans decision explicite

```powershell
.claude/
.codex-logs/
.expo-web-demo/
.expo-web-real/
.env
```

## Risques avant commit

- `README.md` et `ETAT_DU_PROJET.md` contiennent encore des caracteres d'encodage casses.
- `README.md` contient des changements de roadmap preexistants en plus de la note MVP stabilise.
- Plusieurs fichiers modifies ne sont pas directement lies au correctif healthcheck/CORS ; ils doivent etre relus avant commit fonctionnel.
- Les scripts QA `qa:demo`, `qa:keypad`, `qa:history` testent la demo authentifiee, pas l'interface reelle avec login.

## Decision recommandee

Faire d'abord le commit 1, puis relire les autres lots.

Le commit 1 est le plus important pour figer la reprise et permettre de continuer sans perdre l'etat stable.
