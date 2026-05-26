# Test faible connexion - Sprint 4

Objectif:
- verifier qu'une vente cash n'est pas perdue quand l'API est indisponible;
- verifier que la synchronisation reutilise la meme `clientReference`;
- verifier qu'aucun paiement mobile money n'est marque comme confirme offline.

## Pre-requis

Terminal 1:

```powershell
npm run api:local
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-real-interface.ps1 -SkipDocker -ApiUrl http://127.0.0.1:4000
```

Interface:
- `http://localhost:8082`

Compte test:
- telephone: `+221771234567`
- OTP: expose en developpement dans la reponse/logs.

## Scenario manuel

1. Ouvrir `http://localhost:8082`.
2. Se connecter au compte test.
3. Verifier que l'accueil charge les stats et les transactions recentes.
4. Couper l'API locale:

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

5. Dans l'app, lancer un encaissement cash.
6. Saisir un montant simple, par exemple `1000`.
7. Choisir `Especes`.
8. Verifier le message `Vente gardee en local`.
9. Retourner a l'accueil.
10. Verifier le bloc `A synchroniser`.
11. Verifier que la vente locale affiche montant, heure, reference courte et note.
12. Relancer l'API:

```powershell
npm run api:local
```

13. Cliquer `Sync`.
14. Verifier le message de synchronisation.
15. Verifier que le bloc `A synchroniser` disparait si tout est synchronise.
16. Ouvrir l'historique.
17. Verifier qu'une seule transaction correspondant au montant apparait.
18. Relancer `Sync` si le bouton est encore visible et verifier qu'aucun doublon n'est cree.

## Cas cache lecture

1. Avec l'API active, ouvrir l'accueil et l'historique.
2. Couper l'API.
3. Revenir sur l'accueil ou tirer pour rafraichir.
4. Verifier que les dernieres donnees connues restent visibles.
5. Verifier le bandeau `donnees ... non rafraichies`.
6. Rallumer l'API puis tirer pour rafraichir.
7. Verifier que le bandeau disparait.

## Limites connues

- Seules les ventes cash sont queuees offline.
- Les paiements Wave, Orange Money et Free Money restent en mode online/semi-manuel.
- La sync confirme automatiquement la vente cash apres creation backend.
- La resolution de conflit multi-appareils n'est pas couverte dans ce sprint.
- La suppression d'une vente locale se fait par appui long sur la ligne.

## Verifications automatisees associees

```powershell
npm run qa:offline
npm run qa:demo
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
```
