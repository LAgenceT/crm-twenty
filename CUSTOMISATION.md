# Customisation de l'interface — instance app.lagence-t.fr

Ce qui a été appliqué via l'API metadata, et ce que l'API ne permet pas.
Scripts dans [`scripts/lagencet/`](scripts/lagencet/README.md).

## Appliqué

### Objets désactivés

| Objet | Motif |
|---|---|
| `Opportunities` | remplacé par `Dossiers` |
| `Notes` | mis de côté |

Désactivation via `updateOneObject` (`isActive: false`). L'objet et ses données
restent en base, il disparaît simplement de la navigation. Réversible.

### Libellés d'objets

| Nom d'API | Libellé |
|---|---|
| `company` | Sociétés |
| `person` | Personnes |
| `task` | Tâches |
| `dossier` | Dossiers |
| `prestation` | Prestations |

Seuls les libellés changent : Twenty interdit de renommer un objet standard au
niveau API, `company` reste `company`.

### Libellés de champs

10 champs traduits sur les 51 candidats :

| Objet | Champ | Libellé |
|---|---|---|
| Sociétés | `name` | Nom |
| Sociétés | `domainName` | Domaine |
| Sociétés | `address` | Adresse |
| Sociétés | `people` | Personnes |
| Sociétés | `accountOwner` | Responsable |
| Sociétés | `opportunities` | Opportunités |
| Personnes | `name` | Nom |
| Personnes | `opportunities` | Opportunités |
| Opportunities | `name` | Nom |
| Workflows | `name` | Nom |

## Ce que l'API refuse

### Champs system-managed

41 champs ont été refusés :

```
Cannot edit system-managed field "createdAt" properties: label
```

Concerne `createdAt`, `updatedAt`, `createdBy`, `updatedBy` et `taskTargets`
sur tous les objets. Ce n'est pas contournable par l'API metadata.

**Ce n'est pas un problème** : les traductions existent déjà côté serveur.

| msgid | `fr-FR.po` serveur |
|---|---|
| Creation date | Date de création |
| Created by | Créé par |
| Last update | Dernière mise à jour |
| Updated by | Mis à jour par |
| Account Owner | Propriétaire du compte |

L'API renvoie systématiquement les libellés sources en anglais, y compris avec
un en-tête `Accept-Language: fr-FR` — vérifié. La traduction est appliquée
selon la **locale de l'utilisateur authentifié**, et une clé API n'a pas de
contexte utilisateur.

Si l'interface affiche ces champs en anglais, la piste est le réglage de langue
du compte (*Paramètres → Expérience*), pas les métadonnées.

### Nom du workspace et logo

```
This endpoint requires a user context. API keys are not supported.
```

`updateWorkspace` n'accepte pas les clés API. Le nom du workspace et le logo
doivent être changés depuis l'interface (*Paramètres → Général*).

### Thème et couleurs

Non configurable, ni par l'interface ni par l'API.

*Paramètres → Expérience → Apparence* ne contient qu'un `ColorSchemePicker` :
Clair, Sombre, Réglages système. C'est une préférence **par utilisateur**, pas
un réglage de workspace.

L'entité `Workspace` côté serveur ne porte que `displayName`, `logo` et
`logoFileId` — aucun champ de couleur. Le thème est compilé dans
`packages/twenty-ui/src/theme/constants/` (`MainColorsLight.ts`,
`BackgroundLight.ts`, `AccentLight.ts`…).

Poser une couleur de marque suppose donc de modifier ces constantes et de
construire une image Docker maison. L'instance tourne aujourd'hui sur l'image
officielle `twentycrm/twenty:latest`.

## Ordre de la sidebar

**Configurable par l'API** depuis Twenty 2.7. La note antérieure de ce document
— ordre codé en dur dans `NavigationDrawerSectionForObjectMetadataItems.tsx`,
fork nécessaire — ne vaut plus pour cette version.

