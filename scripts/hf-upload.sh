#!/usr/bin/env bash
# Upload a local image/video to Higgsfield storage and print its public URL.
# Usage: scripts/hf-upload.sh <file>   (png, jpg, webp or mp4)
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${HF_API_KEY:?HF_API_KEY missing in .env}"
F="${1:?file}"
case "${F##*.}" in png) CT=image/png;; jpg|jpeg) CT=image/jpeg;; webp) CT=image/webp;; mp4) CT=video/mp4;; *) echo "unsupported type" >&2; exit 1;; esac
UP=$(curl -sS --fail-with-body -X POST https://api.higgsfield.ai/files/generate-upload-url \
  -H "Authorization: Key $HF_API_KEY" -H "Content-Type: application/json" --data "{\"content_type\":\"$CT\"}")
URL=$(echo "$UP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["upload_url"])')
HDRS=$(echo "$UP" | python3 -c 'import json,sys; [print(f"{k}: {v}") for k,v in json.load(sys.stdin)["upload_headers"].items()]')
ARGS=(); while IFS= read -r h; do [ -n "$h" ] && ARGS+=(-H "$h"); done <<< "$HDRS"
# No Higgsfield credentials go to the presigned storage URL.
curl -sS --fail-with-body -X PUT "$URL" "${ARGS[@]}" --upload-file "$F" >/dev/null
echo "$UP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["public_url"])'
