# Agent entrypoint — video-art

## Mandatory read order

1. **`OUTPUT_GAP_ANALYSIS.md`** — sole operating system for image→loop work  
2. `recipes/golden/*.json` — approved starting recipes (never invent peacock for figure-vivid finals)  
3. **`repro/approved/`** — closed sources + scene + layers (git-tracked; `git pull` then re-export)  
4. `SESSION_HANDOFF_2026-07-15.md` — closed-loop status (eye-mirror r221 closed)  
5. `docs/archive/` — **optional**; full pre-refactor case/theory ledger (only when debugging recurrence)

If any other doc (`IMAGE_TO_LOOP_WORKFLOW.md`, tuning guides, old playbooks, archive) conflicts with `OUTPUT_GAP_ANALYSIS.md`, **follow OUTPUT_GAP_ANALYSIS.md**.

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

## Hard bans

- img2video APIs  
- Overlay / optical-liquid / freeze-source decoration  
- Audio without Isaac’s explicit request  
- Full render without gate report (PASS or Isaac humanOverride)  
- Re-tuning closed approved slugs without new defect feedback  

## Re-export closed finals (any machine after pull)

See `repro/README.md` and `repro/approved/manifest.json`.

```bash
npx tsx scripts/export-layered.ts \
  --title r242-handface-phase-river-gatepass-final \
  --work-dir repro/approved/r242-handface-phase-river-gatepass \
  --full-res \
  --gate-report repro/approved/r242-handface-phase-river-gatepass/psychedelic-gate.json
```

## Do not commit

- `analysis.json` (repo root)  
- `incoming/`  
- `out/` (gitignored render archives / experiments)  
- final/preview **MP4** and audio **WAV** (re-export + local mux)  
- **Do** commit `repro/approved/*` and `sources/approved/*` when closing a final
