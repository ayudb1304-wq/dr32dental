#!/usr/bin/env bash
# Submit one Higgsfield image request, poll until done, download the result.
# Usage: scripts/hf-image.sh <name> "<prompt>" [endpoint-path]
# Default endpoint: marketing-studio/image/flare  (Marketing Studio Image 2.5 Flare)
# Reads HF_API_KEY ("keyid:secret") or HF_API_KEY_ID + HF_API_KEY_SECRET from .env.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && set -a && . ./.env && set +a
if [ -n "${HF_API_KEY:-}" ]; then AUTH="$HF_API_KEY"
elif [ -n "${HF_API_KEY_ID:-}" ] && [ -n "${HF_API_KEY_SECRET:-}" ]; then AUTH="$HF_API_KEY_ID:$HF_API_KEY_SECRET"
else echo "No Higgsfield key in .env (HF_API_KEY=keyid:secret)" >&2; exit 1; fi
case "$AUTH" in *:*) ;; *) echo "HF_API_KEY must be 'keyid:secret' (Console gives both)" >&2; exit 1;; esac

NAME="${1:?name}"; PROMPT="${2:?prompt}"; ENDPOINT="${3:-marketing-studio/image/flare}"
RES="${HF_RES:-1k}"; QUALITY="${HF_QUALITY:-high}"
IDEM="$(uuidgen | tr '[:upper:]' '[:lower:]')"
mkdir -p generated

BODY=$(python3 -c 'import json,sys; print(json.dumps({"prompt":sys.argv[1],"resolution":sys.argv[2],"aspect_ratio":"1:1","quality":sys.argv[3],"enhance_prompt":False}))' "$PROMPT" "$RES" "$QUALITY")

echo "POST /$ENDPOINT ($RES, $QUALITY)"
SUBMIT=$(curl -sS --fail-with-body --max-time 60 -X POST "https://api.higgsfield.ai/$ENDPOINT" \
  -H "Authorization: Key $AUTH" -H "Content-Type: application/json" -H "Idempotency-Key: $IDEM" \
  --data "$BODY") || { echo "Submit failed: $SUBMIT" >&2; exit 1; }
RID=$(echo "$SUBMIT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["request_id"])')
echo "request_id=$RID"

DELAY=2
while :; do
  STATUS_JSON=$(curl -sS --max-time 30 "https://api.higgsfield.ai/requests/$RID/status" -H "Authorization: Key $AUTH")
  STATUS=$(echo "$STATUS_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status","?"))')
  echo "  $STATUS"
  case "$STATUS" in completed|failed|nsfw|canceled) break;; esac
  sleep "$DELAY"; DELAY=$(python3 -c "print(min($DELAY*1.5,10))")
done

[ "$STATUS" = completed ] || { echo "$STATUS_JSON"; exit 1; }
URL=$(echo "$STATUS_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["images"][0]["url"])')
EXT="${URL##*.}"; EXT="${EXT%%\?*}"; case "$EXT" in jpg|jpeg|png|webp) ;; *) EXT=png;; esac
OUT="generated/$NAME.$EXT"
curl -sS -L -o "$OUT" "$URL"
echo "saved $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
