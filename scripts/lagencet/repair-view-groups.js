#!/usr/bin/env node
/**
 * Répare les colonnes de Kanban : doublons et colonnes masquées à tort.
 *
 * Écrit pour rattraper un incident précis — un script de configuration a lu
 * les colonnes via `GET /rest/metadata/viewGroups?filter=viewId[eq]:<id>`.
 * Cet endpoint accepte `filter` et l'**ignore silencieusement**, en HTTP 200 :
 * la lecture a rapporté les colonnes de douze vues confondues, puis masqué
 * celles qui ne correspondaient pas à la vue en cours de traitement et créé
 * des doublons pour celles qu'il croyait manquantes.
 *
 * Le script rétablit, pour chaque vue Kanban :
 *   - une seule colonne par valeur (les doublons les plus récents sont
 *     supprimés, la plus ancienne est conservée) ;
 *   - toutes les colonnes visibles, dans l'ordre des options du champ.
 *
 * `--except` liste les vues à ne pas rendre intégralement visibles : les cinq
 * boards de pipeline, dont les colonnes sont volontairement restreintes par
 * `create-views.js`, et qu'il faut laisser à ce script-là.
 *
 *   TWENTY_URL=... TWENTY_TOKEN_FILE=... node repair-view-groups.js [--dry-run]
 */
const fs = require('fs');

const URL_BASE = (process.env.TWENTY_URL || '').replace(/\/$/, '');
const DRY_RUN = process.argv.includes('--dry-run');

// Vues dont les colonnes sont restreintes à dessein : create-views.js en a la
// charge, repair-view-groups.js n'y touche que pour les doublons.
const RESTRICTED = new Set([
  'Kanban Audit',
  'Kanban MAR',
  'Kanban AMO Copro',
  'Kanban Réno globale',
  'Kanban Architecture',
]);

const TOKEN = process.env.TWENTY_TOKEN
  ? process.env.TWENTY_TOKEN
  : process.env.TWENTY_TOKEN_FILE
    ? fs.readFileSync(process.env.TWENTY_TOKEN_FILE.replace(/^~/, process.env.HOME), 'utf8').trim()
    : null;

if (!URL_BASE || !TOKEN) {
  console.error('TWENTY_URL et TWENTY_TOKEN/TWENTY_TOKEN_FILE sont requis.');
  process.exit(1);
}

const rest = async (method, path, body) => {
  const res = await fetch(`${URL_BASE}/rest/metadata/${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    console.error(`\nÉCHEC ${method} ${path} → HTTP ${res.status}`);
    console.error(JSON.stringify(payload, null, 1));
    process.exit(1);
  }
  return payload;
};

const main = async () => {
  const objects = (await rest('GET', 'objects?limit=500')).data;
  const views = (await rest('GET', 'views?limit=500')).data;

  const fieldById = (id) => {
    for (const object of objects) {
      const field = (object.fields || []).find((f) => f.id === id);
      if (field) return field;
    }
    return null;
  };

  let supprimés = 0;
  let rétablis = 0;
  const touchées = [];

  for (const view of views) {
    const groups = view.viewGroups || [];
    if (groups.length === 0) continue;

    // Doublons : on garde la colonne la plus ancienne de chaque valeur.
    const byValue = new Map();
    const extras = [];
    for (const group of [...groups].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (byValue.has(group.fieldValue)) extras.push(group);
      else byValue.set(group.fieldValue, group);
    }

    const field = view.mainGroupByFieldMetadataId
      ? fieldById(view.mainGroupByFieldMetadataId)
      : null;
    const options = [...((field && field.options) || [])].sort((a, b) => a.position - b.position);

    const restricted = RESTRICTED.has(view.name);
    const invisibles = [...byValue.values()].filter((g) => !g.isVisible);

    if (extras.length === 0 && (restricted || invisibles.length === 0)) continue;

    touchées.push(
      `${view.name} (${extras.length} doublons, ${restricted ? 0 : invisibles.length} à rétablir)`,
    );

    if (DRY_RUN) {
      supprimés += extras.length;
      rétablis += restricted ? 0 : invisibles.length;
      continue;
    }

    for (const extra of extras) {
      await rest('DELETE', `viewGroups/${extra.id}`);
      supprimés += 1;
    }

    if (restricted) continue;

    // Ordre : les options du champ, puis « sans valeur » en fin de board.
    const rank = (fieldValue) => {
      if (fieldValue === '') return options.length;
      const index = options.findIndex((o) => o.value === fieldValue);
      return index === -1 ? options.length + 1 : index;
    };

    for (const group of byValue.values()) {
      const position = rank(group.fieldValue);
      if (group.isVisible && group.position === position) continue;
      await rest('PATCH', `viewGroups/${group.id}`, { isVisible: true, position });
      rétablis += 1;
    }
  }

  console.log(DRY_RUN ? '\n=== --dry-run ===' : '\n=== appliqué ===');
  console.log(`vues touchées : ${touchées.length}`);
  touchées.forEach((t) => console.log('  ' + t));
  console.log(`colonnes supprimées : ${supprimés}`);
  console.log(`colonnes rétablies  : ${rétablis}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
