# Roadmap Sprints SMART - PayMe Africa

Derniere mise a jour : 2026-05-26

## Objectif Nord

D'ici 4 semaines de beta controlee, permettre a 10 commercants testeurs de realiser au moins 50 encaissements de test ou reels avec moins de 2 blocages majeurs par commercant.

Mesures principales :

- transactions initiees ;
- transactions confirmees ;
- temps median d'encaissement ;
- recus partages ;
- bugs bloquants par commercant ;
- retours terrain classes par impact et frequence.

## Regles de pilotage

- Stabiliser avant d'etendre.
- Une fonctionnalite entre en sprint seulement si elle sert l'encaissement, la preuve, la fiabilite terrain ou un signal beta mesure.
- Les integrations paiement reelles, webhooks, push production, analytics avances et refontes UI restent hors scope tant que le MVP local n'est pas fige.
- Chaque sprint doit avoir une definition de done testable par commandes, demo ou retours terrain.

## Sprint 0 - Reprise et socle technique

Objectif SMART :

- D'ici la fin du sprint, une personne technique doit pouvoir comprendre la stack, lancer le backend, lancer une interface et executer les tests critiques sans reecrire le projet.

Livrables :

- `PROJECT_RECOVERY.md` a jour ;
- stack reelle identifiee ;
- MVP et hors scope explicites ;
- Docker/backend local valides ;
- artefacts inutiles identifies ou supprimes ;
- commandes de test documentees.

Mesures d'acceptation :

- `npm test` passe cote backend ;
- `/health` expose un signal local non ambigu ;
- `npm run qa:real` passe ;
- `npm run qa:demo`, `qa:keypad`, `qa:history`, `qa:offline`, `qa:receipt` passent ;
- README et documents de reprise indiquent le chemin stable.

Statut actuel :

- Realise pendant la reprise du 2026-05-26.

## Sprint 1 - Encaissement terrain

Objectif SMART :

- D'ici la fin du sprint, un testeur peut ouvrir la demo, encaisser un montant libre ou un article rapide, choisir un moyen de paiement, confirmer la transaction et retrouver une trace lisible sans intervention technique.

Livrables :

- montant libre ;
- articles rapides optionnels ;
- panier simple ;
- choix Cash/Wave/Orange Money manuel ;
- confirmation ;
- recu ;
- historique ;
- stats du jour.

Mesures d'acceptation :

- 90% des encaissements de test realisables en moins de 30 secondes ;
- aucun ecran blanc sur le parcours critique ;
- `npm run qa:demo`, `npm run qa:keypad`, `npm run qa:history`, `npm run qa:receipt` passent.

Statut actuel :

- Fonctionnel et valide localement.

## Sprint 2 - Stabilisation beta

Objectif SMART :

- D'ici la fin du sprint, une personne technique peut lancer la demo, le backend local, l'interface reelle et les tests critiques en moins de 10 minutes avec la documentation.

Livrables :

- Docker Compose stable ;
- interface demo stable ;
- interface reelle connectee au backend ;
- CORS local coherent entre `localhost` et `127.0.0.1` ;
- scripts QA critiques documentes ;
- README et `TEST_INTERFACE.md` alignes.

Mesures d'acceptation :

- `docker compose up -d` demarre Postgres, Redis et backend ;
- `/health` OK ;
- `npm run qa:real` OK ;
- `npm run qa:demo`, `qa:keypad`, `qa:history`, `qa:offline`, `qa:receipt` OK ;
- les limites connues sont documentees.

Statut actuel :

- Fonctionnel et valide localement.

## Sprint 3 - Confiance et preuve

Objectif SMART :

- D'ici la fin du sprint, 100% des transactions confirmees produisent une preuve claire, partageable et exploitable en cas de question client.

Livrables :

- recu lisible ;
- reference transaction visible ;
- statut clair ;
- detail transaction comprehensible ;
- annulation avec motif ;
- audit minimal support.

Mesures d'acceptation :

- chaque transaction confirmee affiche montant, mode, date, reference et statut ;
- le recu est partageable ou copiable ;
- `npm run qa:receipt` passe ;
- les tests transactions backend passent.

Statut actuel :

- Fonctionnel et valide localement.

## Sprint 4 - Connexion faible et offline cash

Objectif SMART :

- D'ici la fin du sprint, un commercant peut enregistrer une vente cash quand la connexion est instable, puis la synchroniser sans doublon au retour reseau.

Livrables :

