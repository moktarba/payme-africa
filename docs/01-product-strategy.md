# Livrable 1 - Cadrage strategique produit

## Probleme produit

Au Senegal, beaucoup de petits commercants encaissent encore avec des moyens improvises:

- cash sans trace fiable,
- mobile money gere a la main dans WhatsApp ou dans la tete,
- aucune preuve simple a montrer au client,
- aucun suivi de la journee,
- beaucoup de frictions quand la connexion est faible ou que le vendeur est presse.

Le vrai probleme n'est pas "faire une super fintech".
Le vrai probleme est: permettre a un petit commercant d'encaisser vite, de rassurer son client, et de retrouver ses ventes sans apprendre un outil complexe.

## Promesse produit

"Encaisser en moins de 20 secondes, avec une preuve simple et un suivi clair, meme sur un telephone modeste."

## Marche prioritaire

1. Senegal
2. Extension Afrique de l'Ouest francophone

Pourquoi Senegal en premier:

- forte penetration du mobile money,
- Wave tres present dans les usages,
- Orange Money et Free Money restent strategiques,
- tissu dense de petits commerces informels et semi-formels,
- besoin fort de simplicite et de confiance.

## Personas terrain prioritaires

### Persona A - Vendeur ambulant / marche

- Encaisse vite, souvent debout, parfois au soleil.
- A besoin d'un seul ecran principal: "encaisser".
- N'a pas besoin d'un catalogue riche au debut.
- Risque principal: abandon si le parcours prend plus de 20 secondes.

### Persona B - Petite boutique de quartier

- Encaisse plusieurs fois par jour.
- Veut revoir ses ventes du jour.
- Peut avoir 2 ou 3 modes de paiement actifs.
- Commence a avoir besoin d'un mini catalogue.

### Persona C - Petit restaurant / gargote / service reglo

- A besoin d'un panier simple et de recu clair.
- Peut avoir un employe qui encaisse.
- Besoin rapide de stats journalieres et d'annulations encadrees.

## Hypotheses produit a tester

- H1: un parcours d'encaissement a 3 etapes max augmente fortement l'adoption.
- H2: une preuve de paiement simple visible sur l'ecran suffit au debut pour rassurer client et commercant.
- H3: le mode semi-manuel Wave/Cash est suffisant pour lancer le MVP avant toute integration API lourde.
- H4: l'historique et le total du jour sont plus utiles qu'un dashboard complexe.
- H5: l'inscription ultra courte augmente l'activation, meme si le compte n'est pas encore verifie.

## Segmentation et maturite

### Segment A - Tres petit vendeur informel

- MVP: inscription rapide, encaissement, confirmation, historique simple.
- Plus tard: mode degrade, partage recu, suivi offline basique.

### Segment B - Petit commerce regulier

- MVP: stats du jour, plusieurs moyens de paiement.
- V1: catalogue simple, categories, annulations controlees.

### Segment C - Commerce structure simple

- V1: mini catalogue, employes, tickets, rapports.
- Plus tard: roles, multi-points de vente, dashboard web.

## Differenciation

Le produit ne cherche pas a gagner par la sophistication.
Il gagne par:

- vitesse d'usage,
- lisibilite,
- adaptation au terrain Senegal,
- support du cash et du mobile money dans la meme logique,
- architecture paiement modulaire,
- parcours comprehensibles pour utilisateurs peu techniques.

## Risques majeurs

- dependance a des integrations paiement non disponibles en phase 1,
- sur-scope trop tot,
- offline trop ambitieux des le MVP,
- support difficile si les statuts de transaction sont flous,
- fragilite technique si on ne cadre pas bien idempotence, audit et reprise.

## Contraintes terrain

- Android entree/milieu de gamme,
- faible connectivite,
- batterie limitee,
- usage parfois partage du telephone,
- besoin de gros boutons et de contrastes forts,
- textes courts en francais simple,
- architecture exploitable a faible cout.

## Position produit recommandee

MVP Senegal-first pour segment A et debut segment B:

- cash,
- Wave semi-manuel,
- historique simple,
- preuve de paiement,
- tableau du jour,
- compte Niveau 1 ultra rapide.

Tout le reste doit prouver sa valeur avant d'entrer dans le coeur du produit.
