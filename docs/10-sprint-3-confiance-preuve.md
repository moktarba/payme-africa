# Sprint 3 - Confiance et Preuve

## Objectif SMART

D'ici la fin du sprint, 100% des transactions confirmees doivent produire une preuve claire, partageable et exploitable en cas de question client.

Mesures d'acceptation:
- chaque transaction confirmee affiche reference, montant, statut, date, moyen de paiement et vendeur si disponible;
- le recu est partageable depuis mobile;
- une annulation conserve un motif lisible;
- le detail transaction permet de comprendre ce qui s'est passe sans logs techniques.

## Sprint Goal

Reduire les litiges et augmenter la confiance commercant-client autour de la transaction.

## Backlog priorise

### P0 - Recu partageable mobile

User story:
- En tant que client, je peux recevoir une preuve simple par WhatsApp, SMS ou partage natif.

Criteres d'acceptation:
- le partage utilise l'API native quand disponible;
- le texte partage contient commerce, montant, statut, reference, date et moyen;
- le web garde un fallback copiable;
- le partage ne modifie pas la transaction.

Statut:
- implemente; texte du recu renforce avec statut, vendeur et motif quand disponibles, partage centralise avec fallback web "Recu a copier".

### P0 - Detail transaction renforce

User story:
- En tant que commercant, je peux retrouver les informations utiles d'une vente sans appeler le support.

Criteres d'acceptation:
- detail du panier visible;
- statut traduit en langage simple;
- reference visible et copiable;
- vendeur/employe affiche si disponible;
- motif d'annulation affiche si disponible.

Statut:
- en cours; ecran detail renforce avec reference complete, reference mobile/provider, statut explicite, dates, vendeur/client, motif d'annulation et facture.

### P0 - Annulation controlee

User story:
- En tant que commercant, je peux annuler une vente en attente avec une raison claire.

Criteres d'acceptation:
- annulation impossible pour une vente deja confirmee;
- motif obligatoire ou fortement encourage selon UX;
- historique affiche l'annulation;
- backend conserve `cancel_reason`.

Statut:
- en cours; annulation disponible depuis le detail avec choix de motif, conservation demo du motif et date d'annulation.

### P1 - Audit minimal exploitable

User story:
- En tant que support, je peux comprendre qui a confirme ou annule une transaction critique.

Criteres d'acceptation:
- confirmation et annulation creent une trace audit;
- l'audit conserve merchant, actor, action, transaction et date;
- aucune donnee sensible inutile n'est loggee;
- tests backend couvrent au moins confirmation et annulation.

Statut:
- implemente; confirmation et annulation ecrivent une trace `audit_logs`, couvert par tests backend.

### P1 - Messages d'erreur terrain

User story:
- En tant que vendeur presse, je comprends quoi faire si le reseau ou le paiement echoue.

Criteres d'acceptation:
- erreurs reseau courtes et actionnables;
- bouton reessayer visible;
- distinction entre paiement en attente, echec et annulation;
- aucun message technique brut cote mobile.

Statut:
- implemente; erreurs reseau, session, rate limit et statuts transaction sont normalises cote mobile via `err.userMessage`.

## Hors sprint

- PDF avance;
- signature numerique;
- reconciliation automatique provider;
- backoffice support complet.

## Plan de test sprint

1. Creer une transaction cash et confirmer.
2. Verifier le recu et le partage.
3. Creer une transaction Wave en attente.
4. Annuler avec motif.
5. Verifier historique et detail transaction.
6. Relancer les tests backend transactions.
7. Relancer `npm run qa:receipt` et `npm run qa:history`.

## Validation du 23/05/2026

Commandes passees:
- `npm run qa:receipt`;
- `npm run qa:demo`.
- `npm run qa:history`.
- `QA_CHROME_PORT=9363 npm run qa:demo` apres rebuild;
- `npx jest tests/transactions.test.js --runInBand --forceExit`;
- `npm test` dans `backend`;
- `API_URL=http://127.0.0.1:4000 npm run qa:real`.
- `npm run qa:errors`;

Changement valide:
- le generateur commun de recu partage maintenant le statut de la transaction;
- le recu inclut aussi le vendeur et le motif d'annulation quand ces donnees sont disponibles;
- le partage du recu passe par un helper commun avec fallback web copiable;
- le detail transaction affiche les preuves utiles et propose une annulation avec motif sur les transactions en attente;
- les confirmations et annulations produisent maintenant une trace audit backend;
- les messages d'erreur API sont centralises et reformules pour le terrain;
- l'export demo a ete reconstruit et sert `http://localhost:8081`.
