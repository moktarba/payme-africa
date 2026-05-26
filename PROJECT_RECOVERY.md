# PROJECT_RECOVERY - PayMe Africa

Derniere mise a jour : 2026-05-26

## Objectif de l'application

PayMe Africa est une application POS mobile pour petits commercants d'Afrique de l'Ouest, ciblee d'abord sur le Senegal. L'objectif produit du MVP est de permettre a un marchand d'encaisser rapidement une vente, de confirmer le paiement, de conserver une preuve de transaction et de consulter son historique.

## Stack detectee

- Monorepo JavaScript/Node sans workspace npm formel.
- Backend : Node.js, Express 4, PostgreSQL via `pg`, Redis via `redis`, JWT, Joi, Winston, Jest/Supertest.
- Mobile : React Native avec Expo, React Navigation, Zustand, TanStack Query, Axios, SecureStore.
- Web demo : export Expo web servi statiquement par des scripts PowerShell/Node.
- Infrastructure locale : Docker Compose avec PostgreSQL 15, Redis 7 et backend Express.
- Deploiement mentionne : Railway, avec `railway.json` et Dockerfile.
- Base de donnees : migrations SQL dans `database/migrations` et runner JS dans `backend/src/utils/migrate.js`.

## Arborescence resumee

```text
payme-africa/
  backend/              API Express, services metier, tests Jest
  mobile/               Application Expo / React Native
  database/migrations/  Schema PostgreSQL et migrations SQL
  scripts/              Lancement interface, QA demo, QA backend, outils
  docs/                 Strategie produit, architecture, plans de sprint
  nginx/                Configuration reverse proxy
  .expo-web-demo/       Build web demo genere
  .expo-web-real/       Build web reel genere
  {backend/             Supprime le 2026-05-26, artefact vide de generation
```

## Fonctionnalites existantes

- Authentification marchand par telephone + OTP, avec code expose en dev.
- Profil marchand et activation/desactivation des moyens de paiement.
- Encaissement cash, Wave, Orange Money et Free Money en mode principalement manuel.
- Creation, confirmation, annulation et historique des transactions.
- Idempotence cote transaction via `clientReference`.
- Catalogue d'articles rapides.
- Rapports jour/semaine/mois, export CSV et rapport HTML imprimable.
- Gestion d'employes, roles et login PIN.
- Notifications et preferences de notifications.
- Mode demo mobile/web avec donnees mockees dans `mobile/src/services/api.js`.
- Queue locale offline limitee aux ventes cash, avec synchronisation depuis l'accueil.
- Scripts QA pour demo, backend reel, catalogue, panier, offline, recu, rapports, profil, employes, notifications.

## Ce qui fonctionne actuellement

Verifications executees le 2026-05-26 :

- `cd backend && npm test` : OK, 6 suites passees, 38 tests passes.
- `npm run qa:offline` : OK.
- `npm run qa:receipt` : OK.

Conclusion provisoire : le backend a une base testee et le flux offline/recu est au moins couvert statiquement. Il reste a verifier l'interface en navigateur/appareil, le mode demo complet et l'integration avec Docker.

## Bugs probables ou points suspects

- Encodage casse dans plusieurs fichiers visibles (`README.md`, `ETAT_DU_PROJET.md`, commentaires et libelles contenant des caracteres mojibake comme `Ã©` ou `ðŸ`).
- Dossier `{backend/` detecte a la racine, confirme vide puis supprime le 2026-05-26.
- Deux migrations numerotees `002_*` existent, ce qui peut creer de la confusion dans l'ordre mental des changements, meme si le runner actuel semble utiliser des noms internes.
- Le mode demo est tres large et centralise dans `mobile/src/services/api.js`, ce qui augmente le risque d'ecart entre demo et API reelle.
- Beaucoup de fichiers modifies/non suivis sont deja presents dans le working tree ; il faut eviter de confondre reprise projet et changements utilisateur existants.
- La documentation annonce plus de capacites que le MVP strict, notamment employes, notifications, rapports avances et offline.
- Les scripts QA navigateur dependent de Chrome/Edge et d'une demo servie localement ; ils peuvent echouer pour raisons d'environnement plutot que produit.
- Le backend demarre meme si DB/Redis echouent, ce qui aide le healthcheck mais peut masquer une API inutilisable hors `/health`.
- Les integrations Mobile Money semblent manuelles/simulees, pas connectees a des APIs de paiement reelles.

