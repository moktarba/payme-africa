# Sprints 6+ - Croissance et Production

Ce document garde les sprints apres beta dans le bon ordre. Ils ne doivent pas entrer avant validation terrain, sauf besoin business explicite.

## Sprint 6 - Paiements Integres

Objectif:
- automatiser progressivement les statuts de paiement sans perdre le fallback manuel.

Backlog priorise:
- P0 Wave API Business si acces disponible;
- P0 webhooks Wave avec verification de signature;
- P0 reconciliation statut transaction;
- P0 fallback manuel si API indisponible;
- P1 Orange Money API;
- P1 Free Money API;
- P1 alertes paiement en anomalie.

Criteres d'acceptation:
- un paiement integre peut passer de pending a completed sans confirmation manuelle;
- les webhooks sont idempotents;
- une transaction ambigue passe en `needs_review` ou statut equivalent;
- aucun provider integre ne casse cash/Wave manuel.

## Sprint 7 - Ops et Production

Objectif:
- rendre l'application exploitable serieusement en production.

Backlog priorise:
- P0 CI/CD fiable;
- P0 backups PostgreSQL;
- P0 monitoring healthcheck et erreurs 5xx;
- P0 gestion secrets dev/staging/prod;
- P0 logs sans donnees sensibles;
- P1 alerting;
- P1 scripts support;
- P1 runbook incident.

Criteres d'acceptation:
- deploiement reproductible;
- restauration backup testee;
- incident API documente avec procedure;
- logs permettent de retrouver une transaction sans exposer de PII inutile.

## Sprint 8 - V1 Commerce Structure

Objectif:
- ajouter les fonctionnalites utiles aux commerces plus structures apres preuve terrain.

Backlog possible:
- employes avances et permissions fines;
- export PDF propre;
- dashboard web support/admin;
- inventaire leger;
- multi-boutiques;
- rapports avances;
- abonnement et limites de plan.

Criteres d'acceptation:
- chaque fonctionnalite est reliee a un signal beta;
- aucune option n'alourdit l'encaissement principal;
- les roles et permissions sont testes;
- le support peut diagnostiquer les cas critiques.

## Regle de decision

Une story de croissance entre en sprint seulement si elle repond a au moins un critere:
- demandee par plusieurs testeurs du meme segment;
- reduit un blocage terrain mesure;
- reduit fortement le support;
- ouvre un revenu clair sans ralentir l'encaissement.
