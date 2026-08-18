# video-os — single agent structure (image → psychedelic loop + reels)

**START HERE for all agents.** Do not invent a second truth from chat memory or legacy root playbooks.

This folder is the **only** operating surface for:

- new-source image → 20s GLSL loop (create / judge / gate / cases)
- closed-product store / rebuild / other PC (locks)
- Instagram reels edit logs (not creation aesthetics)

Human-facing prose is secondary. Optimize for agent compliance.

---

## 0. Read order (mandatory)

| Order | File | When |
|------:|------|------|
| **0** | **this file** | always |
| **Q** | `04-QUALITY-CONTRACT.md` | **always** — zero-context execution bar (hero motion, no box, plates) |
| **1** | `01-CREATE-OS.md` | any new source, preview, full, gate, aesthetic rules |
| **2** | `02-REPRO-LOCKS.md` | rebuild closed final, lock pack, other machine, what to commit |
| **3** | `03-INSTAGRAM-REELS.md` | IG reel cut / dual render / audio mux craft log |
| **on demand** | `archive/` | recurrence evidence only — **never** overrides 01 / 04 |

**Conflict rule:** `01-CREATE-OS.md` wins over every legacy path and archive file.  
**Conflict rule:** closed product rebuild → `02-REPRO-LOCKS.md` + locks JSON, not golden improvisation.  
**Conflict rule:** reel *edit* history → `03`; reel *look* of the 20s loop → `01`.  
**Conflict rule:** “what must the agent actually do so Isaac can judge” → `04-QUALITY-CONTRACT.md` (does not override 01 aesthetics).

---

## 1. What lives where

```
docs/video-os/
  00-INDEX.md                 ← you are here
  01-CREATE-OS.md             ← former root OUTPUT_GAP_ANALYSIS.md (canonical)
  02-REPRO-LOCKS.md           ← former docs/REPRO_LOCKS_PLAYBOOK.md (canonical)
  03-INSTAGRAM-REELS.md       ← 2026-07-16 + 2026-07-22 session logs merged
  04-QUALITY-CONTRACT.md      ← zero-context execution bar (mandatory)
  archive/
    legacy/                   ← SUPERSEDED playbooks (do not follow defaults)
    sessions/                 ← dated handoffs
    OUTPUT_GAP_ANALYSIS.*.md  ← symlink to docs/archive deep evidence
```

Data (not prose), still outside this folder:

| Path | Role |
|------|------|
| `recipes/golden/*.json` | new-source start templates |
| `recipes/locks/*` + `manifest.json` | closed finals |
| `sources/approved/*` | locked pixels |
| `out/**` | local only — never commit |

---

## 2. Hard bans (global)

- GLSL only — no img2video APIs  
- No commit: MP4, WAV, `out/**`, regenerated `layers/`  
- No audio until Isaac explicitly requests a track  
- Full render requires gate PASS or Isaac `humanOverride`  
- Do not re-tune closed locks without a new Isaac defect  

---

## 3. Default commands (pointer only — detail in 01/02)

**New source preview:**

```bash
npx tsx scripts/scaffold-layered-run.ts \
  --source "<png>" --slug "<slug>" \
  --recipe "recipes/golden/<from-01-decision-tree>.json" \
  --work-dir "out/manual-runs/<slug>"

npx tsx scripts/export-layered.ts \
  --title "<slug>" --work-dir "out/manual-runs/<slug>" --preview
```

Then stills + `qa-motion` + case ledger per `01-CREATE-OS.md`.

**Rebuild closed final:** `npx tsx scripts/rebuild-closed-lock.ts --slug <slug>`  
(do **not** skip `manifest.plates` — `02-REPRO-LOCKS.md` §3).

---

## 4. Legacy paths (stubs at old locations)

Root / old docs files may still exist as **redirect stubs**.  
If a tool opens them, they only say: **canonical = `docs/video-os/`**.

| Old path | Status |
|----------|--------|
| `OUTPUT_GAP_ANALYSIS.md` (root) | stub → `01-CREATE-OS.md` |
| `docs/REPRO_LOCKS_PLAYBOOK.md` | stub → `02-REPRO-LOCKS.md` |
| `docs/INSTAGRAM_REELS_SESSION_*.md` | stub → `03-INSTAGRAM-REELS.md` |
| `IMAGE_TO_LOOP_WORKFLOW.md` | **SUPERSEDED** — archive/legacy |
| `LAYERED_PIPELINE_PLAYBOOK.md` | **SUPERSEDED** — archive/legacy |
| `PER_IMAGE_TUNING_GUIDE.md` | **SUPERSEDED** — archive/legacy |
| `docs/WORKFLOW-image-to-video.md` | **SUPERSEDED** — archive/legacy |
| `docs/layered-pipeline-usage.md` | **SUPERSEDED** — archive/legacy |

Do **not** apply peacock / prism-sunset / tone-preset defaults from legacy for figure-vivid finals.

---

## 5. Out of scope (do not merge into video-os)

- Audio generation PRDs / SuperCollider tickets (`docs/prd/PRD-audio-*`, `docs/tickets/audio-*`)
- Shader gallery tier tickets (`docs/tickets/shader-dev-*`)
- `.omo/evidence/*` run evidence dumps
- Project `README.md` human marketing / general quick start

---

## 6. Instagram final pick (as of 2026-07-22)

| Product | Path |
|---------|------|
| **IG upload (pick)** | `out/instagram/r283-r284-max13-xfade028-fullres.mp4` |
| Log | `03-INSTAGRAM-REELS.md` Part B |

---

*Structure established 2026-07-22 for agent-only consumption.*
