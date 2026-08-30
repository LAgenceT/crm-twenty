#!/usr/bin/env node
/**
 * Réconcilie les 16 vues métier de l'instance, via l'API REST metadata.
 *
 * Endpoints : `/rest/metadata/views`, `/viewGroups`, `/viewFilters`.
 * `/rest/views` n'existe pas — le contrôleur REST générique (`/rest/<objet>`)
 * ne sert que les objets d'enregistrement, et `view` n'en est plus un depuis
 * que les vues sont passées dans les metadata-modules.
 *
 * Réconciliation, pas création aveugle : une vue est reconnue à sa
 * **configuration** (objet + type + champ de groupement + filtre), pas à son
 * nom. Une vue déjà conforme est renommée si besoin, jamais dupliquée. Le
 * script est donc rejouable, et sert aussi de base de rejeu sur une instance
 * neuve.
 *
 * Piège REST : `/rest/metadata/viewGroups` accepte un paramètre `filter` et
 * l'ignore, sans erreur. Les colonnes se lisent donc sur la vue elle-même
 * (`GET /rest/metadata/views/<id>`), qui les embarque.
 *
 * Couleurs des colonnes : un `viewGroup` n'a pas de champ couleur. La couleur
 * d'une colonne Kanban vient de l'option SELECT qu'elle représente
 * (`field.options[].color`). Le script vérifie que chaque option porte une
 * couleur et le signale sinon ; il n'y a rien à écrire côté vue.
 *
 *   TWENTY_URL=https://app.lagence-t.fr \
 *   TWENTY_TOKEN_FILE=~/.config/twenty/app-lagence-t.token \
 *   node create-views.js [--dry-run]
 */
const fs = require('fs');

const URL_BASE = (process.env.TWENTY_URL || '').replace(/\/$/, '');
const DRY_RUN = process.argv.includes('--dry-run');

if (!URL_BASE) {
  console.error('TWENTY_URL est requis (ex: https://app.lagence-t.fr)');
  process.exit(1);
}

const TOKEN = process.env.TWENTY_TOKEN
  ? process.env.TWENTY_TOKEN
  : process.env.TWENTY_TOKEN_FILE
    ? fs.readFileSync(process.env.TWENTY_TOKEN_FILE.replace(/^~/, process.env.HOME), 'utf8').trim()
    : null;

if (!TOKEN) {
  console.error('Aucun token : définir TWENTY_TOKEN ou TWENTY_TOKEN_FILE.');
  process.exit(1);
}

/**
 * Les 16 vues voulues.
 *
 * `onlyOptions` restreint les colonnes visibles d'un Kanban à un sous-ensemble
 * des options du champ. Les 28 étapes de `dossier.etape` couvrent les 5
 * pipelines : sans ce garde-fou, chaque board rouvrirait les colonnes des
 * quatre autres, que le filtre `activite` laisse simplement vides.
 */
const VIEWS = [
  // ---- Dossiers ----
  { object: 'dossier', name: 'Tous les dossiers', type: 'TABLE', icon: 'IconList' },
  { object: 'dossier', name: 'Kanban Audit', type: 'KANBAN', icon: 'IconGauge',
    groupBy: 'etape', filter: { field: 'activite', values: ['AUDIT'] }, onlyOptions: /^AUDIT_/ },
  { object: 'dossier', name: 'Kanban MAR', type: 'KANBAN', icon: 'IconHomeBolt',
    groupBy: 'etape', filter: { field: 'activite', values: ['MAR'] }, onlyOptions: /^MAR_/ },
  { object: 'dossier', name: 'Kanban AMO Copro', type: 'KANBAN', icon: 'IconBuildingCommunity',
    groupBy: 'etape', filter: { field: 'activite', values: ['AMO_COPRO'] }, onlyOptions: /^AMO_/ },
  { object: 'dossier', name: 'Kanban Réno globale', type: 'KANBAN', icon: 'IconTool',
    groupBy: 'etape', filter: { field: 'activite', values: ['RENO_GLOBALE'] }, onlyOptions: /^RENO_/ },
  { object: 'dossier', name: 'Kanban Architecture', type: 'KANBAN', icon: 'IconRulerMeasure',
    groupBy: 'etape', filter: { field: 'activite', values: ['ARCHITECTURE'] }, onlyOptions: /^ARCHI_/ },
  { object: 'dossier', name: 'Par activité', type: 'KANBAN', icon: 'IconCategory', groupBy: 'activite' },
  { object: 'dossier', name: 'Par DPE', type: 'KANBAN', icon: 'IconFlame', groupBy: 'dpe' },
  { object: 'dossier', name: 'Par commune', type: 'KANBAN', icon: 'IconMapPin', groupBy: 'commune' },

  // ---- Sociétés / Contacts ----
  { object: 'company', name: 'Tous les contacts', type: 'TABLE', icon: 'IconList' },
  { object: 'company', name: 'Partenariats', type: 'KANBAN', icon: 'IconHeartHandshake',
    groupBy: 'etapePartenariat', filter: { field: 'typeContact', values: ['APPORTEUR'] } },
  { object: 'company', name: 'Par type', type: 'KANBAN', icon: 'IconUsersGroup', groupBy: 'typeContact' },
  { object: 'company', name: 'Par sous-type', type: 'KANBAN', icon: 'IconSubtask', groupBy: 'sousType' },
  { object: 'company', name: 'Par source', type: 'KANBAN', icon: 'IconTargetArrow', groupBy: 'sourceAcquisition' },

  // ---- Prestations ----
  { object: 'prestation', name: 'Toutes les prestations', type: 'TABLE', icon: 'IconList' },
  { object: 'prestation', name: 'Par activité', type: 'KANBAN', icon: 'IconCategory', groupBy: 'activite' },
];

