#!/usr/bin/env bash
# Broadcast-style voice chain, applied in place: scripts/polish-voice.sh public/vo/<video> ...
# Run once per freshly generated set (running twice stacks the processing).
set -euo pipefail
for d in "$@"; do for f in "$d"/*.wav; do
  ffmpeg -y -loglevel error -i "$f" -af "highpass=f=85,deesser=i=0.35,acompressor=threshold=-21dB:ratio=3.2:attack=6:release=90:makeup=2,equalizer=f=220:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.3:g=2.2,equalizer=f=9000:t=h:w=1:g=1.2,aecho=0.85:0.5:23|41:0.07|0.05,loudnorm=I=-16:TP=-1.5:LRA=6" -ar 44100 -ac 1 "$f.tmp.wav" && mv "$f.tmp.wav" "$f"
done; echo "polished $d"; done
