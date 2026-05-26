# Sprint 1 - Encaissement Terrain

## Objectif SMART

D'ici la fin du sprint, un testeur doit pouvoir ouvrir la demo, encaisser un montant libre ou un article rapide, choisir un moyen de paiement, confirmer la transaction et retrouver une trace lisible, sans intervention technique.

Mesures d'acceptation:
- build Expo web OK;
- demo accessible via `npm run ui:demo`;
- parcours encaissement libre verifie;
- parcours article rapide verifie;
- aucun ecran blanc;
- aucun texte casse sur les ecrans critiques.

## Sprint Goal

Transformer le prototype en parcours d'encaissement testable terrain.

## Backlog priorise

### P0 - Parcours encaissement libre

User story:
- En tant que commercant, je peux saisir un montant libre et continuer sans devoir choisir un produit.

Criteres d'acceptation:
- le clavier montant fonctionne;
- les montants rapides fonctionnent;
- le bouton continuer reste desactive si le montant est nul;
- le catalogue n'est jamais obligatoire.

Statut:
- implemente et verifie par `npm run qa:demo`.

### P0 - Articles rapides optionnels

User story:
- En tant que commercant qui vend souvent les memes articles, je peux toucher un article rapide pour ajouter son prix au montant.

Criteres d'acceptation:
- les articles s'affichent uniquement s'ils existent;
- toucher un article ajoute son prix au montant;
- le nom de l'article alimente la note;
- le lien de gestion pointe vers Articles rapides.

Statut:
- implemente et verifie par `npm run qa:demo`.

### P0 - Panier multi-achats

User story:
- En tant que commercant, je peux ajouter plusieurs achats sur une meme facture avant d'encaisser.

Criteres d'acceptation:
- plusieurs articles peuvent etre ajoutes au panier;
- les quantites peuvent etre augmentees ou diminuees;
- une ligne peut etre retiree;
- un montant libre peut etre ajoute au panier;
- le total facture est calcule automatiquement;
- le detail des lignes est conserve dans `itemsSnapshot`;
- le recu et la confirmation affichent le detail de la facture.

Statut:
- implemente et verifie par `npm run qa:cart` et `npm run qa:receipt`.

### P1 - Gestion des articles rapides

User story:
- En tant que commercant, je peux creer, modifier et supprimer mes articles rapides sans rendre le catalogue obligatoire.

Criteres d'acceptation:
- l'ecran rappelle que les articles rapides sont optionnels;
- le nombre d'articles disponibles est visible;
- creation, modification et suppression fonctionnent en demo;
- les categories simples restent lisibles;
- la recherche ne casse pas l'encaissement libre.

Statut:
- implemente et verifie par `npm run qa:catalog`.

### P0 - Recu apres confirmation

User story:
- En tant que client, je peux recevoir une preuve simple apres paiement.

Criteres d'acceptation:
- montant, mode, date, reference et statut sont visibles;
- le recu peut etre partage;
- la confirmation ne cree pas de doublon.

Statut:
- verifie par `npm run qa:demo`.

### P1 - Historique fiable

User story:
- En tant que commercant, je retrouve une transaction recente en cas de question client.

Criteres d'acceptation:
- l'historique liste les transactions recentes;
- les filtres statut fonctionnent;
- les statuts sont comprehensibles.

Statut:
- verifie par `npm run qa:demo`.

### P1 - Accueil et stats du jour fiables

User story:
- En tant que commercant, je vois immediatement si ma vente a bien augmente le chiffre d'affaires du jour.

Criteres d'acceptation:
- l'accueil se rafraichit au retour depuis un encaissement;
- le chiffre d'affaires ne compte que les transactions confirmees;
- les paiements en attente et annules restent visibles dans "A suivre";
- les transactions recentes acceptent les formats API camelCase et snake_case.

Statut:
- implemente et verifie par `npm run qa:demo`.

### P1 - Rapports utiles au pilotage

User story:
- En tant que commercant, je comprends rapidement mes ventes du jour, de la semaine et du mois sans outil externe.

