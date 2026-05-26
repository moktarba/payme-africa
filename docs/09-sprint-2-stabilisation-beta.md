# Sprint 2 - Stabilisation Beta

## Objectif SMART

D'ici la fin du sprint, une personne technique doit pouvoir lancer la demo, lancer le backend local, executer les tests critiques et comprendre l'etat du produit en moins de 10 minutes.

Mesures d'acceptation:
- `npm test` passe cote backend;
- `npm run ui:demo` charge une interface exploitable;
- les scripts QA demo critiques passent;
- le README et les docs de test refletent l'etat reel du produit;
- les changements du Sprint 1 sont prets a etre commites proprement.

## Sprint Goal

Transformer l'avance fonctionnelle actuelle en base beta propre, testable et transmissible.

## Backlog priorise

### P0 - Suite QA demo complete

User story:
- En tant que testeur, je peux verifier les parcours critiques sans inspection manuelle longue.

Criteres d'acceptation:
- `npm run qa:demo` passe;
- `npm run qa:cart` passe;
- `npm run qa:receipt` passe;
- `npm run qa:catalog` passe;
- `npm run qa:history` passe;
- `npm run qa:reports` passe;
- `npm run qa:profile` passe;
- `npm run qa:employees` passe;
- `npm run qa:notifications` passe;
- les erreurs detectees sont corrigees ou documentees comme limites connues.

Statut:
- valide le 23/05/2026.

### P0 - Backend reel valide

User story:
- En tant que developpeur, je sais que les parcours valides en demo fonctionnent aussi avec l'API reelle.

Criteres d'acceptation:
- `npm test` passe;
- `npm run qa:real` passe avec backend local;
- creation transaction, confirmation, notifications et employes restent coherents;
- les migrations se rejouent proprement sur une base vide.

Statut:
- valide le 23/05/2026 avec `npm test` et `API_URL=http://127.0.0.1:4000 npm run qa:real`.

### P0 - Documentation de lancement fiable

User story:
- En tant que nouvel arrivant, je peux lancer l'interface sans deviner quelle commande utiliser.

Criteres d'acceptation:
- README mis a jour avec demo, backend local et backend Docker;
- `TEST_INTERFACE.md` reste coherent avec les scripts npm;
- les anciennes mentions de roadmap obsoletes sont remplacees par la roadmap SMART;
- les comptes de test et OTP de dev sont documentes.

Statut:
- en cours; README roadmap alignee, fiche interface a jour.

### P0 - Nettoyage du working tree

User story:
- En tant que mainteneur, je peux relire et commiter le sprint sans melanger docs, scripts et code non relies.

Criteres d'acceptation:
- fichiers nouveaux classes entre docs, scripts, backend, mobile;
- fichiers temporaires exclus par `.gitignore`;
- `git diff --stat` relu;
- un commit logique peut etre prepare.

Statut:
- en cours; `git diff --stat` relu, commit logique a preparer apres revue finale.

### P1 - Verification UX mobile/web

User story:
- En tant que commercant testeur, je n'ai pas d'ecran blanc ni de texte critique casse.

Criteres d'acceptation:
- accueil, encaissement, confirmation, historique, profil et notifications verifiees;
- les boutons principaux restent visibles;
- les textes longs ne chevauchent pas les composants;
- les etats vides et erreurs reseau sont lisibles.

Statut:
- partiellement valide par QA navigateur headless; revue visuelle manuelle encore recommandee.

## Hors sprint

- integration Wave API;
- offline queue;
- dashboard web support;
- refonte visuelle majeure;
- paiement automatique.

## Plan de test sprint

1. Lancer `npm test` dans `backend`.
2. Lancer `npm run ui:demo`.
3. Lancer les scripts QA demo critiques.
4. Lancer `npm run api:local`.
5. Lancer `npm run ui:real:local`.
6. Lancer `npm run qa:real`.
7. Relire README, `TEST_INTERFACE.md` et docs sprint.
8. Relire `git diff --stat` avant commit.

## Validation du 23/05/2026

Commandes passees:
- `npm run qa:demo`;
- `npm run qa:cart`;
- `npm run qa:receipt`;
- `npm run qa:catalog`;
- `npm run qa:history`;
- `npm run qa:reports`;
- `npm run qa:profile`;
- `npm run qa:employees`;
- `npm run qa:notifications`;
- `npm test` dans `backend`;
- `API_URL=http://127.0.0.1:4000 npm run qa:real`.

Interfaces demarrees:
- demo: `http://localhost:8081`;
- API locale: `http://127.0.0.1:4000`;
- interface API reelle: `http://localhost:8082`.

Note:
- sur cette machine Windows, `127.0.0.1` a ete plus fiable que `localhost` pour verifier l'API locale.
