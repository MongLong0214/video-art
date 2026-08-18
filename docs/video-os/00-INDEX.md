# video-os — SSOT entry (zero-context agents start here)

**This file is the only start page.** Do not invent a second truth from chat memory, `AGENTS.md` command snippets, the layered-pipeline skill, or legacy root playbooks.

Isaac is the **final aesthetic judge**. These docs guarantee **execution grade** (hero travels, no box, no spin, plates on locks) so a judgment is even possible.

---

## 0. What to read (stop after the job file)

| # | File | Open when |
|---|------|-----------|
| 0 | **this file** | always |
| 1 | `04-QUALITY-CONTRACT.md` | always — execution bar |
| 2a | `01-CREATE-OS.md` | **new** source / preview / full / gate / cases |
| 2b | `02-REPRO-LOCKS.md` | **closed** rebuild / lock pack / other PC / what to commit |
| 2c | `03-INSTAGRAM-REELS.md` | reel *edit* log only (not loop look) |
| — | `archive/` | only if 01/02/04 send you there |

**Do not** open 01 and 02 for the same job. Pick 2a or 2b.

| Conflict | Winner |
|----------|--------|
| What the agent must do before Isaac can judge | **04** |
| Creation aesthetics, classify, gate, cases | **01** |
| Rebuild / lock / commit media | **02** + `recipes/locks/manifest.json` |
| Reel cut history | **03**; loop look still **01** |
| This file vs `AGENTS.md` / skill / README | **this file** |
| Anything vs `docs/video-os/archive/` or root stubs | **this folder** |

Root `OUTPUT_GAP_ANALYSIS.md`, `IMAGE_TO_LOOP_WORKFLOW.md`, `docs/REPRO_LOCKS_PLAYBOOK.md` = **redirect stubs**. Not truth.

---

## 1. Two jobs

### A — New image → preview (Isaac judges)

1. Read **04**.
2. Classify + golden in **01** §3.
3. If the chat PNG is not 1632×2912, lanczos-upscale and write `sources/incoming/rNNN-….png`.
4. Scaffold from the golden (`01` §4 Step A).
5. **Hero tree (04 §2)** — custom flow/hold if the living part is rings / pour / beam. Scaffold-only r221 on those sources is a known miss.
6. Preview → stills + qa-motion (`01` §4 C).
7. **04 §4 checklist.** If a box fails, do not present.
8. Case row in `01` §9. Preview path only. No full. No audio.

```bash
# after hero plates exist in the work dir
npx tsx scripts/export-layered.ts \
  --title "<slug>" --work-dir "out/manual-runs/<slug>" --preview
```

### B — Rebuild a closed final (other machine)

```bash
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest slug>
# Isaac asked 풀렌더 on that closed slug:
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest slug> --full
```

Detail: **02** §3. Skipping `manifest.plates` on r325/r342 = wrong movie.

---

## 2. Paths

```
docs/video-os/
  00-INDEX.md              ← you are here (SSOT start)
  04-QUALITY-CONTRACT.md   ← execution bar
  01-CREATE-OS.md          ← create / classify / gate / cases
  02-REPRO-LOCKS.md        ← closed rebuild + lock pack
  03-INSTAGRAM-REELS.md    ← reel edit log
  archive/                 ← evidence only
recipes/golden/*.json      ← new-source start templates
recipes/locks/manifest.json
sources/approved/*         ← locked pixels
out/**                     ← local only — never commit
```

---

## 3. Hard bans (global)

- GLSL only — no img2video  
- No commit: MP4, WAV, `out/**`, `incoming/`, regenerated `layers/`  
- No audio until Isaac names a track  
- Full only after Isaac visual OK **and** gate PASS or Isaac `humanOverride`  
- Do not re-tune a closed lock without a new Isaac defect  
- **R-060:** never `phase-angular` as phase; never `rotate ≠ 0`; never kaleidoscope / polarTwist / rotateSpeed. Custom `phase-halo` / `phase-fall` (distance or vertical, **not** angular) are **required** when 04 says so — that is not spin.

---

## 4. Legacy stubs

| Old path | Status |
|----------|--------|
| `OUTPUT_GAP_ANALYSIS.md` (root) | stub → `01` |
| `docs/REPRO_LOCKS_PLAYBOOK.md` | stub → `02` |
| `docs/INSTAGRAM_REELS_SESSION_*.md` | stub → `03` |
| `IMAGE_TO_LOOP_WORKFLOW.md` | SUPERSEDED |
| `LAYERED_PIPELINE_PLAYBOOK.md` | SUPERSEDED |
| `PER_IMAGE_TUNING_GUIDE.md` | SUPERSEDED |
| `docs/WORKFLOW-image-to-video.md` | SUPERSEDED |
| `docs/layered-pipeline-usage.md` | SUPERSEDED |

Do **not** apply peacock / prism-sunset / tone-preset defaults from legacy.

---

## 5. Out of scope

- Audio generation PRDs / SuperCollider tickets  
- Shader gallery tickets  
- `.omo/evidence/*`  
- Root `README.md` marketing  

Reel *upload pick* lives in `03`, not here.

---

*SSOT tightened 2026-08-18. Structure 2026-07-22.*
