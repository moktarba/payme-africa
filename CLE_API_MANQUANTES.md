# Clés API manquantes — PayMe Africa
> Généré le 2026-06-19 par Claude Cowork (CTO IA)

## Statut actuel

L'application tourne en **mode dégradé fonctionnel** :
- Auth OTP : mode dev (OTP visible dans la réponse, pas de vrai SMS)
- Wave : mode manuel (instructions texte, pas de checkout API)
- Orange Money, FreeMoney, PayDunya : non activés
- SMS Africa's Talking : désactivé

---

## Variables à configurer sur le VPS

### Fichier : `/opt/ai-factory/payme-africa/.env` (ou docker-compose.yml → environment)

```bash
# ─── SMS (Africa's Talking) ──────────────────────────────────────
# Obligatoire pour envoyer de vrais SMS OTP en prod
AT_USERNAME=paymeafrica          # Votre username sur africasTalking.com
AT_API_KEY=<votre_clé>           # Dashboard → API Keys
AT_SENDER_ID=PayMe               # Short code ou nom approuvé

# ─── WAVE ────────────────────────────────────────────────────────
# Obligatoire pour le checkout Wave automatique (actuellement mode manuel)
WAVE_API_KEY=<votre_clé_wave>         # Partner Portal Wave
WAVE_WEBHOOK_SECRET=<secret_webhook>  # Pour vérifier signatures HMAC

# ─── ORANGE MONEY ────────────────────────────────────────────────
# Pour activer les paiements Orange Money
ORANGE_MONEY_API_KEY=<votre_clé>
ORANGE_MONEY_MERCHANT_ID=<votre_merchant_id>
FEATURE_ORANGE_ENABLED=true

# ─── FREE MONEY ──────────────────────────────────────────────────
FREE_MONEY_API_KEY=<votre_clé>
FREE_MONEY_MERCHANT_ID=<votre_merchant_id>
FEATURE_FREE_MONEY_ENABLED=true

# ─── PAYDUNYA ────────────────────────────────────────────────────
PAYDUNYA_MASTER_KEY=<votre_master_key>
PAYDUNYA_PRIVATE_KEY=<votre_private_key>
PAYDUNYA_TOKEN=<votre_token>
PAYDUNYA_MODE=live                     # ou test
PAYDUNYA_CALLBACK_URL=https://api.faymafrica.fr/webhooks/paydunya
FEATURE_PAYDUNYA_ENABLED=true

# ─── FEATURES FLAGS ──────────────────────────────────────────────
FEATURE_WAVE_ENABLED=true
```

---

## Ce qui fonctionne SANS clés (mode actuel)

| Fonctionnalité | Sans clé | Avec clé |
|---|---|---|
| Auth OTP | ✅ devCode dans réponse API | ✅ vrai SMS |
| Wave | ✅ instructions texte au marchand | ✅ checkout automatique |
| Cash | ✅ 100% | — |
| Orange Money | ❌ désactivé | ✅ paiement auto |
| FreeMoney | ❌ désactivé | ✅ paiement auto |
| PayDunya | ❌ désactivé | ✅ multi-provider |

---

## Comment configurer sur le VPS

### Option A — via docker-compose.yml (recommandé)

```yaml
services:
  backend:
    environment:
      AT_API_KEY: ${AT_API_KEY}
      WAVE_API_KEY: ${WAVE_API_KEY}
      # ...
```

Puis créer `/opt/ai-factory/payme-africa/.env` avec les valeurs.

### Option B — commande directe Hermès / devops-docker-control

```bash
# Sur le VPS, éditer le fichier .env existant :
nano /opt/ai-factory/payme-africa/.env

# Puis rebuild sans docker-compose V1 :
docker build -t payme-backend /opt/ai-factory/payme-africa/
docker stop payme_backend
docker run -d --name payme_backend \
  --env-file /opt/ai-factory/payme-africa/.env \
  --network payme_default \
  -p 4000:4000 \
  payme-backend
```

> ⚠️ Ne jamais utiliser `docker-compose up --build` — bug KeyError ContainerConfig sur ce VPS.

---

## Priorité

1. **AT_API_KEY** (Africa's Talking) — pour les vrais SMS OTP en production
2. **WAVE_API_KEY** — Wave est le moyen de paiement principal au Sénégal
3. Orange Money, FreeMoney — selon la base clients
4. PayDunya — optionnel (agrégateur multi-provider)
