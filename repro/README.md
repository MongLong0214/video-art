# Repro packages (git-tracked)

Approved **source + scene + layers + gate** so another machine can `git pull` and re-export without hunting local files.

**Not in git:** final/preview MP4s, audio WAVs, experimental `out/` runs.

## Layout

```
repro/approved/<slug>/
  source.png              # original pixels (sha256 in manifest)
  scene.json              # final knobs (locked)
  layers/                 # phase/flow fields + source (scaffold output)
  psychedelic-gate.json   # PASS or REJECT+humanOverride (scene sha matched)
  analysis.json           # optional metrics
  qa-*.json               # optional QA snapshots

sources/approved/*.png    # convenience copies of closed sources (same bytes)
repro/approved/manifest.json
```

## After pull — re-export final

```bash
# hand-face r242 (gate PASS)
npx tsx scripts/export-layered.ts \
  --title r242-handface-phase-river-gatepass-final \
  --work-dir repro/approved/r242-handface-phase-river-gatepass \
  --full-res \
  --gate-report repro/approved/r242-handface-phase-river-gatepass/psychedelic-gate.json

# eye-mirror r221 (REJECT + Isaac humanOverride in gate file)
npx tsx scripts/export-layered.ts \
  --title r221-eye-mirror-phase-advect-peak-final \
  --work-dir repro/approved/r221-eye-mirror-phase-advect-peak \
  --full-res \
  --gate-report repro/approved/r221-eye-mirror-phase-advect-peak/psychedelic-gate.json
```

Output still lands under `out/layered/` (gitignored).

## Audio mux (local WAV only)

Track names are in `manifest.json`. Files stay on each machine (copyright).

```bash
DIR=out/layered/<archive-dir>
ffmpeg -y -i "$DIR/<name>-final.mp4" -ss 0 -i "/path/to/track.wav" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -shortest "$DIR/<name>-final-with-audio.mp4"
```

## When to add a new package

Only for **Isaac-closed** finals (or gate-PASS locks you intend to re-render elsewhere):

1. Copy work-dir essentials into `repro/approved/<slug>/` (source, scene, layers, gate).
2. Refresh `repro/approved/manifest.json` (sha256).
3. Optionally mirror source into `sources/approved/<name>.png`.
4. Commit. Do **not** commit MP4s.