- queue locale cash ;
- `clientReference` persistante ;
- synchronisation idempotente ;
- indicateur "a synchroniser" ;
- cache lecture simple pour accueil/historique ;
- procedure de test faible connexion.

Mesures d'acceptation :

- 100% des ventes cash offline synchronisees reutilisent la meme `clientReference` ;
- aucune vente mobile money n'est presentee comme confirmee offline ;
- `npm run qa:offline` passe ;
- test manuel coupure/reprise documente.

Statut actuel :

- Basique implemente et verification statique OK ; test manuel terrain encore recommande avant beta.

## Sprint 5 - Beta terrain

Objectif SMART :

- D'ici la fin du sprint, 10 commercants testeurs peuvent realiser au moins 50 encaissements de test ou reels avec moins de 2 blocages majeurs par commercant.

Livrables :

- environnement beta/staging stable ;
- comptes testeurs ;
- guide testeur ;
- collecte retours structuree ;
- KPIs minimum ;
- backlog retours terrain ;
- procedure support minimum.

Mesures d'acceptation :

- 10 testeurs onboardes ;
- 50 encaissements minimum ;
- moins de 2 blocages majeurs par commercant ;
- retours classes par impact/frequence ;
- bugs bloquants priorises.

Statut actuel :

- A faire apres commit de stabilisation MVP.

## Sprint 6 - Paiements integres

Objectif SMART :

- D'ici la fin du sprint, automatiser progressivement les statuts de paiement sans perdre le fallback manuel.

Livrables :

- Wave API Business si acces disponible ;
- webhooks signes et idempotents ;
- reconciliation statut transaction ;
- fallback manuel preserve ;
- gestion des transactions ambigues.

Mesures d'acceptation :

- un paiement integre peut passer de pending a completed sans confirmation manuelle ;
- les webhooks sont idempotents ;
- cash et paiement manuel restent fonctionnels ;
- les transactions ambigues sont visibles pour revue.

Statut actuel :

- Hors scope jusqu'a validation beta terrain.

## Sprint 7 - Ops et production

Objectif SMART :

- D'ici la fin du sprint, l'application peut etre exploitee en production avec deploiement, sauvegardes, monitoring et procedures incident reproductibles.

Livrables :

- CI/CD fiable ;
- backups PostgreSQL ;
- monitoring healthcheck et erreurs 5xx ;
- gestion secrets dev/staging/prod ;
- logs sans donnees sensibles ;
- alerting ;
- runbook incident ;
- scripts support.

Mesures d'acceptation :

- deploiement reproductible ;
- restauration backup testee ;
- incident API documente avec procedure ;
- logs utiles sans exposition de donnees sensibles inutiles.

Statut actuel :

- Hors scope MVP, a planifier avant production reelle.

## Sprint 8 - V1 commerce structure

Objectif SMART :

- D'ici la fin du sprint, ajouter uniquement les fonctionnalites demandees par la beta qui aident les commerces plus structures sans ralentir l'encaissement principal.

Livrables possibles :

- employes avances et permissions fines ;
- export PDF propre ;
- dashboard web support/admin ;
- inventaire leger ;
- multi-boutiques ;
- rapports avances ;
- abonnement et limites de plan.

Mesures d'acceptation :

- chaque fonctionnalite est reliee a un signal beta ;
- aucune option n'alourdit l'encaissement principal ;
- roles et permissions testes ;
- support capable de diagnostiquer les cas critiques.

Statut actuel :

- Hors scope MVP, a prioriser uniquement avec signaux beta.

## Synthese d'ordre d'execution

1. Sprint 0 - Reprise et socle technique.
2. Sprint 1 - Encaissement terrain.
3. Sprint 2 - Stabilisation beta.
4. Sprint 3 - Confiance et preuve.
5. Sprint 4 - Connexion faible et offline cash.
6. Sprint 5 - Beta terrain.
7. Sprint 6 - Paiements integres.
8. Sprint 7 - Ops et production.
9. Sprint 8 - V1 commerce structure.

## Prochaine decision

Avant tout Sprint 5 ou Sprint 6, figer l'etat MVP actuel par commit de stabilisation et relancer la validation courte :

```powershell
cd backend
npm test
cd ..
$env:API_URL='http://127.0.0.1:4000'; npm run qa:real
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:demo
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:keypad
$env:QA_APP_URL='http://127.0.0.1:8081'; npm run qa:history
npm run qa:offline
npm run qa:receipt
```
