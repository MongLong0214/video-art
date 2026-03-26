#!/usr/bin/env bash
set -euo pipefail

# merge-av.sh — Merge video + audio into final MP4
# Usage: merge-av.sh <video_path> <audio_path> <output_path>

if [ $# -lt 3 ]; then
  echo "Usage: merge-av.sh <video_path> <audio_path> <output_path>"
  exit 1
fi

VIDEO="$1"
AUDIO="$2"
OUTPUT="$3"

if [ ! -f "$VIDEO" ]; then
  echo "Error: Video file not found: $VIDEO"
  echo "Run video render first (npm run export:layered)"
  exit 1
fi

if [ ! -f "$AUDIO" ]; then
  echo "Error: Audio file not found: $AUDIO"
  echo "Run audio render first (npm run render:audio)"
  exit 1
fi

echo "Merging: $VIDEO + $AUDIO → $OUTPUT"

ffmpeg -y -i "$VIDEO" -i "$AUDIO" -c:v copy -c:a aac -b:a 320k "$OUTPUT" 2>/dev/null

if [ -f "$OUTPUT" ]; then
  echo "OK: $OUTPUT created"
else
  echo "FAIL: Output not created"
  exit 1
fi
