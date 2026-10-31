#!/usr/bin/env bash
# Submit any Higgsfield model request, poll to completion, download the first image/video.
# Usage: scripts/hf-submit.sh <name> <endpoint-path> '<json-body>'
# Reads HF_API_KEY ("keyid:secret") from .env. Never prints the key.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${HF_API_KEY:?HF_API_KEY missing in .env}"
NAME="${1:?name}"; ENDPOINT="${2:?endpoint}"; BODY="${3:?json body}"
IDEM="$(uuidgen | tr '[:upper:]' '[:lower:]')"
mkdir -p generated
echo "POST /$ENDPOINT"
SUBMIT=$(curl -sS --fail-with-body --max-time 60 -X POST "https://api.higgsfield.ai/$ENDPOINT" \
  -H "Authorization: Key $HF_API_KEY" -H "Content-Type: application/json" -H "Idempotency-Key: $IDEM" \
  --data "$BODY") || { echo "Submit failed: $SUBMIT" >&2; exit 1; }
RID=$(echo "$SUBMIT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["request_id"])')
echo "request_id=$RID"
DELAY=2
while :; do
  SJ=$(curl -sS --max-time 30 "https://api.higgsfield.ai/requests/$RID/status" -H "Authorization: Key $HF_API_KEY")
  ST=$(echo "$SJ" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status","?"))')
  echo "  $ST"
  case "$ST" in completed|failed|nsfw|canceled) break;; esac
  sleep "$DELAY"; DELAY=$(python3 -c "print(min($DELAY*1.5,10))")
done
[ "$ST" = completed ] || { echo "$SJ"; exit 1; }
URL=$(echo "$SJ" | python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("images") or [d.get("video")])[0]["url"])')
EXT="${URL##*.}"; EXT="${EXT%%\?*}"; case "$EXT" in jpg|jpeg|png|webp|mp4) ;; *) EXT=bin;; esac
OUT="generated/$NAME.$EXT"; curl -sS -L -o "$OUT" "$URL"
echo "saved $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
