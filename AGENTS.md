# Agent entrypoint — video-art

## Single structure (mandatory)

**All image→loop / locks / Instagram reel agent work starts here:**

1. **`docs/video-os/00-INDEX.md`** — folder map, conflict rules, hard bans  
2. **`docs/video-os/04-QUALITY-CONTRACT.md`** — zero-context bar (hero motion, no box, plates)  
3. **`docs/video-os/01-CREATE-OS.md`** — create / classify / gate / cases (sole creation OS)  
4. **`docs/video-os/02-REPRO-LOCKS.md`** — closed-product rebuild / what to commit  
5. **`docs/video-os/03-INSTAGRAM-REELS.md`** — reel edit logs (not creation aesthetics)  
6. `recipes/golden/*.json` — **new** source start templates only  
7. `recipes/locks/manifest.json` — closed inventory + shas + commands  
8. `docs/video-os/archive/` — optional deep evidence / legacy only  

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

Then **hero-motion tree + pre-Isaac checklist** in `docs/video-os/04-QUALITY-CONTRACT.md` (not optional). Then stills + `qa-motion` + case ledger per `docs/video-os/01-CREATE-OS.md`.

## Rebuild closed final (any machine)

**Do not improvise — `npx tsx scripts/rebuild-closed-lock.ts --slug <slug>`.**  
That script runs scaffold → **`manifest.plates`** → `cp lock → scene.json` → sha/gate checks.  
Skipping plates on r325/r342 produces the wrong movie even if knobs match. Full only with `--full` after Isaac asks.

Manual equivalent: `docs/video-os/02-REPRO-LOCKS.md` §3 end-to-end.

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
- **Rotation / spin / twist motion (R-060, permanent):** never set `phaseField`/`phaseField2` to `phase-angular.png`; never `multipassFeedback.rotate ≠ 0`; never kaleidoscope / polarTwist / rotateSpeed / camera spin. Keep golden phase fields only (`phase-edge` + `phase-mix` for r221; `phase-edge` + `phase-luma-hybrid` for r139). Do **not** “match” a spiral source by adding angular/radial spin — Isaac rejects it as cheap (esp. Ganesha / mandala / spiral BGs).

## Do not commit

- `analysis.json` (repo root)  
- `incoming/`  
- `out/`  
- final/preview **MP4**, audio **WAV**, regenerated **layers**  