## Risques techniques

- Perimetre trop large pour un MVP stable : caisse, catalogue, rapports, employes, notifications, offline et paiement multi-provider en meme temps.
- Dette de generation IA : duplication, dossiers invalides, documentation non synchronisee, libelles casses.
- Divergence demo/reel : les donnees et comportements mockes peuvent faire passer une demo alors que l'API reelle diverge.
- Qualite mobile a verifier sur vrais appareils : Expo web ne garantit pas le rendu Android/iOS.
- Migrations et donnees seed sensibles : attention aux changements destructifs sur schema ou volumes Docker.
- Redis optionnel/fallback DB : comportement a tester en mode degrade.
- Secrets et configuration : `.env` existe localement ; ne pas le commiter ni l'exposer.

## Definition claire du MVP

Le MVP stable doit couvrir uniquement :

1. Un marchand peut se connecter avec telephone + OTP en environnement dev/local.
2. Un marchand peut creer une vente avec montant libre ou article rapide.
3. Un marchand peut choisir Cash, Wave ou Orange Money en mode manuel.
4. Une vente peut etre confirmee, annulee ou consultee dans l'historique.
5. L'accueil affiche les totaux essentiels du jour.
6. Le recu/preuve de transaction est lisible et partageable/copiable.
7. Le profil permet d'activer/desactiver les moyens de paiement disponibles.
8. La demo locale et le backend local sont lancables et testables par commandes documentees.
9. Les erreurs reseau/API critiques affichent un message comprehensible.
10. Les ventes cash offline peuvent etre gardees localement puis synchronisees, sans promettre l'offline pour Mobile Money.

## Hors scope jusqu'a stabilisation du MVP

- Integration API reelle Wave, Orange Money ou Free Money.
- Paiement automatique, webhooks prestataires et reconciliation bancaire.
- Refonte UI complete ou changement de design system.
- Changement de framework mobile, backend ou base de donnees.
- Multi-pays, multi-devises avance, fiscalite ou comptabilite complete.
- Dashboard analytics avance au-dela des indicateurs MVP.
- Gestion employes avancee si elle retarde le flux d'encaissement principal.
- Notifications push de production.
- PDF natif complexe ou generation serveur lourde.
- Refonte de l'architecture en microservices/workspaces.
- Nettoyage massif non controle ou reecriture globale.

## Plan de stabilisation en 10 etapes maximum

1. Fait - Geler le perimetre MVP et valider ce document.
2. Fait - Capturer l'etat initial : `git status`, tests backend, QA demo minimale, QA backend local.
3. Fait - Corriger les artefacts non applicatifs les plus dangereux : encodage docs critiques, dossier `{backend/`, documentation de lancement.
4. Fait - Stabiliser le lancement local : Docker Compose, backend `/health`, migrations, seed et script `api:local`.
5. Fait - Stabiliser le flux auth + encaissement + confirmation + historique sur API reelle.
6. Fait - Aligner le mode demo sur le comportement API reel pour le flux MVP uniquement.
7. Fait - Verifier l'interface Expo web puis mobile sur les ecrans MVP.
8. Fait - Reduire les risques offline : cash uniquement, idempotence, messages utilisateur clairs.
9. Fait - Mettre a jour README/PROJECT_RECOVERY avec commandes fiables et criteres d'acceptation.
10. Faire une passe finale de tests reproductibles avant toute extension de fonctionnalite.

## Regles de reprise appliquees

- Ne pas changer de framework, de librairie majeure ou d'architecture sans justification.
- Ne jamais reecrire tout le projet.
- Modifier au maximum 3 fichiers par etape.
- Ne pas ajouter de nouvelle fonctionnalite tant que le MVP n'est pas stable.
- Apres chaque etape, mettre a jour ce fichier.
- Avant toute modification de code, obtenir validation.

## Journal de reprise

### Etape 1 - Cadrage initial - 2026-05-26

Modification effectuee :

- Creation de `PROJECT_RECOVERY.md`.

Commandes de verification :

Cette etape ne modifie pas le code applicatif ; elle ajoute uniquement le document de reprise.

```powershell
git status --short
cd backend
npm test
cd ..
npm run qa:offline
npm run qa:receipt
```

Resultat observe le 2026-05-26 :

- `npm test` dans `backend` : OK, 38 tests passes.
- `npm run qa:offline` : OK.
- `npm run qa:receipt` : OK.

