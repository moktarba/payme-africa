# Tester l'interface rapidement

## Le plus simple: mode demo

Depuis la racine du projet, lancez:

```powershell
npm run ui:demo
```

Ce mode ouvre l'app dans le navigateur avec un marchand et des donnees de test. Il ne depend pas de Docker ni du backend.
Il construit une version web statique avant de servir la page, ce qui evite l'ecran blanc pendant la compilation Expo.

Interface: `http://localhost:8081`

Pour un mode developpement avec rechargement a chaud:

```powershell
npm run ui:demo:dev
```

## Test avec backend local

Mode local sans Docker, recommande pour tester vite l'API reelle:

Terminal 1:

```powershell
npm run api:local
```

Terminal 2:

```powershell
npm run ui:real:local
```

Interface API reelle: `http://localhost:8082`

Verification automatisee de l'API reelle:

```powershell
npm run qa:real
```

Si `localhost` accroche sur Windows, forcez l'URL IPv4:

```powershell
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

Pour lancer directement l'interface reelle avec l'URL IPv4:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-real-interface.ps1 -SkipDocker -ApiUrl http://127.0.0.1:4000
```

Quand Docker Desktop est bien demarre, lancez:

```powershell
npm run ui
```

La commande:
- demarre PostgreSQL, Redis et l'API avec Docker Compose;
- attend que `http://localhost:4000/health` reponde;
- installe les dependances mobile si elles manquent;
- lance Expo Web dans le navigateur.

API: `http://localhost:4000`

Compte de demo:
- Telephone: `+221771234567`
- Commerce: `Boutique Aminata`

Pour demander un OTP de test depuis un autre terminal:

```powershell
npm run otp
```

Pour arreter uniquement l'interface, faites `Ctrl+C` dans le terminal.
Pour arreter les services Docker:

```powershell
npm run dev:stop
```

Si l'API ne demarre pas, consultez les logs:

```powershell
docker compose logs -f backend
```

## Test faible connexion

Procedure detaillee:

```powershell
docs/14-test-faible-connexion.md
```

Verification statique du cablage offline:

```powershell
npm run qa:offline
```

## Etat verifie le 2026-05-26

Commandes executees avec succes:

```powershell
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
npm run qa:demo
npm run qa:keypad
npm run qa:offline
npm run qa:receipt
```

Resultats:

- API reelle locale: OK via `http://127.0.0.1:4000`.
- Interface demo: OK via `http://127.0.0.1:8081`.
- Flux demo encaissement -> stats -> historique -> detail: OK.
- Clavier/montants rapides/montant libre/ecran non blanc: OK.
- Cablage offline cash: OK.
- Recu: OK.

Point d'attention:

- `docker info` et `docker compose ps` ont expire pendant l'audit. Le chemin `npm run ui` depend donc de Docker Desktop et doit etre considere non valide tant que Docker ne repond pas.
- Le healthcheck `/health` expose maintenant `db`, `dbSource` et `dbCheck`. Si l'ancien payload apparait encore, redemarrer l'API locale.

## Sequence recommandee pendant la reprise

Tant que Docker n'est pas confirme, utiliser cette sequence pour verifier le MVP sans bloquer sur Docker Desktop:

Terminal API:

```powershell
npm run api:local
```

Terminal interface:

```powershell
npm run ui:demo
```

Terminal verification:

```powershell
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
npm run qa:demo
npm run qa:keypad
npm run qa:offline
npm run qa:receipt
```

Critere d'acceptation temporaire:

- `qa:real` valide le backend local.
- `qa:demo`, `qa:keypad`, `qa:offline` et `qa:receipt` valident les parcours MVP cote interface demo.
- `npm run ui` avec Docker a un backend valide depuis le 2026-05-26 ; l'interface Expo reste a lancer en mode interactif si besoin.

## Verification backend du 2026-05-26

Commandes relancees apres le correctif du healthcheck:

```powershell
cd backend
npm test
cd ..
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
```

Resultats:

- Tests backend: OK, 7 suites, 39 tests.
- QA backend reel: OK.
- `/health` HTTP renvoie encore l'ancien payload tant que l'API deja lancee n'est pas redemarree.

Action avant de valider le nouveau `/health` dans le navigateur ou en HTTP:

1. Arreter l'API locale en cours.
2. Relancer `npm run api:local`.
3. Relancer la commande `/health`.

## Verification apres redemarrage API - 2026-05-26

Resultat `/health` attendu et confirme apres redemarrage de l'API locale:

```json
{
  "success": true,
  "status": "ok",
  "env": "development",
  "redis": "not_configured",
  "db": true,
  "dbSource": "DB_HOST",
  "dbCheck": "not_checked"
}
```

Verification complementaire:

```powershell
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

Resultat: OK.

## Verification Docker backend - 2026-05-26

Docker Desktop est confirme disponible :

```powershell
docker info --format "{{.ServerVersion}}"
```

Resultat observe : `25.0.3`.

Stack backend Docker lancee :

```powershell
docker compose up -d
docker compose ps
```

Resultat observe :

- `payme_postgres` : healthy.
- `payme_redis` : healthy.
- `payme_backend` : up sur `0.0.0.0:4000->4000`.

Healthcheck Docker confirme :

```json
{
  "success": true,
  "status": "ok",
  "env": "development",
  "redis": "connected",
  "db": true,
  "dbSource": "DB_HOST",
  "dbCheck": "not_checked"
}
```

QA backend reel contre Docker :

```powershell
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

