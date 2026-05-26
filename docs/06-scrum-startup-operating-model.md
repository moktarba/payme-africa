# PayMe Africa - Operating Model Scrum Startup

## Mission

Construire un MVP terrain qui permet a un petit commercant d'encaisser, prouver et suivre ses ventes en moins de 30 secondes, sans imposer un catalogue ou une complexite de caisse traditionnelle.

## Equipe virtuelle

### Product Owner

Responsabilites:
- definir la valeur utilisateur et business;
- prioriser le backlog;
- accepter ou refuser les stories;
- proteger le MVP contre les fonctionnalites prematurees.

Decision produit actuelle:
- l'encaissement libre est le parcours principal;
- les articles rapides sont optionnels;
- le recu, l'historique et le total du jour sont plus importants qu'un catalogue complet.

### Chef de projet / Scrum Master

Responsabilites:
- tenir le sprint court et testable;
- limiter le work in progress;
- transformer les objectifs en livrables mesurables;
- remonter les blocages.

Cadence:
- sprint court: 1 semaine;
- daily async: objectifs du jour, blocages, resultat attendu;
- review: demonstration d'un flux utilisateur;
- retro: 3 points maximum a ameliorer.

### Developpeur Frontend Mobile

Responsabilites:
- ergonomie React Native / Expo;
- parcours terrain rapide;
- lisibilite mobile;
- etats vides, erreurs, loading et demo mode.

Critere de qualite:
- aucun ecran blanc;
- aucun texte casse;
- les actions principales sont visibles sans formation.

### Developpeur Backend

Responsabilites:
- API Express;
- auth, transactions, merchants, reports;
- migrations et seed;
- idempotence et statuts transaction.

Critere de qualite:
- endpoints critiques testes;
- erreurs API explicites;
- donnees de demo et staging reproductibles.

### QA / Testeur

Responsabilites:
- tester les parcours critiques;
- verifier les regressions;
- documenter les bugs reproductibles;
- valider la Definition of Done.

Parcours critiques:
- ouvrir la demo;
- encaisser un montant libre;
- utiliser un article rapide;
- choisir un moyen de paiement;
- confirmer et obtenir un recu;
- retrouver la transaction dans l'historique.

## Definition of Ready

Une story peut entrer en sprint si:
- la valeur utilisateur est claire;
- le comportement attendu est testable;
- les ecrans/API touches sont identifies;
- les criteres d'acceptation sont ecrits;
- la story peut etre terminee dans le sprint.

## Definition of Done

Une story est terminee si:
- le code est implemente;
- le mode demo fonctionne quand c'est pertinent;
- les textes visibles sont propres;
- le build web Expo passe;
- le parcours est verifie manuellement ou par script;
- les limites connues sont documentees.

## Definition of MVP Terrain

Le MVP terrain est pret quand:
- un commercant peut encaisser cash ou Wave manuel sans accompagnement;
- le recu est partageable;
- l'historique permet de retrouver une vente;
- les stats du jour sont fiables;
- l'app reste utilisable sur mobile avec connexion instable;
- les donnees de test sont reproductibles.

## Regles de priorisation

Ordre de decision:
1. reduire la friction d'encaissement;
2. augmenter la confiance transactionnelle;
3. rendre les ventes visibles;
4. faciliter le support et les tests;
5. ajouter les options de productivite.

Anti-priorites avant validation terrain:
- catalogue obligatoire;
- reporting complexe;
- multi-boutique;
- integrations paiement profondes;
- automatisations qui masquent le statut reel du paiement.