Les objets `favorite` et `favoriteFolder` ont été supprimés au profit de
`navigationMenuItem` (migration `upgrade:2-7:drop-favorite-objects`, données
reprises en 1.17/1.18). La navigation est désormais une donnée, exposée sur
l'endpoint `/metadata` :

```graphql
query { navigationMenuItems { id type name position folderId targetObjectMetadataId userWorkspaceId } }
mutation { updateManyNavigationMenuItems(inputs: [...]) { id position } }
```

Un item sans `userWorkspaceId` vaut pour tout le workspace ; renseigné, il est
propre à un utilisateur. Le resolver accepte explicitement une clé API
(`@AuthApiKey()`), contrairement à `updateWorkspace`.

Ordre appliqué, par `scripts/lagencet/order-sidebar.js` :

```
Dossiers · Prestations · Sociétés · Personnes · Tâches · Dashboards · Workflows
```

`Opportunities` et `Notes` gardent leur item de navigation, relégué en fin de
liste : leur objet étant désactivé, il n'est pas rendu. Rien n'est supprimé,
réactiver l'objet suffit à le faire réapparaître.

## Colonnes des vues Kanban

Les 28 options du SELECT `etape` couvrent les 5 pipelines. Twenty crée une
colonne par option sur chaque Kanban : les 5 vues affichaient donc **29
colonnes** chacune (28 étapes + « sans valeur »), y compris celles des quatre
autres pipelines.

Le filtre sur `activite` **vide** les colonnes étrangères, il ne les masque
pas. Il faut poser `isVisible: false` sur les viewGroups concernés —
`scripts/lagencet/fix-kanban-columns.js`.

| Vue | Colonnes visibles |
|---|---|
| Kanban Audit | 5 étapes + « sans valeur » |
| Kanban MAR | 6 étapes + « sans valeur » |
| Kanban AMO Copro | 6 étapes + « sans valeur » |
| Kanban Réno globale | 6 étapes + « sans valeur » |
| Kanban Architecture | 5 étapes + « sans valeur » |

La colonne « sans valeur » reste visible sur chaque board : elle signale les
dossiers dont l'étape n'est pas encore posée.

### Piège : les colonnes en double

`createView` avec un `mainGroupByFieldMetadataId` génère **lui-même** un
viewGroup par option du SELECT. Enchaîner sur `createManyViewGroups` produit un
second jeu et le board affiche chaque colonne deux fois. Relire les colonnes
générées et se contenter d'en poser l'ordre.

## API REST metadata

Les vues sont exposées sur `/rest/metadata/` — `views`, `viewGroups`,
`viewFilters`, `viewFields` — avec un CRUD complet.

`POST /rest/views` **n'existe pas** : le contrôleur REST générique
(`/rest/<objet>`) ne sert que les objets d'enregistrement, et `view` n'en est
plus un depuis que les vues sont passées dans les metadata-modules. L'appel
répond `400 — object 'views' not found. eg: companies`.

`GET /rest/metadata/objects` embarque les champs de chaque objet, options
SELECT et couleurs comprises : un seul appel suffit pour résoudre les
`objectMetadataId` et les `fieldMetadataId`.

### Piège : `filter` ignoré sur `viewGroups`

```
GET /rest/metadata/viewGroups?filter=viewId[eq]:<id>
```

répond **HTTP 200 en ignorant le filtre** : la réponse contient les colonnes de
toutes les vues confondues, paginées. Aucune erreur ne le signale.

Un script qui s'y fie lit les colonnes des autres vues, masque celles qui ne
correspondent pas à la vue qu'il traite et crée des doublons pour celles qu'il
croit manquantes. C'est arrivé sur cette instance : 6 vues aux colonnes
masquées — dont `By Status` et `By Stage`, hors périmètre — et 18 colonnes en
double sur « Par commune ». Réparé par `scripts/lagencet/repair-view-groups.js`.

**Les colonnes d'une vue se lisent sur la vue elle-même** :
`GET /rest/metadata/views/<id>` renvoie ses `viewGroups`, correctement
rattachés.