const rest = async (method, path, body) => {
  const res = await fetch(`${URL_BASE}/rest/metadata/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!res.ok) {
    console.error(`\nÉCHEC ${method} /rest/metadata/${path} → HTTP ${res.status}`);
    console.error(JSON.stringify(payload, null, 1));
    process.exit(1);
  }
  return payload;
};

const main = async () => {
  const objects = (await rest('GET', 'objects?limit=500')).data;
  const views = (await rest('GET', 'views?limit=500')).data;

  const objectByName = (name) => {
    const object = objects.find((o) => o.nameSingular === name);
    if (!object) throw new Error(`Objet ${name} introuvable.`);
    return object;
  };
  const fieldByName = (object, name) => {
    const field = (object.fields || []).find((f) => f.name === name);
    if (!field) throw new Error(`Champ ${object.nameSingular}.${name} introuvable.`);
    return field;
  };

  // Une vue est reconnue à sa configuration. Deux vues de même signature sont
  // des doublons : on garde la plus ancienne et on signale les autres, sans
  // rien supprimer — une vue peut avoir été créée à la main et contenir du
  // travail.
  const signature = (view) =>
    [
      view.objectMetadataId,
      view.type,
      view.mainGroupByFieldMetadataId ?? '-',
      (view.viewFilters || [])
        .map((f) => `${f.fieldMetadataId}:${JSON.stringify(f.value)}`)
        .sort()
        .join(','),
    ].join('|');

  const wantedSignature = (spec) => {
    const object = objectByName(spec.object);
    return [
      object.id,
      spec.type,
      spec.groupBy ? fieldByName(object, spec.groupBy).id : '-',
      spec.filter
        ? `${fieldByName(object, spec.filter.field).id}:${JSON.stringify(spec.filter.values)}`
        : '',
    ].join('|');
  };

  const claimed = new Set();
  const report = { créées: [], renommées: [], conformes: [], doublons: [], colonnes: 0 };

  for (const spec of VIEWS) {
    const object = objectByName(spec.object);
    const target = wantedSignature(spec);

    const candidates = views
      .filter((v) => !claimed.has(v.id) && v.type !== 'FIELDS_WIDGET' && signature(v) === target)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    let view = candidates[0];

    for (const extra of candidates.slice(1)) {
      report.doublons.push({ name: spec.name, id: extra.id, createdAt: extra.createdAt });
    }

    if (view) {
      claimed.add(view.id);
      if (view.name !== spec.name) {
        report.renommées.push(`${view.name} → ${spec.name}`);
        if (!DRY_RUN) await rest('PATCH', `views/${view.id}`, { name: spec.name, icon: spec.icon });
      } else {
        report.conformes.push(spec.name);
      }
    } else {
      report.créées.push(spec.name);
      if (DRY_RUN) continue;
      view = await rest('POST', 'views', {
        name: spec.name,
        objectMetadataId: object.id,
        type: spec.type,
        icon: spec.icon,
        ...(spec.groupBy ? { mainGroupByFieldMetadataId: fieldByName(object, spec.groupBy).id } : {}),
      });
      claimed.add(view.id);

      if (spec.filter) {
        await rest('POST', 'viewFilters', {
          viewId: view.id,
          fieldMetadataId: fieldByName(object, spec.filter.field).id,
          operand: 'IS',
          value: spec.filter.values,
        });
      }
    }

    if (spec.type !== 'KANBAN' || DRY_RUN) continue;

    report.colonnes += await reconcileGroups({ view, spec, object, fieldByName });
  }

  print(report);
};

/**
 * Aligne les colonnes d'un Kanban sur les options du champ de groupement.
 *
 * `POST /views` avec un `mainGroupByFieldMetadataId` crée déjà un viewGroup par
 * option : on relit ce qui existe plutôt que d'en créer une seconde série, qui
 * ferait apparaître chaque colonne en double.
 *
 * Les colonnes hors périmètre sont masquées (`isVisible: false`), pas
 * supprimées : réversible, et un enregistrement déjà posé sur cette valeur
 * n'est pas orphelin.
 */
const reconcileGroups = async ({ view, spec, object, fieldByName }) => {
  const field = fieldByName(object, spec.groupBy);
  const options = [...(field.options || [])].sort((a, b) => a.position - b.position);

  const sansCouleur = options.filter((o) => !o.color);
  if (sansCouleur.length > 0) {
    console.error(
      `  ⚠ ${object.nameSingular}.${spec.groupBy} : ${sansCouleur.length} options sans couleur ` +
        `(${sansCouleur.map((o) => o.value).join(', ')})`,
    );
  }

  const wanted = options.filter((o) => !spec.onlyOptions || spec.onlyOptions.test(o.value));

  // NE PAS lire les colonnes via `GET /viewGroups?filter=viewId[eq]:<id>` :
  // l'endpoint accepte le paramètre `filter` et l'ignore silencieusement, en
  // HTTP 200. On récupérerait les colonnes de toutes les vues confondues, et
  // on masquerait celles des autres boards. La ressource `views` embarque
  // ses propres `viewGroups`, correctement rattachés : c'est la seule lecture
  // qui fait foi.
  const existing = (await rest('GET', `views/${view.id}`)).viewGroups || [];
  const byValue = new Map();
  for (const group of existing.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!byValue.has(group.fieldValue)) byValue.set(group.fieldValue, group);
  }

  let writes = 0;
  const apply = async (group, position, isVisible) => {
    if (group.position === position && group.isVisible === isVisible) return;
    await rest('PATCH', `viewGroups/${group.id}`, { position, isVisible });
    writes += 1;
  };

  for (const [index, option] of wanted.entries()) {
    const group = byValue.get(option.value);
    if (group) {
      await apply(group, index, true);
    } else {
      await rest('POST', 'viewGroups', {
        viewId: view.id,
        fieldValue: option.value,
        position: index,
        isVisible: true,
      });
      writes += 1;
    }
  }

  // La colonne « sans valeur » ferme le board : elle rattrape les
  // enregistrements dont le champ n'est pas encore renseigné.
  const empty = byValue.get('');
  if (empty) await apply(empty, wanted.length, true);

  const wantedValues = new Set(wanted.map((o) => o.value));
  let rank = wanted.length + 1;
  for (const [value, group] of byValue) {
    if (value === '' || wantedValues.has(value)) continue;
    await apply(group, rank++, false);
  }

  return writes;
};

const print = (report) => {
  const line = (label, items) =>
    console.log(`${label.padEnd(12)} ${items.length}${items.length ? ' — ' + items.join(', ') : ''}`);

  console.log(DRY_RUN ? '\n=== --dry-run, rien écrit ===\n' : '\n=== appliqué ===\n');
  line('créées', report.créées);
  line('renommées', report.renommées);
  line('conformes', report.conformes);
  if (!DRY_RUN) console.log(`colonnes     ${report.colonnes} écritures de viewGroups`);

  if (report.doublons.length > 0) {
    console.log('\nDoublons repérés — même configuration qu\'une vue retenue, laissés en place :');
    for (const d of report.doublons) {
      console.log(`  « ${d.name} » : ${d.id} (créée le ${d.createdAt})`);
    }
    console.log('  Supprimer avec : DELETE /rest/metadata/views/<id>');
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
