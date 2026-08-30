#!/usr/bin/env node
/**
 * Ordonne la navigation latérale : Dossiers et Prestations en tête.
 *
 * Depuis Twenty 2.7 les favoris (`favorite`, `favoriteFolder`) sont supprimés
 * au profit de `navigationMenuItem`, et l'ordre de la sidebar n'est plus codé
 * en dur dans le front : c'est une donnée, modifiable par l'API metadata.
 * Un item sans `userWorkspaceId` vaut pour tout le workspace.
 *
 * Les objets désactivés (note, opportunity) gardent leur item — inerte, car un
 * objet inactif n'est pas rendu — simplement relégué en fin de liste. Rien
 * n'est supprimé : réactiver l'objet suffit à le faire réapparaître.
 *
 *   TWENTY_URL=... TWENTY_TOKEN_FILE=... node order-sidebar.js [--dry-run]
 */
const { execFileSync } = require('child_process');
const path = require('path');

const API = path.join(__dirname, 'twenty-api.sh');
const DRY_RUN = process.argv.includes('--dry-run');

// Ordre voulu, à la racine de la sidebar. Ce qui n'est pas listé est laissé
// après, dans son ordre courant.
const ORDER = [
  { object: 'dossier' },
  { object: 'prestation' },
  { object: 'company' },
  { object: 'person' },
  { object: 'task' },
  { object: 'dashboard' },
  { folder: 'Workflows' },
  { object: 'opportunity' }, // désactivé
  { object: 'note' }, // désactivé
];

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

const objects = check(
  gql('query { objects(paging:{first:200}) { edges { node { id nameSingular labelPlural } } } }'),
  'lecture des objets',
).objects.edges.map((e) => e.node);

const items = check(
  gql(`query {
    navigationMenuItems { id type name position folderId targetObjectMetadataId userWorkspaceId }
  }`),
  'lecture de la navigation',
).navigationMenuItems;

// Seuls les items de premier niveau sont concernés : ceux rangés dans un
// dossier gardent leur ordre interne.
const roots = items.filter((i) => !i.folderId);

const findItem = (spec) => {
  if (spec.folder) {
    return roots.find((i) => i.type === 'FOLDER' && i.name === spec.folder);
  }
  const object = objects.find((o) => o.nameSingular === spec.object);
  if (!object) return undefined;
  return roots.find((i) => i.targetObjectMetadataId === object.id);
};

const label = (spec) =>
  spec.folder ??
  (objects.find((o) => o.nameSingular === spec.object) || {}).labelPlural ??
  spec.object;

const inputs = [];
const ordered = new Set();

ORDER.forEach((spec, position) => {
  const item = findItem(spec);

  if (!item) {
    console.error(`Item introuvable pour ${JSON.stringify(spec)} — ignoré.`);
    return;
  }

  ordered.add(item.id);
  const move = item.position !== position;
  console.log(
    `${String(position).padEnd(3)} ${label(spec).padEnd(22)} ` +
      (move ? `position ${item.position} → ${position}` : 'déjà en place'),
  );

  if (move) inputs.push({ id: item.id, update: { position } });
});

const untouched = roots.filter((i) => !ordered.has(i.id));
if (untouched.length > 0) {
  console.log(
    `\nNon listés, laissés en l'état : ${untouched.map((i) => i.name || i.type).join(', ')}`,
  );
}

if (inputs.length === 0) {
  console.log('\nRien à écrire.');
} else if (DRY_RUN) {
  console.log(`\n--dry-run : ${inputs.length} déplacements non écrits.`);
} else {
  check(
    gql(
      `mutation ($inputs: [UpdateOneNavigationMenuItemInput!]!) {
        updateManyNavigationMenuItems(inputs: $inputs) { id position }
      }`,
      { inputs },
    ),
    'réordonnancement',
  );
  console.log(`\n${inputs.length} items déplacés.`);
}
