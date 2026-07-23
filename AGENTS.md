# Agent entrypoint — video-art

## Single structure (mandatory)

**All image→loop / locks / Instagram reel agent work starts here:**

1. **`docs/video-os/00-INDEX.md`** — folder map, conflict rules, hard bans  
2. **`docs/video-os/01-CREATE-OS.md`** — create / classify / gate / cases (sole creation OS)  
3. **`docs/video-os/02-REPRO-LOCKS.md`** — closed-product rebuild / what to commit  
4. **`docs/video-os/03-INSTAGRAM-REELS.md`** — reel edit logs (not creation aesthetics)  
5. `recipes/golden/*.json` — **new** source start templates only  
6. `recipes/locks/manifest.json` — closed inventory + shas + commands  
7. `docs/video-os/archive/` — optional deep evidence / legacy only  

**Conflict rule:** creation aesthetics → `01-CREATE-OS.md`.  
**Conflict rule:** pull / other PC / lock / commit media → `02-REPRO-LOCKS.md`.  
**Conflict rule:** reel craft history → `03-INSTAGRAM-REELS.md`; loop look still `01`.

Root files named `OUTPUT_GAP_ANALYSIS.md`, `IMAGE_TO_LOOP_WORKFLOW.md`, old IG session paths, etc. are **stubs or SUPERSEDED**. Do not treat them as truth.

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

Then stills + `qa-motion` + case ledger per `docs/video-os/01-CREATE-OS.md`.

## Rebuild closed final (any machine)

**Do not improvise — follow `docs/video-os/02-REPRO-LOCKS.md` §3 end-to-end.**

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

Follow `docs/video-os/02-REPRO-LOCKS.md` checklist. Minimum commits:

- `sources/approved/<name>.png`
- `recipes/locks/<slug>.json` + `<slug>.gate.json`
- `recipes/locks/manifest.json` (sha256 updated)
- case note in `docs/video-os/01-CREATE-OS.md` when applicable

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
