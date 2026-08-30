# Modèle de données CRM — L'Agence T & NRJ Home

Configuration appliquée sur l'instance Twenty via l'API metadata.
Instance : https://app.lagence-t.fr (le déploiement Railway est abandonné,
voir DEPLOY-VPS.md)

## Objets

| Objet | Nom API | Rôle |
|---|---|---|
| Contacts | `company` / `companies` | Objet standard Twenty renommé. Porte tous les tiers. |
| Dossier | `dossier` / `dossiers` | Affaire suivie. Porte le pipeline. |
| Prestation | `prestation` / `prestations` | Catalogue et tarifs. |

Le renommage de Companies en Contacts ne change que les **libellés** : les noms
d'API restent `company` / `companies`, Twenty interdisant de renommer un objet
standard. C'est préférable pour la stabilité des intégrations.

## Dossier

| Champ | Type | Détail |
|---|---|---|
| `reference` | TEXT | Identifiant d'affichage de l'objet |
| `adresse` | TEXT | |
| `dpe` | SELECT | D, E, F, G |
| `montant` | CURRENCY | |
| `activite` | SELECT | Audit, MAR, AMO Copro, Réno globale, Architecture |
| `etape` | SELECT | 28 options, voir ci-dessous |
| `notes` | TEXT | |
| `contact` | RELATION | → Contacts (le client) |
| `apporteur` | RELATION | → Contacts (le prescripteur) |
| `commune` | SELECT | 54 options : 52 communes + « Autre commune 06 » + « Hors département » |

## Prestation

