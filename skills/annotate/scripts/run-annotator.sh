#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./registry-lib.sh
. "$SCRIPT_DIR/registry-lib.sh"

if [ $# -ne 1 ]; then
  echo "Usage: run-annotator.sh <path-to-markdown-file>" >&2
  exit 1
fi

MD_FILE="$1"

if [ ! -f "$MD_FILE" ]; then
  echo "Error: File not found: $MD_FILE" >&2
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again." >&2
  exit 1
fi

DOC_DIR="$(cd "$(dirname "$MD_FILE")" && pwd)"
DOC_ABS="$DOC_DIR/$(basename "$MD_FILE")"

# Only the document's own folder is ever mounted. Refusing these roots outright
# is what keeps the container from seeing an entire home directory or volume.
case "$DOC_DIR" in
  "$HOME" | / | /Users | /home | /tmp | /var | /etc)
    echo "Error: refusing to mount $DOC_DIR." >&2
    echo "Move the document into a project folder and run /annotate again." >&2
    exit 1
    ;;
esac

# Pull at most once a day so repeat calls skip the round-trip and the tool keeps
# working offline once the image is cached.
PULL_MARKER="$NOBODY_STATE_DIR/.last-pull"
mkdir -p "$NOBODY_STATE_DIR"
if [ ! -f "$PULL_MARKER" ] || [ -n "$(find "$PULL_MARKER" -mtime +0 2> /dev/null)" ]; then
  echo "Pulling $NOBODY_IMAGE..."
  if docker pull "$NOBODY_IMAGE" > /dev/null 2>&1; then
    touch "$PULL_MARKER"
  else
    echo "Warning: pull failed, using the cached image." >&2
  fi
fi

DEAD="$(probe_dead_sessions)"
MISSING="$(probe_missing_docs)"

eval "$(registry_cli register \
  --session "${CLAUDE_CODE_SESSION_ID:-unknown}" \
  --pid "${CLAUDE_PID:-$PPID}" \
  --cwd "$PWD" \
  --doc "$DOC_ABS" \
  --dead "$DEAD" \
  --missing "$MISSING")"

if container_running && container_image_current && mounts_cover "$REQUIRED_DIRS"; then
  echo "Reusing the running annotator."
else
  docker rm -f "$NOBODY_CONTAINER" > /dev/null 2>&1 || true

  MOUNT_ARGS=()
  while IFS= read -r entry; do
    [ -n "$entry" ] || continue
    MOUNT_ARGS+=(-v "${entry#*=}:/projects/${entry%%=*}")
  done <<< "$REQUIRED_DIRS"

  docker run --rm -d \
    --name "$NOBODY_CONTAINER" \
    -p "127.0.0.1:$NOBODY_PORT:80" \
    -v "$NOBODY_STATE_DIR:/state:ro" \
    "${MOUNT_ARGS[@]}" \
    "$NOBODY_IMAGE" > /dev/null

  echo "Started the annotator."
fi

echo "Viewing: $MD_FILE"
echo "URL: http://localhost:$NOBODY_PORT/d/$DOC_ID"
