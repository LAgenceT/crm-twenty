#!/bin/bash
# Appel GraphQL sur une instance Twenty.
#
#   TWENTY_URL=https://app.lagence-t.fr \
#   TWENTY_TOKEN_FILE=~/.config/twenty/token \
#   ./twenty-api.sh metadata '<query>' '<variables json>'
#
# Le token n'est jamais écrit dans ce dépôt : il est lu depuis le fichier
# désigné par TWENTY_TOKEN_FILE, ou depuis la variable TWENTY_TOKEN.
set -euo pipefail

URL="${TWENTY_URL:?TWENTY_URL est requis (ex: https://app.lagence-t.fr)}"

if [ -n "${TWENTY_TOKEN:-}" ]; then
  TOKEN="$TWENTY_TOKEN"
elif [ -n "${TWENTY_TOKEN_FILE:-}" ] && [ -f "$TWENTY_TOKEN_FILE" ]; then
  TOKEN=$(tr -d '\n' < "$TWENTY_TOKEN_FILE")
else
  echo "Aucun token : définir TWENTY_TOKEN ou TWENTY_TOKEN_FILE." >&2
  exit 1
fi

ENDPOINT="${1:?endpoint requis : metadata ou graphql}"
QUERY="${2:?query requise}"
VARIABLES="${3:-null}"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

node -e '
const fs = require("fs");
const [out, query, variables] = process.argv.slice(1);
fs.writeFileSync(out, JSON.stringify({
  query,
  variables: variables === "null" ? {} : JSON.parse(variables),
}));
' "$TMP" "$QUERY" "$VARIABLES"

curl -s --max-time 90 -X POST "$URL/$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TMP"
