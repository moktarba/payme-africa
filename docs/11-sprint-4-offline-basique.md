# Sprint 4 - Connexion Faible et Offline Basique

## Objectif SMART

D'ici la fin du sprint, un commercant doit pouvoir preparer ou enregistrer une vente cash quand la connexion est instable, puis la synchroniser sans doublon au retour reseau.

Mesures d'acceptation:
- une vente cash peut etre mise en attente locale;
- chaque vente locale a une `clientReference` persistante;
- la synchronisation cree une seule transaction backend;
- l'utilisateur voit clairement ce qui est synchronise ou non;
- les paiements mobile money ne sont pas presentes comme confirmes offline.

## Sprint Goal

Proteger la valeur terrain sans promettre un offline total trop risque.

## Backlog priorise

### P0 - File locale des ventes cash

User story:
- En tant que vendeur, je peux enregistrer une vente cash meme si le reseau tombe.

Criteres d'acceptation:
- montant, note, panier, date locale et clientReference sont stockes localement;
- la vente locale est marquee "a synchroniser";
- l'utilisateur ne perd pas la vente en fermant l'app;
- cash uniquement pour ce sprint.

Statut:
- en cours; ventes cash conservees localement si l'API est inaccessible pendant l'encaissement.

### P0 - Synchronisation idempotente

User story:
- En tant que commercant, je ne veux pas creer deux ventes si la synchronisation est relancee.

Criteres d'acceptation:
- la meme `clientReference` est reutilisee jusqu'au succes;
- le backend retourne la transaction existante si deja creee;
- l'app marque localement la vente comme synchronisee;
- les erreurs temporaires gardent la vente en file.

Statut:
- en cours; la sync reutilise la `clientReference` stockee localement et confirme la vente cash apres creation.

### P0 - Ecran/indicateur "A synchroniser"

User story:
- En tant que commercant, je sais combien de ventes attendent le reseau.

Criteres d'acceptation:
- compteur visible depuis accueil ou historique;
- liste minimale des ventes en attente locale;
- action "reessayer" disponible;
- message clair si la synchronisation echoue.

Statut:
- en cours; compteur "A synchroniser", liste des ventes locales, dernier message d'erreur et action Sync visibles sur l'accueil.

### P1 - Cache lecture simple

User story:
- En tant que commercant, je peux consulter les dernieres infos utiles meme sans connexion.

Criteres d'acceptation:
- dernier profil connu disponible;
- dernier historique connu disponible;
- dernier total du jour connu affiche comme donnees non rafraichies;
- l'app distingue cache et donnees live.

Statut:
- implemente pour l'accueil et l'historique: dernier total du jour et dernieres transactions sont affiches en cache avec un bandeau "donnees non rafraichies".

### P1 - Tests faible connexion

User story:
- En tant que QA, je peux reproduire un flux offline sans manipulation fragile.

Criteres d'acceptation:
- scenario documente;
- test manuel de coupure/reprise reseau;
- cas doublon couvert par test backend ou script QA;
- limites connues documentees.

Statut:
- documente dans `docs/14-test-faible-connexion.md`; verification statique couverte par `npm run qa:offline`, test manuel coupure/reprise API a executer avant beta terrain.

## Hors sprint

- offline mobile money;
- resolution complexe de conflits;
- queue serveur type BullMQ;
- synchronisation multi-appareils avancee.

## Plan de test sprint

1. Couper l'acces API ou simuler une erreur reseau.
2. Creer une vente cash.
3. Verifier qu'elle reste visible en local.
4. Retablir l'API.
5. Lancer la synchronisation.
6. Verifier qu'une seule transaction est creee.
7. Relancer la synchronisation et verifier l'idempotence.

## Validation du 25/05/2026

Commandes passees:
- `npm run qa:offline`;
- `QA_CHROME_PORT=9366 npm run qa:demo`;
- `npm run qa:errors`.
- `QA_CHROME_PORT=9371 npm run qa:demo`;
- `API_URL=http://127.0.0.1:4000 npm run qa:real`;
- `npm test` dans `backend`.
- `QA_CHROME_PORT=9372 npm run qa:demo`;
- `npm run qa:history`.
- `docs/14-test-faible-connexion.md` ajoute pour le test manuel coupure/reprise API.

Changement valide:
- ajout d'une queue locale `offlineCashQueue`;
- encaissement cash garde en local si le reseau/API est indisponible;
- l'accueil affiche les ventes cash a synchroniser avec montant, heure, reference courte et erreurs de sync;
- la synchronisation reutilise la `clientReference` persistante;
- une vente locale peut etre retiree par appui long si elle ne doit pas etre synchronisee;
- l'accueil et l'historique utilisent un cache local de lecture si l'API ne repond pas;
- les donnees cachees sont signalees comme non rafraichies;
- les paiements mobile money ne sont pas marques comme confirmes offline.
