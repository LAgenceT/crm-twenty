# Scripts de configuration — instance L'Agence T

Scripts utilisés pour configurer l'instance Twenty via l'API metadata.
Ils sont idempotents dans leur usage mais **pas** dans leurs effets : relancer
une création de champ crée un doublon. Ils servent de trace et de base de
rejeu sur une nouvelle instance.

## Prérequis

```bash
export TWENTY_URL=https://app.lagence-t.fr
export TWENTY_TOKEN_FILE=~/.config/twenty/app-lagence-t.token   # chmod 600
```

Aucun token n'est versionné. Chaque instance Twenty a sa propre clé : un token
émis par une instance est rejeté par une autre, le JWT étant signé avec un
secret propre à l'instance.

## Scripts

| Script | Rôle |
|---|---|
| `twenty-api.sh` | Appel GraphQL brut. `twenty-api.sh <metadata\|graphql> '<query>' '<variables>'` |
| `create-field.sh` | Création d'un champ sur un objet |
| `rename-field-labels.sh` | Traduction en français des libellés de champs |
| `referentiels/build-etapes.js` | Génère les 28 options d'étapes des 5 pipelines |
| `referentiels/build-options.js` | Convertit une liste de libellés en options SELECT (`value` uniques, positions, couleurs) |
| `fix-kanban-columns.js` | Restreint chaque Kanban Dossier aux étapes de son pipeline |
| `order-sidebar.js` | Ordonne la navigation latérale (Dossiers et Prestations en tête) |
| `create-view-partenariats.js` | Crée la vue Kanban « Partenariats » sur Contacts (absorbé par `create-views.js`) |
| `create-views.js` | Réconcilie les 16 vues métier, via l'API REST metadata |
| `repair-view-groups.js` | Répare les colonnes de Kanban : doublons, colonnes masquées à tort |

Les trois derniers sont **idempotents dans leurs effets** : ils écrivent un état
absolu et acceptent `--dry-run`. Les rejouer ne crée pas de doublon.

## Référentiels

| Fichier | Contenu |
|---|---|
| `etapes.json` | 28 étapes, préfixées par pipeline |
| `activite.json` | 5 activités |
| `dpe.json` | D, E, F, G |
| `type.json` | 5 types de contact |
| `soustype.json` | 6 sous-types |
| `communes.json` | 54 options (52 communes + 2 valeurs de repli) |
| `sources.json` | 20 sources d'acquisition |
| `prestations.json` | 7 prestations du catalogue |
| `etape-partenariat.json` | 6 étapes de la relation apporteur |

`communes.list.json` et `sources.list.json` sont les listes brutes ; les
fichiers d'options correspondants sont régénérés par :

```bash
node referentiels/build-options.js referentiels/communes.list.json referentiels/communes.json
node referentiels/build-etapes.js > referentiels/etapes.json
```

## À savoir avant de rejouer

- Les `value` d'un SELECT doivent être uniques, pas les libellés. « Travaux »
  apparaît dans deux pipelines, d'où les préfixes (`MAR_TRAVAUX`, `AMO_TRAVAUX`).
- `type` est un nom réservé par Twenty ; le champ s'appelle `typeContact`.
- Un objet standard ne peut pas être renommé au niveau API, seulement ses
  libellés. `company` reste `company`.
- Twenty crée un champ `name` comme identifiant d'affichage sur chaque objet.
  Basculer l'identifiant sur le bon champ puis supprimer `name` évite le doublon.
- `createView` avec un `mainGroupByFieldMetadataId` crée déjà un viewGroup par
  option : ne pas enchaîner sur `createManyViewGroups`, le board afficherait
  chaque colonne deux fois.
- `updateWorkspace` refuse les clés API (`@AuthUserWorkspaceId()` exige une
  session utilisateur). Nom du workspace et logo restent à faire dans
  l'interface, *Paramètres → Général*.
- `GET /rest/metadata/viewGroups?filter=viewId[eq]:<id>` accepte `filter` et
  l'**ignore**, en HTTP 200 : la réponse mélange les colonnes de toutes les
  vues. Lire les colonnes sur la vue — `GET /rest/metadata/views/<id>` — qui
  les embarque correctement rattachées.
- `create-views.js` reconnaît une vue à sa **configuration** (objet, type,
  champ de groupement, filtre), pas à son nom : rejouable sans créer de
  doublon, et il renomme au passage une vue déjà conforme.
