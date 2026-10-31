#!/usr/bin/env bash
# Stamp script URLs in index.html with a short content hash (?v=xxxxxxxx), so browsers fetch
# a changed file instead of reusing a cached copy. Run after editing anything in assets/js.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in assets/js/site.js assets/js/gsap.min.js assets/js/ScrollTrigger.min.js; do
  h=$(shasum -a 256 "$f" | cut -c1-8)
  esc=$(printf '%s' "$f" | sed 's/[.\/]/\\&/g')
  sed -i '' -E "s/src=\"${esc}(\?v=[0-9a-f]+)?\"/src=\"${f//\//\\/}?v=${h}\"/" index.html
  echo "$f -> ?v=$h"
done
