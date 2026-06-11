# Payme Africa — Instructions Claude

## Mission

Aider à développer, corriger, tester et documenter Payme Africa sans casser l'existant.

---

## Règles obligatoires

- Ne jamais modifier directement `main`. Toujours travailler sur une branche `feature/*`.
- Lire **dans cet ordre** avant toute modification :
  1. `README.md`
  2. `ETAT_DU_PROJET.md`
  3. `PROJECT_RECOVERY.md`
- Proposer un plan avant de coder.
- Ne jamais supprimer du code sans expliquer pourquoi.
- Ne jamais modifier les fichiers `.env` réels.
- Utiliser uniquement `.env.example` ou `.env.prod.example` pour la documentation.
- Ne pas toucher aux fichiers backend, mobile, Docker ou CI sans validation explicite du développeur.

### Après chaque modification, proposer :

1. Résumé des changements
2. Liste des fichiers modifiés
3. Tests à lancer
4. Commande de déploiement n8n si applicable

---

## Stack

- Backend : Node.js 20 / Express
- Base de données : PostgreSQL 15
- Cache / Sessions : Redis 7
- Mobile : React Native + Expo
- Containerisation : Docker Compose
- CI : GitHub Actions
- Déploiement (actif) : **n8n webhook → VPS**
- VPS : `/opt/ai-factory/payme-africa`
- Healthcheck : `https://api.faymafrica.fr/health`

---

## Déploiement — Pipeline actif : n8n

```bash
curl -X POST https://n8n.faymafrica.fr/webhook/payme-deploy \
  -H "Content-Type: application/json" \
  -d '{"token":"faymafrica_2026_secret"}'
```

### Railway — Legacy / optionnel

Railway a été utilisé pour le prototypage initial. Le fichier `railway.json` et le `Dockerfile`
racine sont conservés mais **ne constituent pas le pipeline de déploiement actif**.
Ne pas déclencher de déploiement Railway sans validation explicite.

---

## Fichiers de référence

| Fichier | Rôle |
|---|---|
| `README.md` | Installation, parcours utilisateur, API, roadmap |
| `ETAT_DU_PROJET.md` | Fonctionnalités livrées, statut tests, environnements |
| `PROJECT_RECOVERY.md` | Procédures de reprise, rollback, diagnostics, variables d'env |

---

## Historique des corrections CLAUDE.md

- **2026-06-10** : Réécriture complète — correction du formatage (commande shell embarquée), ajout de
  `ETAT_DU_PROJET.md` et `PROJECT_RECOVERY.md` (fichiers créés, précédemment absents), clarification
  n8n comme pipeline actif et Railway comme legacy.
