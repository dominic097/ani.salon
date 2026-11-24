#!/usr/bin/env bash
set -euo pipefail

# A concept-motion treatment from original editorial stills. Not live-action footage.
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
assets="$project_root/assets"
output="${1:-elor-directors-cut-preview.mp4}"
render_tmp="$(mktemp -d)"
trap 'rm -f "$render_tmp/01.mp4" "$render_tmp/02.mp4" "$render_tmp/03.mp4"; rmdir "$render_tmp"' EXIT

ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 24 -t 7 \
  -i "$assets/elor-cinema-hero.webp" \
  -vf "scale=2300:1300:force_original_aspect_ratio=increase,crop=1920:1080:x='(in_w-out_w)/2+n*0.30':y='(in_h-out_h)/2',fps=24,format=yuv420p" \
  -r 24 -an -c:v libx264 -preset fast -crf 25 "$render_tmp/01.mp4"

ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 24 -t 7 \
  -i "$assets/hair-editorial.webp" \
  -vf "scale=2300:1300:force_original_aspect_ratio=increase,crop=1920:1080:x='(in_w-out_w)/2-n*0.22':y='(in_h-out_h)/2',fps=24,format=yuv420p" \
  -r 24 -an -c:v libx264 -preset fast -crf 25 "$render_tmp/02.mp4"

ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 24 -t 7 \
  -i "$assets/elor-beauty-editorial.webp" \
  -vf "scale=2300:1300:force_original_aspect_ratio=increase,crop=1920:1080:x='(in_w-out_w)/2':y='(in_h-out_h)/2+n*0.18',fps=24,format=yuv420p" \
  -r 24 -an -c:v libx264 -preset fast -crf 25 "$render_tmp/03.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$render_tmp/01.mp4" -i "$render_tmp/02.mp4" -i "$render_tmp/03.mp4" \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=6[x1];
    [x1][2:v]xfade=transition=fade:duration=1:offset=12,
    eq=saturation=0.86:contrast=1.05,format=yuv420p[v]" \
  -map '[v]' -an -r 24 -c:v libx264 -crf 24 -preset medium \
  -movflags +faststart "$output"
