#!/usr/bin/env bash
# Shared helpers for run-annotator.sh and session-end.sh.
#
# Both scripts need the identical host-side liveness probes. Duplicating them is
# how the two would eventually disagree about what "dead" means, so they live
# here and are sourced by both.

NOBODY_IMAGE="${NOBODY_IMAGE:-jdalzatec/nobody-webapp:latest}"
NOBODY_CONTAINER="${NOBODY_CONTAINER:-nobody}"
NOBODY_PORT="${NOBODY_PORT:-9303}"
NOBODY_STATE_DIR="${NOBODY_STATE_DIR:-$HOME/.nobody}"

# The image's default entrypoint starts nginx in the foreground, which would
# hang instead of running the CLI, so the entrypoint is overridden.
registry_cli() {
  mkdir -p "$NOBODY_STATE_DIR"
  docker run --rm \
    -v "$NOBODY_STATE_DIR:/state" \
    --entrypoint node \
    "$NOBODY_IMAGE" /app/server/registry-cli.mjs "$@"
}

# Liveness cannot be probed inside the CLI container: it has no host PID
# namespace and no view of the project directories. The host computes both
# verdicts and passes them in.
probe_dead_sessions() {
  registry_cli sessions --pids | while read -r session_id pid; do
    [ -n "$session_id" ] || continue
    kill -0 "$pid" 2> /dev/null || printf '%s,' "$session_id"
  done
}

probe_missing_docs() {
  registry_cli docs --paths | while read -r doc_id doc_path; do
    [ -n "$doc_id" ] || continue
    [ -f "$doc_path" ] || printf '%s,' "$doc_id"
  done
}

container_running() {
  [ -n "$(docker ps -q -f name="^${NOBODY_CONTAINER}$" 2> /dev/null)" ]
}

# True when the running container was created from the image the tag points at
# now. Without this a rebuilt or freshly pulled image would never take effect:
# the mount set still matches, so the stale container would be reused forever.
container_image_current() {
  local want have
  want="$(docker image inspect -f '{{.Id}}' "$NOBODY_IMAGE" 2> /dev/null)" || return 1
  have="$(docker inspect -f '{{.Image}}' "$NOBODY_CONTAINER" 2> /dev/null)" || return 1
  [ -n "$want" ] && [ "$want" = "$have" ]
}

# True when every required directory is already mounted. A subset test, so a
# mount left over from a document that has since disappeared never forces a
# restart.
mounts_cover() {
  local required="$1"
  local actual entry dir_id dir_path

  actual="$(docker inspect -f '{{range .Mounts}}{{.Source}}=>{{.Destination}}
{{end}}' "$NOBODY_CONTAINER" 2> /dev/null)" || return 1

  while IFS= read -r entry; do
    [ -n "$entry" ] || continue
    dir_id="${entry%%=*}"
    dir_path="${entry#*=}"
    printf '%s\n' "$actual" | grep -Fqx "${dir_path}=>/projects/${dir_id}" || return 1
  done <<< "$required"
}