| Champ | Type |
|---|---|
| `nom` | TEXT (identifiant d'affichage) |
| `tarif` | CURRENCY |
| `activite` | SELECT (mêmes 5 valeurs) |

## Contacts

Champs ajoutés à l'objet standard :

| Champ | Type | Détail |
|---|---|---|
| `typeContact` | SELECT | Lead, Client, Apporteur, Sous-traitant, Partenaire |
| `sousType` | SELECT | Agence immobilière, Notaire, Syndic, Régie, Particulier, Autre |
| `sourceAcquisition` | SELECT | 20 sources d'acquisition |
| `commune` | SELECT | même référentiel que `Dossier.commune` |
| `etapePartenariat` | SELECT | Identifié, Contacté, Rencontré, Convention signée, Actif, Dormant |

`sourceAcquisition` est porté par le contact seul : un dossier hérite de la
source par sa relation `contact`. Pas de duplication sur `Dossier`, pour
qu'aucune incohérence ne soit possible entre les deux.

`etapePartenariat` porte le pipeline de la relation avec un apporteur. Twenty
n'a pas de `stage` sur `company` — `stage` appartient à `opportunity`, objet
désactivé ici.

Le nom technique est `typeContact` et non `type` : `type` est un nom réservé par
Twenty. Le libellé affiché reste « Type ».

## Pipelines

Twenty n'a pas de notion native de pipelines multiples : un objet porte un seul
champ de type SELECT pour ses étapes. Les 5 pipelines sont donc portés par le
couple `activite` + `etape` sur `Dossier`, avec une vue Kanban par activité,
filtrée sur `activite` et groupée par `etape`.

| Vue Kanban | Filtre | Étapes |
|---|---|---|
| Kanban Audit | `activite IS AUDIT` | Commande reçue → Visite planifiée → En production → Livré → Facturé |
| Kanban MAR | `activite IS MAR` | Contrat signé → Visite audit → Projet travaux → Dossier aides → Travaux → Rapport |
| Kanban AMO Copro | `activite IS AMO_COPRO` | Pré-analyse → Proposition → Voté AG → Dossier Anah → Travaux → Solde versé |
| Kanban Réno globale | `activite IS RENO_GLOBALE` | Estimation → Devis signé → Chantier planifié → En cours → Réception → Soldé |
| Kanban Architecture | `activite IS ARCHITECTURE` | Brief → Avant-projet → Plans livrés → Suivi travaux → Soldé |

Chaque Kanban de pipeline n'affiche que les étapes du sien : les colonnes des
autres sont masquées, pas absentes. Voir CUSTOMISATION.md, « Colonnes des vues
Kanban ».

## Les 16 vues

Réconciliées par `scripts/lagencet/create-views.js`. Toute vue Kanban se
termine par une colonne « sans valeur », qui rattrape les enregistrements dont
le champ de groupement n'est pas renseigné — d'où `options + 1` colonnes.

| # | Vue | Objet | Type | Groupée par | Filtre | Colonnes |
|---|---|---|---|---|---|---|
| 1 | Tous les dossiers | Dossier | TABLE | — | — | — |
| 2 | Kanban Audit | Dossier | KANBAN | `etape` | `activite IS AUDIT` | 6 |
| 3 | Kanban MAR | Dossier | KANBAN | `etape` | `activite IS MAR` | 7 |
| 4 | Kanban AMO Copro | Dossier | KANBAN | `etape` | `activite IS AMO_COPRO` | 7 |
| 5 | Kanban Réno globale | Dossier | KANBAN | `etape` | `activite IS RENO_GLOBALE` | 7 |
| 6 | Kanban Architecture | Dossier | KANBAN | `etape` | `activite IS ARCHITECTURE` | 6 |
| 7 | Par activité | Dossier | KANBAN | `activite` | — | 6 |
| 8 | Par DPE | Dossier | KANBAN | `dpe` | — | 5 |
| 9 | Par commune | Dossier | KANBAN | `commune` | — | 55 |
| 10 | Tous les contacts | Contacts | TABLE | — | — | — |
| 11 | Partenariats | Contacts | KANBAN | `etapePartenariat` | `typeContact IS APPORTEUR` | 7 |
| 12 | Par type | Contacts | KANBAN | `typeContact` | — | 6 |
| 13 | Par sous-type | Contacts | KANBAN | `sousType` | — | 7 |
| 14 | Par source | Contacts | KANBAN | `sourceAcquisition` | — | 21 |
| 15 | Toutes les prestations | Prestation | TABLE | — | — | — |
| 16 | Par activité | Prestation | KANBAN | `activite` | — | 6 |

**Couleurs des colonnes** : un `viewGroup` n'a pas de champ couleur. Une colonne
Kanban prend la couleur de l'option SELECT qu'elle représente
(`field.options[].color`). Les 9 champs de groupement ont toutes leurs options
colorées — il n'y a rien à régler au niveau des vues.

**Vue « Par commune »** : 55 colonnes. Utilisable, mais long à faire défiler.
Un filtre par secteur serait plus confortable si l'usage le confirme.

Les `value` des options sont préfixées par pipeline (`MAR_TRAVAUX`,
`AMO_TRAVAUX`) car Twenty impose des `value` uniques dans un SELECT. Les
libellés, eux, peuvent être identiques : « Travaux » apparaît bien deux fois,
« Soldé » aussi.

**Limite assumée** : rien n'empêche techniquement de poser l'étape « Voté AG »
sur un dossier dont l'activité est Audit. Les vues filtrées rendent le cas peu
probable en usage normal, mais la contrainte n'est pas appliquée par le schéma.

## Référentiel communes

54 options : les 52 communes du périmètre d'intervention, plus deux valeurs
de repli, « Autre commune 06 » et « Hors département ».

Le cadrage initial parlait de 53 communes ; la liste fournie en compte 52.
À arbitrer si une commune manque.

À noter également : « Gattieres » est saisi sans accent dans le référentiel,
alors que la commune s'écrit Gattières. Conservé tel quel, à corriger si besoin.

## Catalogue de prestations

| Prestation | Activité | Tarif |
|---|---|---|
| Audit ≤ 110 m² | Audit | 890 € |
| Audit 111-200 m² | Audit | 1 090 € |
| Audit > 200 m² | Audit | 1 390 € |
| Mission AMO Copro | AMO Copro | sur devis |
| MAR entrant | MAR | sur devis |
| Architecture intérieure | Architecture | sur devis |
| Rénovation globale chantier | Réno globale | sur devis |

Les prestations « sur devis » ont un `tarif` à `null` (et non à zéro), pour que
l'absence de tarif se distingue d'une prestation gratuite.

## Données de démo

Les 16 enregistrements du seed Twenty ont été supprimés en *soft delete*
(5 Companies, 5 People, 6 Opportunities). Ils restent restaurables via
`deletedAt`. Pour une purge définitive, utiliser les mutations `destroy*`.
