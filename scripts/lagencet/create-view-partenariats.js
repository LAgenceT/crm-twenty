#!/usr/bin/env node
/**
 * Crée la vue Kanban « Partenariats » sur Contacts (objet `company`).
 *
 * Filtre  : typeContact IS Apporteur
 * Groupe  : etapePartenariat (Identifié → … → Dormant)
 *
 * Twenty n'a pas de `stage` sur `company` — `stage` appartient à `opportunity`,
 * objet désactivé sur cette instance. Le board s'appuie donc sur le champ
 * `etapePartenariat` créé pour l'occasion.
 *
 * Idempotent : si la vue existe déjà, le script s'arrête sans rien écrire.
 *
 * Attention aux colonnes : `createView` avec un `mainGroupByFieldMetadataId`
 * génère lui-même un viewGroup par option du SELECT. Les créer ensuite en
 * appelant `createManyViewGroups` produit un second jeu, et le board affiche
 * chaque colonne en double. On se contente donc de relire les colonnes
 * générées et d'en poser l'ordre.
 *
 *   TWENTY_URL=... TWENTY_TOKEN_FILE=... node create-view-partenariats.js [--dry-run]
 */
const { execFileSync } = require('child_process');
const path = require('path');

const API = path.join(__dirname, 'twenty-api.sh');
const DRY_RUN = process.argv.includes('--dry-run');

const VIEW_NAME = 'Partenariats';
const OBJECT = 'company';
const GROUP_BY_FIELD = 'etapePartenariat';
const FILTER_FIELD = 'typeContact';
const FILTER_VALUE = ['APPORTEUR'];
// Champs affichés sur la carte, dans l'ordre.
const CARD_FIELDS = ['name', 'sousType', 'commune'];

const gql = (query, variables) =>
  JSON.parse(
    execFileSync(API, ['metadata', query, JSON.stringify(variables ?? {})], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }),
  );

const check = (res, label) => {
  if (res.errors) {
    console.error(`ÉCHEC ${label} :`, JSON.stringify(res.errors, null, 1));
    process.exit(1);
  }
  return res.data;
};

const data = check(
  gql(`query {
    objects(paging: { first: 200 }) {
      edges { node { id nameSingular fields(paging: { first: 200 }) { edges { node { id name options } } } } }
    }
    getViews { id name type objectMetadataId }
  }`),
  'lecture du schéma',
);

const object = data.objects.edges
  .map((e) => e.node)
  .find((o) => o.nameSingular === OBJECT);
if (!object) {
  console.error(`Objet ${OBJECT} introuvable.`);
  process.exit(1);
}

const fields = object.fields.edges.map((e) => e.node);
const fieldByName = (name) => {
  const field = fields.find((f) => f.name === name);
  if (!field) {
    console.error(`Champ ${OBJECT}.${name} introuvable.`);
    process.exit(1);
  }
  return field;
};

const groupByField = fieldByName(GROUP_BY_FIELD);
const filterField = fieldByName(FILTER_FIELD);

const existing = data.getViews.find(
  (v) => v.name === VIEW_NAME && v.objectMetadataId === object.id,
);
if (existing) {
  console.log(`La vue « ${VIEW_NAME} » existe déjà (${existing.id}). Rien à faire.`);
  process.exit(0);
}

// Les colonnes du Kanban : une par option, plus « sans valeur » en dernier
// pour rattraper les apporteurs dont l'étape n'est pas encore posée.
const options = [...(groupByField.options ?? [])].sort((a, b) => a.position - b.position);

console.log(`Vue      : ${VIEW_NAME} (KANBAN sur ${OBJECT})`);
console.log(`Filtre   : ${FILTER_FIELD} IS ${FILTER_VALUE.join(', ')}`);
console.log(`Colonnes : ${options.map((o) => o.label).join(' → ')} → « sans valeur »`);
console.log(`Carte    : ${CARD_FIELDS.join(', ')}`);

if (DRY_RUN) {
  console.log('\n--dry-run : rien écrit.');
  process.exit(0);
}

const view = check(
  gql(
    `mutation ($input: CreateViewInput!) { createView(input: $input) { id name type } }`,
    {
      input: {
        name: VIEW_NAME,
        objectMetadataId: object.id,
        type: 'KANBAN',
        icon: 'IconHeartHandshake',
        position: 1,
        mainGroupByFieldMetadataId: groupByField.id,
      },
    },
  ),
  'création de la vue',
).createView;

console.log(`\nVue créée : ${view.id}`);

check(
  gql(
    `mutation ($input: CreateViewFilterInput!) { createViewFilter(input: $input) { id } }`,
    {
      input: {
        viewId: view.id,
        fieldMetadataId: filterField.id,
        operand: 'IS',
        value: FILTER_VALUE,
      },
    },
  ),
  'création du filtre',
);
console.log('Filtre créé.');

// createView a déjà généré une colonne par option. On relit ce qu'il a posé
// et on se contente d'aligner l'ordre sur celui du référentiel, en reléguant
// la colonne « sans valeur » en fin de board.
const groups = check(
  gql(`query ($id: UUID!) { getView(id: $id) { viewGroups { id fieldValue position isVisible } } }`, {
    id: view.id,
  }),
  'relecture des colonnes',
).getView.viewGroups;

const rank = (fieldValue) => {
  const index = options.findIndex((o) => o.value === fieldValue);
  return index === -1 ? options.length : index;
};

const groupUpdates = groups
  .map((g) => ({ id: g.id, update: { position: rank(g.fieldValue), isVisible: true } }))
  .filter((u, i) => groups[i].position !== u.update.position || !groups[i].isVisible);

if (groupUpdates.length > 0) {
  check(
    gql(
      `mutation ($inputs: [UpdateViewGroupInput!]!) {
        updateManyViewGroups(inputs: $inputs) { id }
      }`,
      { inputs: groupUpdates },
    ),
    'ordre des colonnes',
  );
}
console.log(`${groups.length} colonnes générées, ${groupUpdates.length} réordonnées.`);

const fieldInputs = CARD_FIELDS.map((name, i) => ({
  viewId: view.id,
  fieldMetadataId: fieldByName(name).id,
  position: i,
  isVisible: true,
  size: 180,
}));

const viewFields = check(
  gql(
    `mutation ($inputs: [CreateViewFieldInput!]!) {
      createManyViewFields(inputs: $inputs) { id position }
    }`,
    { inputs: fieldInputs },
  ),
  'création des champs de carte',
).createManyViewFields;
console.log(`${viewFields.length} champs de carte créés.`);
