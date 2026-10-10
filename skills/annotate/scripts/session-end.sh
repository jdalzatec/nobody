#!/usr/bin/env bash
# Deregister the closing session and stop the annotator only when it was the
# last one using it.
#
# Never fail a session teardown: every exit path is 0. A missing registry, a
# stopped Docker daemon, or an unparseable payload must not make closing a
# session look like an error.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/registry-lib.sh" ] || exit 0
# shellcheck source=./registry-lib.sh
. "$SCRIPT_DIR/registry-lib.sh"

PAYLOAD="$(cat 2> /dev/null)"
SESSION_ID="$(
  printf '%s' "$PAYLOAD" \
    | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -1
)"
SESSION_ID="${SESSION_ID:-${CLAUDE_CODE_SESSION_ID:-}}"

[ -n "$SESSION_ID" ] || exit 0
[ -f "$NOBODY_STATE_DIR/registry.json" ] || exit 0
docker info > /dev/null 2>&1 || exit 0

DEAD="$(probe_dead_sessions)"
MISSING="$(probe_missing_docs)"

REMAINING="$(
  registry_cli deregister \
    --session "$SESSION_ID" \
    --dead "$DEAD" \
    --missing "$MISSING" 2> /dev/null | tr -d '[:space:]'
)"

case "$REMAINING" in
  '' | *[!0-9]*) exit 0 ;;
esac

if [ "$REMAINING" -eq 0 ]; then
  docker stop "$NOBODY_CONTAINER" > /dev/null 2>&1 || true
fi

exit 0
