#!/bin/bash
# Traduit en français les libellés de champs d'une instance Twenty.
#
#   TWENTY_URL=... TWENTY_TOKEN_FILE=... ./rename-field-labels.sh
#
# Les champs system-managed (createdAt, updatedAt, createdBy, updatedBy,
# taskTargets) sont refusés par l'API : le script les tente, les signale, et
# ne cherche pas à les contourner. Leur traduction relève de la locale de
# l'utilisateur, pas des métadonnées — voir CUSTOMISATION.md.
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
API="$HERE/twenty-api.sh"

MAP_JSON='{
  "Name": "Nom",
  "Domain Name": "Domaine",
  "Address": "Adresse",
  "Employees": "Employés",
  "Account Owner": "Responsable",
  "People": "Personnes",
  "Companies": "Sociétés",
  "Opportunities": "Opportunités",
  "Tasks": "Tâches",
  "Creation date": "Créé le",
  "Created by": "Créé par",
  "Last update": "Modifié le",
  "Updated by": "Modifié par"
}'

DUMP=$(mktemp); PLAN=$(mktemp)
trap 'rm -f "$DUMP" "$PLAN"' EXIT

"$API" metadata '{ objects(paging:{first:100}) { edges { node { labelPlural isSystem fieldsList { id label } } } } }' > "$DUMP"

node -e '
const fs = require("fs");
const [dump, plan, mapJson] = process.argv.slice(1);
const map = JSON.parse(mapJson);
const data = JSON.parse(fs.readFileSync(dump, "utf8"));
if (data.errors) { console.error(JSON.stringify(data.errors)); process.exit(1); }
const rows = [];
for (const { node: obj } of data.data.objects.edges) {
  if (obj.isSystem) continue;
  for (const field of obj.fieldsList) {
    const target = map[field.label];
    if (target && target !== field.label) rows.push([obj.labelPlural, field.id, field.label, target].join("\t"));
  }
}
fs.writeFileSync(plan, rows.join("\n") + "\n");
console.log(rows.length + " renommage(s) à tenter");
' "$DUMP" "$PLAN" "$MAP_JSON"

OK=0; KO=0
while IFS=$'\t' read -r object id old new; do
  [ -n "${id:-}" ] || continue
  result=$("$API" metadata \
    'mutation($input: UpdateOneFieldMetadataInput!){ updateOneField(input:$input){ label } }' \
    "{\"input\":{\"id\":\"$id\",\"update\":{\"label\":\"$new\"}}}" \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);process.stdout.write(j.errors?"KO|"+j.errors[0].message.slice(0,90):"OK|"+j.data.updateOneField.label)})')
  if [[ "$result" == OK\|* ]]; then
    OK=$((OK + 1)); printf "  ok     %-14s %-16s -> %s\n" "$object" "$old" "${result#OK|}"
  else
    KO=$((KO + 1)); printf "  refusé %-14s %-16s %s\n" "$object" "$old" "${result#KO|}"
  fi
done < "$PLAN"

echo "---- $OK appliqué(s), $KO refusé(s)"
