#!/usr/bin/env bash
set -euo pipefail

# loop-crossfade.sh — Seamless loop via tail crossfade
# Usage: loop-crossfade.sh <input_wav> <target_duration_seconds> <output_wav>
# Renders tail 2s crossfaded into head 2s for seamless looping, then trims to exact duration.

if [ $# -lt 3 ]; then
  echo "Usage: loop-crossfade.sh <input_wav> <target_duration> <output_wav>"
  exit 1
fi

INPUT="$1"
TARGET_DUR="$2"
OUTPUT="$3"
FADE_DUR=2

if [ ! -f "$INPUT" ]; then
  echo "Error: Input file not found: $INPUT"
  exit 1
fi

# Get actual duration
ACTUAL_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$INPUT" 2>/dev/null)
echo "Input: ${ACTUAL_DUR}s, Target: ${TARGET_DUR}s, Fade: ${FADE_DUR}s"

# If input is shorter than target + fade, just trim
if (( $(echo "$ACTUAL_DUR < $TARGET_DUR" | bc -l) )); then
  echo "Warning: Input shorter than target. Copying as-is."
  cp "$INPUT" "$OUTPUT"
  exit 0
fi

# Extract tail segment (last FADE_DUR seconds)
TAIL_START=$(echo "$TARGET_DUR" | bc -l)
TAIL_FILE="${INPUT%.wav}-tail.wav"
sox "$INPUT" "$TAIL_FILE" trim "$TAIL_START" "$FADE_DUR" 2>/dev/null || {
  echo "Warning: sox tail extract failed. Copying as-is."
  cp "$INPUT" "$OUTPUT"
  exit 0
}

# Extract head segment (first TARGET_DUR + FADE_DUR seconds)
HEAD_FILE="${INPUT%.wav}-head.wav"
sox "$INPUT" "$HEAD_FILE" trim 0 "$(echo "$TARGET_DUR + $FADE_DUR" | bc -l)" 2>/dev/null

# Crossfade: mix tail (fade-in) with head start, then append rest
# Using ffmpeg for the crossfade mix
MIXED_FILE="${INPUT%.wav}-mixed.wav"
ffmpeg -y -hide_banner -loglevel error \
  -i "$HEAD_FILE" \
  -i "$TAIL_FILE" \
  -filter_complex "[1:a]afade=t=out:st=0:d=${FADE_DUR}[tail];[0:a][tail]amix=inputs=2:duration=longest[out]" \
  -map "[out]" "$MIXED_FILE" 2>/dev/null || {
  echo "Warning: Crossfade failed. Using head only."
  cp "$HEAD_FILE" "$MIXED_FILE"
}

# Trim to exact target duration
sox "$MIXED_FILE" "$OUTPUT" trim 0 "$TARGET_DUR" 2>/dev/null

# Verify
OUT_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUTPUT" 2>/dev/null)
echo "Output: ${OUT_DUR}s (target: ${TARGET_DUR}s)"

# Cleanup temp files
rm -f "$TAIL_FILE" "$HEAD_FILE" "$MIXED_FILE"

echo "Crossfade OK: $OUTPUT"
