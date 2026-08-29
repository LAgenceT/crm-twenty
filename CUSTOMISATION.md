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

### Ordre de la sidebar

Non configurable par l'API : il est codé en dur dans le front, dans
`packages/twenty-front/src/modules/object-metadata/components/NavigationDrawerSectionForObjectMetadataItems.tsx` :

```ts
const ORDERED_FIRST_STANDARD_OBJECTS = [Person, Company, Opportunity, Task, Note];
const ORDERED_LAST_STANDARD_OBJECTS  = [Dashboard];
```

L'ordre effectif est : objets standard dans cet ordre, puis les objets
personnalisés triés par date de création décroissante, puis `Dashboard`.
Aucun champ de position n'existe sur les métadonnées d'objet.

Ordre obtenu sur cette instance :

```
Personnes · Sociétés · Tâches · Prestations · Dossiers · Workflows · Dashboards
```

Placer `Dossiers` en premier demanderait de modifier ce fichier et de construire
une image Docker maison — l'instance tourne aujourd'hui sur l'image officielle
`twentycrm/twenty:latest`.
