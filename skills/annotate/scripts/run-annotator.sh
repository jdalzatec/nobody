#!/usr/bin/env bash
set -euo pipefail

IMAGE="jdalzatec/nobody-webapp:latest"
CONTAINER_NAME="nobody"
PORT=9303

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

if ! docker image inspect "$IMAGE" > /dev/null 2>&1; then
  echo "Image $IMAGE not found locally. Pulling from Docker Hub..."
  docker pull "$IMAGE"
fi

if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
  echo "Stopping existing nobody container..."
  docker stop "$CONTAINER_NAME" > /dev/null 2>&1
fi

MD_FILE_ABS="$(cd "$(dirname "$MD_FILE")" && pwd)/$(basename "$MD_FILE")"

docker run --rm -d \
  --name "$CONTAINER_NAME" \
  -p "$PORT:80" \
  -v "$MD_FILE_ABS:/usr/share/nginx/html/file.md:ro" \
  "$IMAGE" > /dev/null

echo "Nobody is running at http://localhost:$PORT"
echo "Viewing: $MD_FILE"
echo ""
echo "To stop: docker stop $CONTAINER_NAME"
