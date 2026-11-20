#!/usr/bin/env bash
# Re-render only the first N frames of a composition and splice them onto an existing render.
# scripts/splice-head.sh <CompositionId> <existing.mp4> <frames>
set -euo pipefail
id=$1; vid=$2; n=$3; head="$vid.head.mp4"
args=(--crf=17 --gl=angle --frames=0-$((n-1)) --muted)
[ -n "${REMOTION_BROWSER:-}" ] && args+=(--browser-executable="$REMOTION_BROWSER")
npx remotion render "$id" "$head" "${args[@]}" 2>&1 | grep -E "^\+|rror" || true
ffmpeg -y -loglevel error -i "$head" -i "$vid" -filter_complex "[1:v]trim=start_frame=$n,setpts=PTS-STARTPTS[b];[0:v][b]concat=n=2:v=1:a=0[v]" -map "[v]" -map 1:a -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart "$vid.tmp.mp4"
mv "$vid.tmp.mp4" "$vid"; rm -f "$head"
echo "spliced $vid $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$vid")s"