Criteres d'acceptation:
- les rapports sont accessibles depuis l'accueil;
- le rapport jour affiche chiffre d'affaires, ventes confirmees, panier moyen, meilleure vente et paiements a suivre;
- le rapport jour reste synchronise avec les transactions demo;
- les onglets 7 jours et mois affichent une tendance lisible;
- les meilleurs articles sont visibles quand des articles rapides existent.

Statut:
- implemente et verifie par `npm run qa:reports`.

### P1 - Profil et moyens de paiement clairs

User story:
- En tant que commercant, je peux voir mes informations boutique et activer uniquement les moyens de paiement acceptes au comptoir.

Criteres d'acceptation:
- le profil affiche nom de boutique, telephone, ville et devise;
- les moyens de paiement actifs sont comptes clairement;
- chaque moyen peut etre active ou desactive;
- la demo garde l'etat apres modification;
- aucun texte critique n'est casse sur l'ecran profil.

Statut:
- implemente et verifie par `npm run qa:profile`.

### P1 - Employes et roles simples

User story:
- En tant que commercant avec plusieurs personnes au comptoir, je peux creer un employe, lui definir un role et suivre ses ventes du jour.

Criteres d'acceptation:
- l'ecran equipe est accessible depuis le profil;
- deux roles simples existent: caissier et manager;
- un employe peut etre cree et modifie;
- la desactivation est implementee cote interface et API demo;
- un PIN de connexion peut etre defini;
- les ventes par employe sont visibles en demo.

Statut:
- implemente et verifie par `npm run qa:employees` pour l'acces, la creation et le PIN.

### P1 - Notifications utiles commercant

User story:
- En tant que commercant, je vois rapidement les paiements en attente, confirmations et resumes utiles sans devoir chercher dans tout l'historique.

Criteres d'acceptation:
- les notifications sont accessibles depuis le profil;
- les alertes non lues sont comptees;
- une notification peut etre marquee comme lue;
- toutes les notifications peuvent etre marquees comme lues;
- les preferences principales sont modifiables en demo.

Statut:
- implemente et verifie par `npm run qa:notifications`.

### P1 - Backend reel aligne avec la demo

User story:
- En tant que commercant, les parcours valides en demo doivent produire les memes effets quand l'application utilise le backend reel.

Criteres d'acceptation:
- une transaction en attente cree une notification si la preference est active;
- une transaction confirmee cree une notification si la preference est active;
- une connexion employe par PIN peut notifier le commercant;
- les preferences partielles ne reinitialisent pas les autres choix;
- la liste employes expose uniquement les actifs et indique si un PIN est defini;
- les tests API couvrent notifications, transactions et employes.

Statut:
- implemente et verifie par `npm test` cote backend.

### P1 - Demo reproductible

User story:
- En tant que testeur, je peux lancer l'interface sans backend pour explorer le produit.

Criteres d'acceptation:
- `npm run ui:demo` construit et sert l'app;
- la demo contient marchand, transactions, articles rapides, rapports;
- la page charge sans erreur console critique.

Statut:
- implemente et verifie.

## Hors sprint

- Wave API automatique;
- Orange Money API;
- catalogue inventaire complet;
- multi-employes avance;
- offline complet;
- PDF avance.

## Plan de test sprint

1. Lancer `npm run ui:demo`.
2. Ouvrir `http://localhost:8081`.
3. Cliquer `Encaisser`.
4. Saisir `1500` au clavier.
5. Verifier que le bouton continue avec le montant.
6. Revenir et toucher un article rapide.
7. Verifier que son prix s'ajoute au montant.
8. Choisir cash ou Wave.
9. Confirmer.
10. Verifier le recu.
11. Revenir a l'accueil.
12. Verifier que le chiffre d'affaires du jour est mis a jour.
13. Verifier que "A suivre aujourd'hui" affiche les paiements en attente.
14. Ouvrir l'historique.
15. Verifier que la vente creee est retrouvee.
16. Ouvrir le detail transaction.
17. Verifier montant, mode de paiement et reference.

Verification automatisee:

```powershell
npm run qa:demo
npm run qa:history
npm run qa:reports
npm run qa:profile
npm run qa:catalog
npm run qa:employees
npm run qa:notifications
npm run qa:receipt
```