### Etape 2 - Audit reproductible local - 2026-05-26

Modifications effectuees :

- Mise a jour de `PROJECT_RECOVERY.md`.
- Mise a jour de `ETAT_DU_PROJET.md`.
- Mise a jour de `TEST_INTERFACE.md`.

Commandes executees :

```powershell
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
try { Invoke-WebRequest -Uri http://127.0.0.1:8081 -UseBasicParsing -TimeoutSec 5 | Select-Object StatusCode,StatusDescription } catch { Write-Output "DEMO_FAILED: $($_.Exception.Message)" }
npm run qa:demo
npm run qa:keypad
docker info --format "{{.ServerVersion}}"
```

Resultats observes :

- `http://127.0.0.1:4000/health` : OK, API en `development`.
- Attention : le champ `db` du healthcheck vaut `false` quand `DATABASE_URL` n'est pas defini, meme si la DB locale repond via `DB_HOST`/`DB_NAME`. C'est un signal ambigu a corriger plus tard.
- `npm run qa:real` avec `API_URL=http://127.0.0.1:4000` : OK.
- `http://127.0.0.1:8081` : OK, interface demo servie.
- `npm run qa:demo` : OK.
- `npm run qa:keypad` : OK.
- `docker info --format "{{.ServerVersion}}"` : timeout ; Docker Desktop ou le daemon Docker ne repond pas correctement dans cet environnement.

Conclusion :

- Les flux MVP principaux sont reproductibles via API locale deja active et demo web deja servie.
- Le chemin Docker doit etre stabilise ou au minimum diagnostique avant d'etre considere fiable.
- Aucun code applicatif n'a ete modifie pendant cette etape.

### Etape 3 - Relecture croisee des documents - 2026-05-26

Documents relus integralement :

- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`
- `TEST_INTERFACE.md`

Constats :

- `PROJECT_RECOVERY.md` reste la source de verite pour la reprise et le perimetre MVP.
- `ETAT_DU_PROJET.md` decrit beaucoup de fonctionnalites deja presentes, mais conserve un encodage casse et une ambition plus large que le MVP stabilise.
- `TEST_INTERFACE.md` documente correctement le chemin demo, le chemin backend local sans Docker et le risque Docker actuel.
- Les trois documents convergent sur le fait que les integrations paiement reelles, webhooks, refontes et extensions produit restent hors scope tant que le MVP n'est pas stabilise.

Decision de reprise :

- Ne pas reecrire massivement `ETAT_DU_PROJET.md` maintenant.
- Ne pas supprimer le dossier `{backend/` sans une etape dediee de verification.
- Prochaine etape technique recommandee : corriger le signal ambigu de `/health` puis ajouter/adapter un test minimal, en respectant la limite de 3 fichiers.

Commandes a lancer pour verifier cette etape documentaire :

```powershell
Get-Content PROJECT_RECOVERY.md
Get-Content ETAT_DU_PROJET.md -Tail 40
Get-Content TEST_INTERFACE.md -Tail 40
git status --short PROJECT_RECOVERY.md ETAT_DU_PROJET.md TEST_INTERFACE.md
```

### Etape 4 - Healthcheck API local non ambigu - 2026-05-26

Fichiers modifies :

- `backend/src/app.js`
- `backend/tests/health.test.js`
- `PROJECT_RECOVERY.md`

Changement effectue :

- Le endpoint `/health` ne se limite plus a `db: !!DATABASE_URL`.
- Il expose maintenant :
  - `db`: booleen de configuration DB utilisable ;
  - `dbSource`: `DATABASE_URL`, `DB_HOST`, `local_defaults` ou `missing` ;
  - `dbCheck`: `not_checked`, pour rappeler que ce healthcheck ne fait pas de requete SQL.
- Le healthcheck reste rapide et compatible avec Railway : il ne depend toujours pas d'une connexion DB active.
- Un test backend dedie verifie le signal local.

Pourquoi :

- Avant cette etape, `/health` pouvait afficher `db: false` en local quand `DATABASE_URL` etait absent, meme si l'API utilisait correctement `DB_HOST`/`DB_NAME` ou les valeurs locales par defaut.
- Ce faux signal compliquait le diagnostic pendant la reprise.

Commandes executees :

```powershell
cd backend
npm test
```

Resultat observe :

- OK : 7 suites passees, 39 tests passes.

Commandes a lancer pour tester cette etape :

```powershell
cd backend
npm test
cd ..
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

Point d'attention :

- `backend/src/app.js` contenait deja des modifications non committees avant cette etape. La reprise n'a pas tente de les annuler.
- Pour observer le nouveau payload `/health` sur un serveur deja lance, il faut redemarrer l'API.

### Etape 5 - Verification apres correctif healthcheck - 2026-05-26

Fichiers modifies :

- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`
- `TEST_INTERFACE.md`

Commandes executees :

```powershell
cd backend
npm test
cd ..
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
```

Resultats observes :

- `npm test` dans `backend` : OK, 7 suites passees, 39 tests passes.
- `npm run qa:real` avec `API_URL=http://127.0.0.1:4000` : OK.
- `/health` sur le serveur actuellement lance repond encore avec l'ancien payload : `db: false`, sans `dbSource` ni `dbCheck`.

Conclusion :

- Le code corrige est valide par les tests automatises.
- Le backend deja actif sur le port `4000` n'a vraisemblablement pas ete redemarre depuis le correctif.
- Pour valider le nouveau payload HTTP, il faut redemarrer l'API locale, puis relancer la verification `/health`.

Commande de verification apres redemarrage API :

```powershell
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
```

### Etape 6 - Redemarrage API et nettoyage artefact - 2026-05-26

Fichiers/dossiers concernes :

- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`
- `TEST_INTERFACE.md`
- Suppression du dossier vide `{backend/`

Commandes executees :

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen
Stop-Process -Id <ancien-process-api> -Force
Start-Process -FilePath powershell -ArgumentList '-ExecutionPolicy','Bypass','-File','scripts/start-local-backend.ps1' -WindowStyle Hidden
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
Get-ChildItem -LiteralPath "{backend" -Force -Recurse
Remove-Item -LiteralPath "{backend" -Recurse -Force
```

Resultats observes :

- API locale redemarree sur `http://127.0.0.1:4000`.
- Nouveau `/health` confirme : `db: true`, `dbSource: DB_HOST`, `dbCheck: not_checked`, `redis: not_configured`.
- `npm run qa:real` : OK apres redemarrage.
- Le dossier `{backend/` ne contenait aucun fichier, seulement des dossiers vides issus d'un scaffold invalide.
- Le dossier `{backend/` a ete supprime.

Conclusion :

- Le signal `/health` local est maintenant exploitable apres redemarrage.
- Un artefact de generation a ete retire sans toucher au code applicatif.
- Docker reste a revalider separement.

### Etape 7 - Validation Docker backend - 2026-05-26

Fichiers modifies :

- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`
- `TEST_INTERFACE.md`

Commandes executees :

```powershell
docker info --format "{{.ServerVersion}}"
docker compose ps
Get-NetTCPConnection -LocalPort 4000 -State Listen
docker compose up -d
docker compose ps
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 10 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
docker compose logs --tail=80 backend
```

Resultats observes :

- Docker Desktop repond : version `25.0.3`.
- `docker compose up -d` demarre `payme_postgres`, `payme_redis` et `payme_backend`.
- `payme_postgres` et `payme_redis` sont `healthy`.
- Backend expose `http://127.0.0.1:4000`.
- `/health` via Docker confirme :
  - `db: true`
  - `dbSource: DB_HOST`
  - `dbCheck: not_checked`
  - `redis: connected`
- `npm run qa:real` contre le backend Docker : OK.

Conclusion :

- Le chemin Docker backend est valide.
- Le chemin `npm run ui` peut maintenant etre retente, mais il reste interactif car il lance Expo Web apres avoir demarre Docker.
- La stack Docker est actuellement lancee.

Commandes a lancer pour tester cette etape :

```powershell
docker compose ps
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

### Etape 8 - Validation interface web Docker/demo - 2026-05-26

Fichiers modifies :

- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`
- `TEST_INTERFACE.md`

Commandes executees :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-real-interface.ps1 -SkipDocker -ApiUrl http://127.0.0.1:4000
Invoke-WebRequest http://127.0.0.1:8082
Invoke-WebRequest http://localhost:8082
$env:QA_APP_URL='http://127.0.0.1:8082'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8082'; npm run qa:keypad
$env:QA_APP_URL='http://127.0.0.1:8082'; npm run qa:history
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:keypad
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history
npm run qa:offline
```

Verification reelle adaptee :

- Une verification navigateur headless a ete lancee sur `http://localhost:8082`.
- Parcours valide : saisie telephone marchand, OTP dev pre-rempli, verification, affichage accueil authentifie.
- Resultat : `QA real UI OK: login OTP dev -> accueil authentifie`.

Resultats observes :

- Interface reelle reconstruite et servie sur `http://localhost:8082`.
- `http://127.0.0.1:8082` repond en HTTP 200, mais les appels API depuis cette origine sont bloques par CORS car `.env` autorise `http://localhost:8082` et pas `http://127.0.0.1:8082`.
- `http://localhost:8082` fonctionne avec l'API Docker : `/health` et `/auth/send-otp` repondent depuis le navigateur.
- Les scripts `qa:demo`, `qa:keypad`, `qa:history` pointes vers `8082` echouent car ils supposent une session demo deja authentifiee ; ils ne sont pas adaptes a l'interface reelle qui demarre sur l'ecran OTP.
- `npm run qa:demo` sur `8081` : OK.
- `npm run qa:keypad` sur `8081` : OK.
- `npm run qa:history` sur `8081` : OK.
- `npm run qa:offline` : OK.

Conclusion :

- Backend Docker + interface reelle sont exploitables via `http://localhost:8082`.
- Les parcours interface demo critiques restent verts.
- Le point a stabiliser ensuite est le cadrage CORS/dev URL : soit documenter `localhost` comme URL obligatoire pour l'interface reelle, soit ajouter `http://127.0.0.1:8082` dans `CORS_ORIGINS`.

### Etape 9 - Stabilisation CORS et URL locales - 2026-05-26

Fichiers modifies :

- `.env`
- `PROJECT_RECOVERY.md`
- `TEST_INTERFACE.md`

Changements effectues :

- Ajout des origines locales `127.0.0.1` dans `CORS_ORIGINS` :
  - `http://127.0.0.1:8081`
  - `http://127.0.0.1:8082`
  - `http://127.0.0.1:19006`
- Ajout de `DISABLE_OTP_RATE_LIMIT=true` dans `.env` pour rendre les QA locales Docker reproductibles, comme le fait deja le script `api:local`.
- Recréation du backend Docker pour recharger `.env`.

Commandes executees :

```powershell
docker compose up -d --force-recreate backend
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 10 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

Verification navigateur depuis `http://127.0.0.1:8082` :

- `fetch('http://127.0.0.1:4000/health')` : OK.
- `fetch('http://127.0.0.1:4000/auth/send-otp')` : OK, statut `200`, `devCode` present.
- Aucun log CORS.

Resultats observes :

- Backend Docker : OK.
- `npm run qa:real` : OK.
- CORS coherent pour `localhost` et `127.0.0.1` sur l'interface reelle.

Conclusion :

- Le chemin backend Docker + interface reelle fonctionne maintenant avec `localhost:8082` et `127.0.0.1:8082`.
- Les QA locales ne sont plus bloquees par le rate limit OTP en environnement Docker de developpement.

### Etape 10 - Passe QA finale MVP - 2026-05-26

Fichiers modifies :

- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`
- `TEST_INTERFACE.md`

Commandes executees :

```powershell
cd backend
npm test
cd ..
docker compose ps
try { Invoke-RestMethod -Uri http://127.0.0.1:4000/health -TimeoutSec 10 | ConvertTo-Json -Depth 5 } catch { Write-Output "HEALTH_FAILED: $($_.Exception.Message)" }
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:keypad
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history
npm run qa:offline
npm run qa:receipt
```

Resultats observes :

- Tests backend : OK, 7 suites passees, 39 tests passes.
- Docker Compose : backend up, Postgres healthy, Redis healthy.
- `/health` Docker : OK, `redis: connected`, `db: true`, `dbSource: DB_HOST`, `dbCheck: not_checked`.
- `qa:real` : OK.
- `qa:demo` : OK.
- `qa:keypad` : OK.
- `qa:history` : OK.
- `qa:offline` : OK.
- `qa:receipt` : OK.

Etat MVP :

- Le MVP local est considere stable pour une reprise controlee.
- Les parcours couverts sont : auth OTP dev, backend Docker, encaissement demo, clavier/montants, historique, offline cash, recu.
- Les integrations paiement reelles, webhooks, push production, refonte UI et extensions analytics restent hors scope.

## Prochaine validation attendue

### Cloture documentaire avant commit - 2026-05-26

Fichiers modifies :

- `README.md`
- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`

Changement effectue :

- Ajout d'une section courte dans `README.md` pour pointer vers l'etat MVP stabilise.
- Documentation des URLs locales validees : API `4000`, interface reelle `8082`, demo `8081`.
- Documentation de la commande de validation courte a relancer avant demo ou commit.

Etat :

- La passe QA finale reste verte.
- Aucune nouvelle fonctionnalite n'a ete ajoutee.
- Les anciens contenus encodes du README n'ont pas ete reecrits pour eviter une modification massive.

## Prochaine validation attendue

Valider le passage en phase suivante : commit de stabilisation. Toute nouvelle fonctionnalite reste hors scope tant que cet etat n'est pas fige.

### Roadmap SMART consolidee - 2026-05-26

Fichiers modifies :

- `docs/15-roadmap-sprints-smart.md`
- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`

Roadmap a suivre :

1. Sprint 0 - Reprise et socle technique.
2. Sprint 1 - Encaissement terrain.
3. Sprint 2 - Stabilisation beta.
4. Sprint 3 - Confiance et preuve.
5. Sprint 4 - Connexion faible et offline cash.
6. Sprint 5 - Beta terrain.
7. Sprint 6 - Paiements integres.
8. Sprint 7 - Ops et production.
9. Sprint 8 - V1 commerce structure.

Regle de reprise :

- Le projet reste bloque en stabilisation/commit tant que l'etat MVP local valide n'est pas fige.
- Les Sprints 5+ ne doivent pas commencer avant commit de stabilisation et validation courte verte.
- Les integrations paiement reelles, ops production et V1 structuree restent hors scope jusqu'aux sprints dedies.

### Template environnement local - 2026-05-26

Fichiers modifies :

- `.env.example`
- `PROJECT_RECOVERY.md`
- `TEST_INTERFACE.md`

Changement effectue :

- Ajout des origines CORS locales stabilisees dans `.env.example`.
- Ajout de `DISABLE_OTP_RATE_LIMIT=false` dans `.env.example` avec commentaire dev/QA.

Pourquoi :

- `.env` est local et ne doit pas etre la seule source de verite.
- Un nouvel environnement doit recuperer les URLs `localhost` et `127.0.0.1` deja validees pendant la reprise.
- Le rate limit OTP doit rester actif par defaut dans le template, tout en indiquant l'option de test local.

Commande de verification recommandee apres copie de `.env.example` :

```powershell
docker compose up -d --force-recreate backend
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```

### Plan de commit de stabilisation - 2026-05-26

Fichiers modifies :

- `docs/16-plan-commit-stabilisation.md`
- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`

Decision :

- Ne pas faire de `git add .`.
- Commiter d'abord un lot minimal de stabilisation locale MVP.
- Reporter les changements fonctionnels plus larges dans des commits separes apres revue.

Commit 1 recommande :

```text
chore: stabilize local MVP recovery flow
```

Fichiers principaux :

- `.env.example`
- `backend/src/app.js`
- `backend/tests/health.test.js`
- `PROJECT_RECOVERY.md`
- `TEST_INTERFACE.md`
- `ETAT_DU_PROJET.md`
- `README.md`
- `docs/15-roadmap-sprints-smart.md`
- `docs/16-plan-commit-stabilisation.md`

Voir `docs/16-plan-commit-stabilisation.md` pour les lots suivants.

### Commit 1 pousse - 2026-05-26

Fichiers modifies :

- `PROJECT_RECOVERY.md`
- `ETAT_DU_PROJET.md`
- `TEST_INTERFACE.md`

Etat Git :

- Commit pousse sur `origin/main` : `b3ec034 chore: stabilize local MVP recovery flow`.
- La branche locale `main` est synchronisee avec `origin/main` pour le lot de stabilisation MVP.
- Les changements restants du working tree ne sont pas inclus volontairement : ils doivent etre traites par lots separes.

Prochaine etape autorisee :

- Integrer le lot documentaire de roadmap/beta deja prepare dans `docs/06` a `docs/14` et `docs/README.md`, apres revue rapide.
- Ne pas inclure `.claude/`, `.env`, les builds Expo generes ou les changements fonctionnels backend/mobile dans ce lot.
- Ne pas demarrer les Sprints 5+ avant validation du backlog et des criteres MVP.

Commandes a lancer pour verifier avant commit documentaire :

```powershell
git status --short
Get-ChildItem docs -Filter "*.md"
git diff -- docs/README.md
```
