# Agent entrypoint — video-art

## Mandatory read order

1. **`OUTPUT_GAP_ANALYSIS.md`** — sole operating system for image→loop work  
2. `recipes/golden/*.json` — approved starting recipes (never invent peacock for figure-vivid finals)  
3. **`sources/approved/` + `recipes/locks/`** — closed PNG + scene + gate (minimal pull-to-rebuild)  
4. `SESSION_HANDOFF_2026-07-15.md` — closed-loop status  
5. `docs/archive/` — **optional**; full pre-refactor case/theory ledger (only when debugging recurrence)

If any other doc conflicts with `OUTPUT_GAP_ANALYSIS.md`, **follow OUTPUT_GAP_ANALYSIS.md**.

## Default new-source path

```bash
npx tsx scripts/scaffold-layered-run.ts \
  --source "/path/to.png" \
  --slug "rNNN-descriptive-slug" \
  --recipe "recipes/golden/eye-mirror-phase-advect-r221.json" \
  --work-dir "out/manual-runs/rNNN-descriptive-slug"

npx tsx scripts/export-layered.ts \
  --title "rNNN-descriptive-slug" \
  --work-dir "out/manual-runs/rNNN-descriptive-slug" \
  --preview
```

Then stills + `qa-motion` + case ledger per `OUTPUT_GAP_ANALYSIS.md` §4–§9.

## Rebuild closed final (any machine after pull)

See `recipes/locks/README.md` and `recipes/locks/manifest.json`.

```bash
SLUG=r242-handface-phase-river-gatepass
npx tsx scripts/scaffold-layered-run.ts \
  --source sources/approved/r242-hand-face.png \
  --slug "$SLUG" \
  --recipe "recipes/locks/${SLUG}.json" \
  --work-dir "out/manual-runs/${SLUG}"
cp "recipes/locks/${SLUG}.json" "out/manual-runs/${SLUG}/scene.json"
npx tsx scripts/export-layered.ts \
  --title "${SLUG}-final" \
  --work-dir "out/manual-runs/${SLUG}" \
  --full-res \
  --gate-report "recipes/locks/${SLUG}.gate.json"
```

## Hard bans

- img2video APIs  
- Overlay / optical-liquid / freeze-source decoration  
- Audio without Isaac’s explicit request  
- Full render without gate report (PASS or Isaac humanOverride)  
- Re-tuning closed approved slugs without new defect feedback  

## Do not commit

- `analysis.json` (repo root)  
- `incoming/`  
- `out/` (render archives / experiments)  
- final/preview **MP4**, audio **WAV**, phase **layers** (rebuild via scaffold)  

## Do commit when closing a final

- `sources/approved/<name>.png`  
- `recipes/locks/<slug>.json` + `<slug>.gate.json`  
- update `recipes/locks/manifest.json`  

