#!/usr/bin/env bash
# Encode a raw H3 hero clip for the web: H.264 MP4 (universal), VP9 WebM (Chrome/Android/Firefox) and
# HEVC MP4 tagged hvc1 (Safari, hardware-decoded), all without audio, plus a WebP poster (the first frame).
# Usage: [H264_CRF=..] [VP9_CRF=..] [HEVC_CRF=..] scripts/encode-hero.sh <raw.mp4> <hero-desktop|hero-mobile> <WxH>
# Phone cut (31 Oct 2026): H264_CRF=28 VP9_CRF=36 HEVC_CRF=28 gives 258 / 141 / 148 KB at SSIM >= 0.986.
# The last frame equals the first (same image as first and last keyframe), so it is dropped for a seamless loop.
set -euo pipefail
cd "$(dirname "$0")/.."
RAW="$1"; NAME="$2"; SIZE="$3"; W="${SIZE%x*}"; H="${SIZE#*x}"
H264_CRF="${H264_CRF:-20}"; VP9_CRF="${VP9_CRF:-30}"; HEVC_CRF="${HEVC_CRF:-28}"
N=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$RAW")
VF="trim=end_frame=$((N - 1)),setpts=PTS-STARTPTS,scale=${W}:${H}:flags=lanczos,format=yuv420p"
ffmpeg -v error -y -i "$RAW" -an -vf "$VF" -c:v libx264 -preset slow -crf "$H264_CRF" -profile:v high -movflags +faststart "assets/video/$NAME.mp4"
ffmpeg -v error -y -i "$RAW" -an -vf "$VF" -c:v libvpx-vp9 -b:v 0 -crf "$VP9_CRF" -row-mt 1 -deadline good -cpu-used 2 "assets/video/$NAME.webm"
ffmpeg -v error -y -i "$RAW" -an -vf "$VF" -c:v libx265 -preset slow -crf "$HEVC_CRF" -tag:v hvc1 -x265-params log-level=error -movflags +faststart "assets/video/$NAME-hevc.mp4"
for f in "assets/video/$NAME.mp4" "assets/video/$NAME.webm" "assets/video/$NAME-hevc.mp4"; do
  sz=$(stat -f%z "$f"); echo "$f $((sz / 1024)) KB"
  [ "$sz" -le 2500000 ] || { echo "  over the 2.5 MB limit: raise its CRF" >&2; exit 1; }
done
ffmpeg -v error -y -i "$RAW" -vf "select=eq(n\,0),scale=${W}:${H}:flags=lanczos" -frames:v 1 "generated/hero/${NAME}-poster.png"
python3 -c "
from PIL import Image; import os
Image.open('generated/hero/${NAME}-poster.png').convert('RGB').save('assets/img/hero/${NAME}.webp','WEBP',quality=80,method=6)
print('poster', os.path.getsize('assets/img/hero/${NAME}.webp') // 1024, 'KB')"
