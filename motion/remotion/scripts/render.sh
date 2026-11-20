#!/usr/bin/env bash
# Render one composition and master its audio for social: scripts/render.sh <CompositionId> <out.mp4>
set -euo pipefail
B=${REMOTION_BROWSER:-}
args=(--crf=17 --gl=angle)
[ -n "$B" ] && args+=(--browser-executable="$B")
npx remotion render "$1" "$2.raw.mp4" "${args[@]}" 2>&1 | grep -E "^\+|rror" || true
ffmpeg -y -loglevel error -i "$2.raw.mp4" -c:v copy -af "alimiter=limit=0.7:level=false,loudnorm=I=-14:TP=-2:LRA=9" -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$2"
rm -f "$2.raw.mp4"
echo "$2 $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2")s $(ffmpeg -i "$2" -af volumedetect -f null - 2>&1 | grep max_volume | sed 's/.*max_volume/max/')"
