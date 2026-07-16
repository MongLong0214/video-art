# Agent entrypoint — video-art

## Mandatory read order

1. **`OUTPUT_GAP_ANALYSIS.md`** — sole OS for image→loop *creation* (type, QA, gate, cases)  
2. **`docs/REPRO_LOCKS_PLAYBOOK.md`** — sole OS for *closed-product* store/rebuild (sources + locks)  
3. `recipes/golden/*.json` — **new** source start templates only  
4. `recipes/locks/manifest.json` — closed inventory + shas + commands  
5. `SESSION_HANDOFF_2026-07-15.md` — historical handoff (may lag; prefer locks playbook)  
6. **`docs/INSTAGRAM_REELS_SESSION_2026-07-16.md`** — Instagram reels craft log (r274/r275 cuts, audio timings, Isaac picks; **not** creation OS)  
7. `docs/archive/` — optional deep evidence  

**Conflict rule:** creation aesthetics → `OUTPUT_GAP_ANALYSIS.md`.  
**Conflict rule:** pull / other PC / lock / commit media → `docs/REPRO_LOCKS_PLAYBOOK.md`.

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

## Rebuild closed final (any machine)

**Do not improvise — follow playbook §3 end-to-end**  
(`docs/REPRO_LOCKS_PLAYBOOK.md`).

Summary (r242):

```bash
SLUG=r242-handface-phase-river-gatepass
npx tsx scripts/scaffold-layered-run.ts \
  --source sources/approved/r242-hand-face.png \
  --slug "$SLUG" \
  --recipe "recipes/locks/${SLUG}.json" \
  --work-dir "out/manual-runs/${SLUG}"
cp "recipes/locks/${SLUG}.json" "out/manual-runs/${SLUG}/scene.json"   # REQUIRED
npx tsx scripts/export-layered.ts \
  --title "${SLUG}-final" \
  --work-dir "out/manual-runs/${SLUG}" \
  --full-res \
  --gate-report "recipes/locks/${SLUG}.gate.json"
```

## Close a final into git (lock pack)

Follow playbook **§4.2 checklist**. Minimum commits:

- `sources/approved/<name>.png`
- `recipes/locks/<slug>.json` + `<slug>.gate.json`
- `recipes/locks/manifest.json` (sha256 updated)
- `OUTPUT_GAP_ANALYSIS.md` CASE + approved table

## Hard bans

- img2video APIs  
- Overlay / optical-liquid / freeze-source decoration  
- Audio without Isaac’s explicit track request  
- Full render without gate PASS or Isaac humanOverride  
- Re-tuning closed locks without new Isaac defect  
- **Committing** MP4, WAV, `out/**`, or phase `layers/`  

## Do not commit

- `analysis.json` (repo root)  
- `incoming/`  
- `out/`  
- final/preview **MP4**, audio **WAV**, regenerated **layers**  
