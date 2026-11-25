#!/usr/bin/env bash
# lint-diff.sh — comprueba SOLO los ficheros que cambia el PR.
# No muta el working tree: solo se comprueban los ficheros tocados, así que un
# error previo en otro fichero no bloquea.
#
#   BASE_SHA=<sha de la base> bash .github/scripts/lint-diff.sh
#
# En este repo no hay config de eslint (el código de la app es JS plano), así
# que el lint del diff es la comprobación de sintaxis de node + el parseo de
# los JSON.
set -uo pipefail
BASE="${BASE_SHA:-${GITHUB_BASE_REF:-}}"
[ -n "$BASE" ] || BASE="$(git rev-parse HEAD~1 2>/dev/null || echo HEAD)"
CHANGED="$(git diff --name-only --diff-filter=ACMR "$BASE" HEAD)"

FILES=""
while IFS= read -r f; do
  case "$f" in *.js|*.mjs|*.cjs) FILES="$FILES $f";; esac
done <<< "$CHANGED"

JSONS=""
while IFS= read -r f; do
  case "$f" in *.json) JSONS="$JSONS $f";; esac
done <<< "$CHANGED"

ERRORS=0

for f in $FILES; do
  [ -f "$f" ] || continue
  if ! out="$(node --check "$f" 2>&1)"; then
    echo "✗ $f"; echo "$out"; ERRORS=1
  else
    echo "· ok $f"
  fi
done

for f in $JSONS; do
  [ -f "$f" ] || continue
  if ! out="$(node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>&1)"; then
    echo "✗ $f (JSON inválido)"; echo "$out"; ERRORS=1
  else
    echo "· ok $f (JSON)"
  fi
done

[ -n "$FILES$JSONS" ] || echo "· sin ficheros que comprobar"
[ "$ERRORS" = 0 ] || exit 1
echo "· sin errores de sintaxis"
