# Objectifs SMART et Roadmap MVP

## Objectif Nord

D'ici 4 semaines, permettre a 10 commercants testeurs de realiser au moins 50 encaissements de test ou reels avec moins de 2 blocages majeurs par commercant.

Mesure principale:
- nombre de transactions initiees;
- nombre de transactions confirmees;
- temps median d'encaissement;
- nombre de recus partages;
- nombre de retours bugs bloquants.

## Objectifs SMART MVP

### S1 - Encaissement terrain

Specifique:
- permettre un encaissement libre ou via article rapide, puis confirmation et recu.

Mesurable:
- 90% des encaissements de test doivent etre realisables en moins de 30 secondes.

Atteignable:
- cash et Wave manuel seulement.

Relevant:
- c'est la promesse centrale de PayMe Africa.

Temporel:
- fin du Sprint 1.

### S2 - Stabilisation beta

Specifique:
- rendre la demo, le backend local et les tests critiques reproductibles par une personne technique.

Mesurable:
- une personne technique peut lancer demo et backend en moins de 10 minutes avec la documentation.

Atteignable:
- scripts existants, corrections QA et documentation.

Relevant:
- accelere les tests et reduit le support avant beta.

Temporel:
- fin du Sprint 2.

### S3 - Confiance et preuve

Specifique:
- produire un recu lisible avec montant, mode, date, reference et statut.

Mesurable:
- 100% des transactions confirmees ont une reference et un statut clair.

Atteignable:
- partage via capacite native du mobile, sans PDF avance.

Relevant:
- reduit les litiges client/commercant.

Temporel:
- fin du Sprint 3.

### S4 - Connexion faible

Specifique:
- permettre une vente cash locale quand la connexion est instable, puis synchroniser sans doublon.

Mesurable:
- 100% des ventes cash offline synchronisees reutilisent la meme `clientReference`.

Atteignable:
- queue locale cash uniquement, pas d'offline mobile money.

Relevant:
- protege le cas terrain le plus risque.

Temporel:
- fin du Sprint 4.

### S5 - Beta terrain

Specifique:
- permettre a 10 commercants testeurs de realiser au moins 50 encaissements de test ou reels.

Mesurable:
- moins de 2 blocages majeurs par commercant testeur.

Atteignable:
- environnement beta, guide testeur, KPIs minimum et support leger.

Relevant:
- valide la promesse produit avant integrations lourdes.

Temporel:
- fin du Sprint 5.

### S6+ - Croissance et production

Specifique:
- integrer progressivement paiements automatiques, ops production et fonctionnalites V1.

Mesurable:
- chaque fonctionnalite de croissance doit etre reliee a un signal beta ou un besoin support mesure.

Atteignable:
- Wave API d'abord si acces disponible, puis ops et V1 commerce structure.

Relevant:
- evite de sur-construire avant validation terrain.

Temporel:
- apres beta terrain.

## KPIs Produit

Activation:
- compte cree;
- session restauree;
- premier encaissement effectue.

Usage:
- transactions par commercant par jour;
- part des transactions confirmees;
- part des recus partages;
- usage montant libre vs article rapide.

Qualite:
- erreurs API critiques;
- temps d'encaissement;
- annulations;
- blocages remontes en test.

Business:
- commercants actifs hebdomadaires;
- intention de payer;
- fonctionnalites percues comme premium;
- demande multi-employes / rapports / sauvegarde.
