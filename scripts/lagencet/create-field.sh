#!/bin/bash
# Crée un champ sur un objet Twenty.
#
#   ./create-field.sh <objectMetadataId> <name> <label> <TYPE> [fichierOptions|-] [icone]
#
# Exemples :
#   ./create-field.sh "$DOSSIER_ID" reference "Référence" TEXT - IconHash
#   ./create-field.sh "$DOSSIER_ID" etape "Étape" SELECT referentiels/etapes.json IconProgressCheck
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

OBJECT_ID="${1:?objectMetadataId requis}"
NAME="${2:?name requis}"
LABEL="${3:?label requis}"
TYPE="${4:?type requis}"
OPTIONS="${5:--}"
ICON="${6:-IconTag}"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

node -e '
const fs = require("fs");
const [out, objectMetadataId, name, label, type, options, icon] = process.argv.slice(1);
const field = { objectMetadataId, name, label, type, icon, isNullable: true };
if (options !== "-") field.options = JSON.parse(fs.readFileSync(options, "utf8"));
fs.writeFileSync(out, JSON.stringify({ input: { field } }));
' "$TMP" "$OBJECT_ID" "$NAME" "$LABEL" "$TYPE" "$OPTIONS" "$ICON"

"$HERE/twenty-api.sh" metadata \
  'mutation($input: CreateOneFieldMetadataInput!){ createOneField(input:$input){ id name label type } }' \
  "$(cat "$TMP")"
