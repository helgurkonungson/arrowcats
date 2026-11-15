#!/usr/bin/env bash
# Converts generated WAVs from Art/audio/<name>.wav into public/audio/<name>.mp3
# (trim silence, loudness-normalize, mono for SFX) and rebuilds manifest.json.
# Usage: tools/audio/process.sh /path/to/Art/audio
set -euo pipefail
SRC="${1:?path to folder with .wav files}"
DST="$(cd "$(dirname "$0")/../.." && pwd)/public/audio"
mkdir -p "$DST"
for f in "$SRC"/*.wav; do
  n="$(basename "$f" .wav)"
  if [[ "$n" == music_* ]]; then
    # music: keep stereo, gentle loudness, no trimming (loop points are in the file)
    ffmpeg -loglevel error -y -i "$f" -af "loudnorm=I=-20:TP=-2" -ac 2 -b:a 128k "$DST/$n.mp3"
  else
    ffmpeg -loglevel error -y -i "$f" -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,afade=t=out:st=0:d=0.02:curve=tri,loudnorm=I=-16:TP=-1.5" -ac 1 -b:a 96k "$DST/$n.mp3"
  fi
  echo "ok $n"
done
( cd "$DST" && ls *.mp3 | sed 's/\.mp3$//' | python3 -c 'import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))' > manifest.json )
echo "manifest: $(cat "$DST/manifest.json")"
