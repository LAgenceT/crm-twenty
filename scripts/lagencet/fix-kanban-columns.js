#!/usr/bin/env node
/**
 * Restreint chaque vue Kanban Dossier aux seules étapes de son pipeline.
 *
 * Les 28 options du SELECT `etape` couvrent les 5 pipelines : Twenty crée donc
 * une colonne par option sur chaque Kanban, soit 29 colonnes (28 + « sans
 * valeur ») sur un board qui n'en concerne que 5 ou 6. Le filtre `activite`
 * vide les colonnes étrangères, il ne les masque pas.
 *
 * Ce script pose `isVisible` et `position` sur chaque viewGroup : visible et
 * ordonné pour le pipeline de la vue, masqué sinon. Il est idempotent — il
 * écrit un état absolu, pas un delta.
 *
 *   TWENTY_URL=... TWENTY_TOKEN_FILE=... node fix-kanban-columns.js [--dry-run]
 */
const { execFileSync } = require('child_process');
const path = require('path');

const API = path.join(__dirname, 'twenty-api.sh');
const DRY_RUN = process.argv.includes('--dry-run');

// Préfixe des `value` d'étape porté par chaque vue. La colonne « sans valeur »
// (fieldValue vide) reste visible partout : elle signale les dossiers dont
// l'étape n'est pas encore posée.
const PIPELINES = {
  'Audit énergétique': 'AUDIT_',
  MAR: 'MAR_',
  'AMO Copro': 'AMO_',
  'Réno globale': 'RENO_',
  Architecture: 'ARCHI_',
};

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

const views = check(
  gql(`query {
    getViews {
      id name type
      viewGroups { id fieldValue position isVisible }
    }
  }`),
  'lecture des vues',
).getViews;

let totalUpdates = 0;

for (const [viewName, prefix] of Object.entries(PIPELINES)) {
  const view = views.find((v) => v.name === viewName && v.type === 'KANBAN');

  if (!view) {
    console.error(`Vue Kanban « ${viewName} » introuvable — ignorée.`);
    continue;
  }

  // Ordre voulu : les étapes du pipeline dans leur ordre d'origine, puis la
  // colonne « sans valeur ». Les autres sont masquées, leur position importe peu.
  const own = view.viewGroups
    .filter((g) => g.fieldValue.startsWith(prefix))
    .sort((a, b) => a.position - b.position);
  const empty = view.viewGroups.filter((g) => g.fieldValue === '');
  const foreign = view.viewGroups.filter(
    (g) => g.fieldValue !== '' && !g.fieldValue.startsWith(prefix),
  );

  const target = new Map();
  own.forEach((g, i) => target.set(g.id, { isVisible: true, position: i }));
  empty.forEach((g) => target.set(g.id, { isVisible: true, position: own.length }));
  foreign.forEach((g, i) =>
    target.set(g.id, { isVisible: false, position: own.length + 1 + i }),
  );

  const inputs = view.viewGroups
    .filter((g) => {
      const want = target.get(g.id);
      return g.isVisible !== want.isVisible || g.position !== want.position;
    })
    .map((g) => ({ id: g.id, update: target.get(g.id) }));

  console.log(
    `${viewName.padEnd(20)} ${own.length} étapes + « sans valeur », ` +
      `${foreign.length} colonnes masquées, ${inputs.length} à écrire`,
  );

  if (inputs.length === 0 || DRY_RUN) continue;

  check(
    gql(
      `mutation ($inputs: [UpdateViewGroupInput!]!) {
        updateManyViewGroups(inputs: $inputs) { id fieldValue isVisible position }
      }`,
      { inputs },
    ),
    `mise à jour de « ${viewName} »`,
  );
  totalUpdates += inputs.length;
}

console.log(DRY_RUN ? '\n--dry-run : rien écrit.' : `\n${totalUpdates} viewGroups mis à jour.`);
