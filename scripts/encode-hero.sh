#!/usr/bin/env bash
# Encode a raw H3 hero clip into web MP4 (H.264) + WebM (VP9), no audio, <= 2.5 MB each, plus a WebP poster.
# Usage: scripts/encode-hero.sh <raw.mp4> <name: hero-desktop|hero-mobile> <WxH>
# The last frame equals the first (same image as first and last keyframe), so it is dropped for a seamless loop.
set -euo pipefail
cd "$(dirname "$0")/.."
RAW="$1"; NAME="$2"; SIZE="$3"; W="${SIZE%x*}"; H="${SIZE#*x}"
N=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$RAW")
KEEP=$((N - 1))
VF="trim=end_frame=${KEEP},setpts=PTS-STARTPTS,scale=${W}:${H}:flags=lanczos,format=yuv420p"
LIMIT=2500000
for crf in 20 22 24 26 28 30 32; do
  ffmpeg -v error -y -i "$RAW" -an -vf "$VF" -c:v libx264 -preset slow -crf $crf -profile:v high -movflags +faststart "assets/video/$NAME.mp4"
  [ "$(stat -f%z "assets/video/$NAME.mp4")" -le $LIMIT ] && break
done
echo "mp4 crf=$crf $(stat -f%z "assets/video/$NAME.mp4") bytes"
for crf in 30 32 34 37 40 43; do
  ffmpeg -v error -y -i "$RAW" -an -vf "$VF" -c:v libvpx-vp9 -b:v 0 -crf $crf -row-mt 1 -deadline good -cpu-used 2 "assets/video/$NAME.webm"
  [ "$(stat -f%z "assets/video/$NAME.webm")" -le $LIMIT ] && break
done
echo "webm crf=$crf $(stat -f%z "assets/video/$NAME.webm") bytes"
ffmpeg -v error -y -i "$RAW" -vf "select=eq(n\,0),scale=${W}:${H}:flags=lanczos" -frames:v 1 "generated/hero/${NAME}-poster.png"
python3 -c "
from PIL import Image; import os
im=Image.open('generated/hero/${NAME}-poster.png').convert('RGB')
im.save('assets/img/hero/${NAME}.webp','WEBP',quality=80,method=6); print('poster', os.path.getsize('assets/img/hero/${NAME}.webp'), 'bytes')"
