# Livrable 2 - Carte des fonctionnalites

| Fonctionnalite | Segment | Douleur resolue | Priorite | Complexite | Horizon | Dependances |
|---|---|---|---|---|---|---|
| Inscription telephone + OTP | A, B, C | Commencer sans friction | Haute | Faible | MVP | SMS/OTP |
| Profil commercant Niveau 1 | A, B, C | Identifier le vendeur et son contexte | Haute | Faible | MVP | Auth |
| Encaissement simple montant libre | A, B, C | Encaisser tout de suite | Haute | Faible | MVP | Auth, transaction |
| Choix du moyen de paiement | A, B, C | S'adapter au cash et mobile money | Haute | Faible | MVP | Connecteurs |
| Confirmation manuelle paiement | A, B | Finaliser un encaissement reel meme sans API | Haute | Faible | MVP | Statuts transaction |
| Historique simple | A, B, C | Retrouver les ventes | Haute | Faible | MVP | Transaction store |
| Total du jour | A, B, C | Savoir combien on a vendu | Haute | Faible | MVP | Historique |
| Recu / preuve simple | A, B, C | Rassurer client et commercant | Haute | Moyenne | MVP | Transaction detail |
| Architecture adaptateurs paiement | A, B, C | Eviter le couplage provider | Haute | Moyenne | MVP | Backend paiement |
| Logs/audit minimal | Ops, support | Retrouver un incident ou litige | Haute | Moyenne | MVP | Backend |
| Catalogue simple | B, C | Eviter la ressaisie repetitive | Moyenne | Moyenne | V1 terrain | Auth, catalog |
| Categories articles | B, C | Accelerer la saisie | Moyenne | Moyenne | V1 terrain | Catalogue |
| Annulation controlee | B, C | Corriger une erreur caisse | Moyenne | Moyenne | V1 terrain | Audit |
| Partage recu WhatsApp/SMS | A, B | Donner une preuve simple au client | Moyenne | Moyenne | V1 terrain | Recu |
| Employes / roles simples | C | Deleguer l'encaissement | Moyenne | Elevee | Croissance | Auth, audit |
| Offline queue locale | A, B | Continuer en faible connexion | Moyenne | Elevee | V1 terrain | Mobile storage, sync |
| Sync differree | A, B | Eviter perte de ventes | Moyenne | Elevee | V1 terrain | Offline queue |
| Wave API integree | B, C | Moins de confirmation manuelle | Moyenne | Elevee | Croissance | Acces provider |
| Orange Money / Free Money API | B, C | Plus de couverture paiement | Moyenne | Elevee | Croissance | Acces provider |
| Dashboard web | C, ops | Vue multi-utilisateur et support | Basse | Elevee | Croissance | API stable |
| Multi-boutiques | C | Operer plusieurs points de vente | Basse | Elevee | Plus tard | Roles, reporting |
| Carte bancaire | B, C | Encaisser d'autres clients | Basse | Elevee | Plus tard | PSP |
| QR / payment links | B, C | Encaissement a distance | Basse | Moyenne | Croissance | Paiement integre |
| Fidelite / marketing | B, C | Retention client | Basse | Elevee | Plus tard | CRM |

## Decision MVP stricte

Doivent entrer maintenant:

- inscription / connexion OTP,
- profil Niveau 1,
- encaissement simple,
- cash,
- Wave semi-manuel,
- historique,
- total du jour,
- preuve simple,
- audit minimal,
- architecture adaptateurs.

Doivent attendre:

- catalogue riche,
- multi-employes,
- web admin avance,
- integrations paiement profondes si elles ralentissent le lancement.