Resultat : OK.

Pour arreter la stack Docker :

```powershell
npm run dev:stop
```

## Verification interface web - 2026-05-26

Interface reelle connectee au backend Docker :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-real-interface.ps1 -SkipDocker -ApiUrl http://127.0.0.1:4000
```

URL validee pour l'interface reelle :

```text
http://localhost:8082
```

Attention CORS :

- `http://localhost:8082` fonctionne avec la configuration `.env` actuelle.
- `http://127.0.0.1:8082` sert bien l'interface, mais les appels API sont bloques par CORS tant que `CORS_ORIGINS` ne contient pas cette origine.

Verification reelle effectuee :

- saisie du telephone marchand ;
- OTP dev pre-rempli ;
- validation OTP ;
- affichage de l'accueil authentifie avec `Boutique Aminata`, `Encaisser`, `Historique`.

Resultat : OK.

QA interface demo relancees :

```powershell
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:keypad
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history
npm run qa:offline
```

Resultats :

- `qa:demo` : OK.
- `qa:keypad` : OK.
- `qa:history` : OK.
- `qa:offline` : OK.

Note :

- Les scripts `qa:demo`, `qa:keypad` et `qa:history` ne sont pas adaptes tels quels a `8082`, car l'interface reelle demarre sur le login alors que ces scripts supposent une session demo deja authentifiee.

## Stabilisation CORS locale - 2026-05-26

La configuration `.env` de developpement autorise maintenant les deux familles d'URL locales :

- `http://localhost:8081`
- `http://localhost:8082`
- `http://127.0.0.1:8081`
- `http://127.0.0.1:8082`

Le backend Docker a ete recree apres modification :

```powershell
docker compose up -d --force-recreate backend
```

Verification backend :

```powershell
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

Resultat : OK.

Verification navigateur depuis `http://127.0.0.1:8082` :

- appel `/health` vers `http://127.0.0.1:4000` : OK ;
- appel `/auth/send-otp` vers `http://127.0.0.1:4000` : OK, `devCode` retourne ;
- aucun blocage CORS observe.

Note QA :

- `DISABLE_OTP_RATE_LIMIT=true` est active en `.env` pour les tests locaux Docker. Cela evite que les verifications repetees soient bloquees par le rate limit OTP pendant la reprise.
- `.env.example` garde `DISABLE_OTP_RATE_LIMIT=false` par defaut ; activez-le seulement dans `.env` local si les tests OTP repetes doivent etre rejoues sans attendre.

## Passe QA finale MVP - 2026-05-26

Commandes de validation courte :

```powershell
cd backend
npm test
cd ..
docker compose ps
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:keypad
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history
npm run qa:offline
npm run qa:receipt
```

Resultats observes :

- Backend Jest : OK, 7 suites, 39 tests.
- Docker : backend up, Postgres healthy, Redis healthy.
- `qa:real` : OK.
- `qa:demo` : OK.
- `qa:keypad` : OK.
- `qa:history` : OK.
- `qa:offline` : OK.
- `qa:receipt` : OK.

Etat de test recommande avant demo :

1. Verifier `docker compose ps`.
2. Ouvrir `http://localhost:8082` pour l'interface reelle.
3. Ouvrir `http://127.0.0.1:8081` pour la demo.
4. Relancer `qa:real`, `qa:demo`, `qa:keypad`, `qa:history`, `qa:offline`, `qa:receipt`.

## Etat apres push de stabilisation - 2026-05-26

Le lot MVP stable a ete pousse :

```text
b3ec034 chore: stabilize local MVP recovery flow
```

Avant toute demo ou nouveau commit, relancer la validation courte :

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

Le prochain commit peut etre documentaire uniquement. Il ne doit pas modifier l'interface ni l'API.

## Lot documentaire apres validation - 2026-05-26

Le commit documentaire pousse `0826d8f docs: add SMART sprint roadmap and beta planning` ne change aucun test ni comportement d'interface.

Commandes de test a relancer avant le prochain lot technique :

```powershell
cd backend
npm test
cd ..
npm run qa:demo
npm run qa:real
npm run qa:offline
```

Pour le lot scripts QA/lancement, verifier aussi les commandes ajoutees dans `package.json` avant commit.

## Verification lot scripts QA/lancement - 2026-05-26

Commandes validees :

```powershell
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"
cd backend
npm test
cd ..
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
npm run qa:offline
npm run qa:receipt
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history
$env:QA_APP_URL='http://127.0.0.1:8081'; $env:QA_CHROME_PORT='9561'; node scripts/qa-keypad-flow.js
```

Resultats :

- OK pour backend, API reelle, demo, historique, offline, recu et keypad.
- Si `npm run qa:keypad` expire sur le port Chrome par defaut, relancer avec un port libre :

```powershell
$env:QA_APP_URL='http://127.0.0.1:8081'
$env:QA_CHROME_PORT='9561'
node scripts/qa-keypad-flow.js
```

## Lot scripts commite - 2026-05-26

Commit local :

```text
6656485 test: add local launch and QA scripts
```

Commandes principales maintenant documentees par `package.json` :

- `npm run ui`
- `npm run ui:demo`
- `npm run ui:real:local`
- `npm run api:local`
- `npm run qa:real`
- `npm run qa:demo`
- `npm run qa:offline`
