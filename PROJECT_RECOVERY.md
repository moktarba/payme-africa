# PROJECT RECOVERY — Payme Africa

> Procédures de récupération, rollback et remise en état du projet.
> À lire en premier en cas d'incident ou de reprise après interruption.

---

## Contacts et accès

| Ressource | Valeur |
|---|---|
| VPS path | `/opt/ai-factory/payme-africa` |
| Healthcheck prod | `https://api.faymafrica.fr/health` |
| n8n (déploiement) | `https://n8n.faymafrica.fr` |
| Repo GitHub | Voir remote : `git remote -v` |

---

## Démarrage rapide en local

```bash
# 1. Cloner et configurer
git clone <repo>
cd payme-africa
cp .env.example .env
# Éditer .env si nécessaire (valeurs par défaut fonctionnent en dev)

# 2. Démarrer les services
make start
# ou : docker compose up -d

# 3. Vérifier que tout tourne
make health
# Réponse attendue : {"success":true,"status":"ok",...}

# 4. Voir les logs backend
make logs-api

# 5. Lancer les tests
make test
```

Services démarrés par Docker Compose :
- PostgreSQL → `localhost:5432`
- Redis → `localhost:6379`
- API → `http://localhost:4000`

---

## Reprendre après une interruption

### Vérifier l'état du dépôt

```bash
git status          # fichiers stagés / modifiés
git log --oneline -5  # derniers commits
git stash list      # travail en attente éventuel
```

### Fichiers de référence à lire en premier

1. `CLAUDE.md` — règles de travail et stack
2. `ETAT_DU_PROJET.md` — fonctionnalités livrées et statut des tests
3. `PROJECT_RECOVERY.md` — ce fichier

### Branche de travail

Toujours travailler sur `feature/*`, jamais directement sur `main`.

```bash
git checkout feature/payme-africa-v1   # branche principale de dev
# ou créer une nouvelle feature branch :
git checkout -b feature/<nom-tache>
```

---

## Déploiement en production (pipeline actif : n8n)

```bash
curl -X POST https://n8n.faymafrica.fr/webhook/payme-deploy \
  -H "Content-Type: application/json" \
  -d '{"token":"faymafrica_2026_secret"}'
```

Le webhook n8n :
1. Se connecte au VPS
2. `git pull` sur `/opt/ai-factory/payme-africa`
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. Vérifie le healthcheck

**Vérifier le déploiement :**

```bash
curl https://api.faymafrica.fr/health
```

---

## Rollback en production

```bash
# Sur le VPS (SSH requis)
cd /opt/ai-factory/payme-africa
git log --oneline -5               # identifier le commit cible
git checkout <commit-hash>         # revenir à un état stable
docker compose -f docker-compose.prod.yml up -d --build
curl https://api.faymafrica.fr/health
```

---

## Railway (legacy — ne plus utiliser en priorité)

Railway était le premier hébergeur utilisé pour prototyper. Le fichier `railway.json` et le `Dockerfile` racine sont conservés pour compatibilité, mais le pipeline actif est **n8n vers VPS**.

Ne pas déclencher de déploiement Railway sans validation explicite.

---

## Diagnostics courants

### L'API ne répond pas

```bash
make status        # état des conteneurs Docker
make logs-api      # logs du backend
make health        # test du healthcheck
```

### Redis non connecté

Vérifier dans `/health` le champ `redis`. Si `disconnected` :
```bash
docker compose restart redis
# ou vérifier REDIS_URL / REDIS_PRIVATE_URL dans .env
```

### Migrations non appliquées

Les migrations sont automatiques au démarrage du backend. En cas de problème :
```bash
make logs-api | grep -i migrat
# Forcer le redémarrage :
docker compose restart backend
```

### Tests en échec

```bash
cd backend && npm test -- --verbose
# ou un seul fichier :
cd backend && npm test -- tests/auth.test.js
```

Les tests nécessitent PostgreSQL et Redis actifs (Docker Compose doit tourner).

---

## Variables d'environnement critiques

> Ne jamais committer les fichiers `.env` réels.
> Utiliser `.env.example` ou `.env.prod.example` comme référence.

| Variable | Usage | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | ✅ |
| `REDIS_URL` / `REDIS_PRIVATE_URL` | Connexion Redis | ✅ |
| `JWT_SECRET` | Signature tokens JWT | ✅ |
| `JWT_REFRESH_SECRET` | Signature refresh tokens | ✅ |
| `AT_API_KEY` | Africa's Talking (OTP SMS) | En prod |
| `AT_USERNAME` | Africa's Talking | En prod |
| `NODE_ENV` | `development` / `production` / `test` | ✅ |
| `CORS_ORIGINS` | Origines autorisées (séparées par virgule) | En prod |

En mode `development`, les OTP sont affichés dans les logs et dans la réponse JSON (`devCode`).

---

## Compte de test (seed)

```
Téléphone : +221 77 123 45 67
Commerce  : Boutique Aminata
Ville     : Dakar
```

Recréer le seed si la base est vide :
```bash
make seed
# ou : docker compose exec backend node src/utils/seed.js
```
