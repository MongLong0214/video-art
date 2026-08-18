---
name: layered-pipeline
description: >
  Layered psychedelic video pipeline — 이미지 1장으로 사이키델릭 루프 영상 생성.
  Use when user says "파이프라인 돌려", "영상 만들어", "layered pipeline", "generate video",
  or provides an image file and wants a psychedelic loop video.
  Triggers: /layered-pipeline, /lp, image path + "영상", "비디오", "render", "pipeline"
---

# Layered Pipeline

이미지 1장 → golden/lock 레시피 → scene.json → export-layered → preview/full mp4.

## ⭐ START HERE — `docs/video-os/00-INDEX.md`

| Order | File | Role |
|------:|------|------|
| 0 | `docs/video-os/00-INDEX.md` | entry + conflict rules |
| 1 | `docs/video-os/01-CREATE-OS.md` | **sole create OS** (type tree, runbook, gate, cases) |
| 2 | `docs/video-os/02-REPRO-LOCKS.md` | closed rebuild only |
| 3 | `docs/video-os/03-INSTAGRAM-REELS.md` | reel edit log only |

**Do not** use root `IMAGE_TO_LOOP_WORKFLOW.md`, `PER_IMAGE_TUNING_GUIDE.md`, or `LAYERED_PIPELINE_PLAYBOOK.md` as truth — stubs → `docs/video-os/archive/legacy/`.

> **Non-negotiables (also in create OS):**  
> GLSL only · in-place source motion · animate don't repaint · preview first · no audio until Isaac asks · gate PASS or humanOverride for full · record cases in create OS ledger.

## Usage

```
/layered-pipeline /path/to/image.png
```

### 1. Validate + classify (before spend)

Follow `01-CREATE-OS.md` §3 decision tree → pick golden:

- figure-vivid → `recipes/golden/eye-mirror-phase-advect-r221.json`
- dense-pattern-figure / busy-line → `recipes/golden/woodblock-phase-advect-r139.json`
- allover-vivid → `recipes/golden/cosmos-vivid-oklch-r24b.json`

### 2. Scaffold + preview

```bash
npx tsx scripts/scaffold-layered-run.ts \
  --source "$IMAGE_PATH" \
  --slug "<slug>" \
  --recipe "recipes/golden/<file>.json" \
  --work-dir "out/manual-runs/<slug>"

npx tsx scripts/export-layered.ts \
  --title "<slug>" \
  --work-dir "out/manual-runs/<slug>" \
  --preview
```

### 3. Stills + QA + case

Commands in `01-CREATE-OS.md` §4. Append case ledger there.

### 4. Full (only after Isaac visual OK or explicit 풀렌더)

```bash
npx tsx scripts/export-layered.ts \
  --title "<slug>-final" \
  --work-dir "out/manual-runs/<slug>" \
  --full-res \
  --gate-report "out/manual-runs/<slug>/psychedelic-gate.json"
```

Requires gate PASS or Isaac `humanOverride` on that report.

### 5. Closed rebuild

**Never improvise** — `docs/video-os/02-REPRO-LOCKS.md` (cp lock → scene.json required).

## Hard bans

- img2video APIs  
- Commit MP4 / WAV / `out/**` / regenerated layers  
- Re-tune closed locks without new Isaac defect  
- **Rotation / spin (R-060):** never `phase-angular.png`; never multipass `rotate≠0`; never kaleidoscope / polarTwist / rotateSpeed. After scaffold, **do not swap** golden `phaseField`/`phaseField2` to radial+angular “for spiral/Ganesha”. Halluc = phaseFlow/sat/multipass/glow only, on golden phase maps.

## Prerequisites

- `ffmpeg` · `npx` · `node >=18`  
- Optional Replicate only for legacy multi-layer `pipeline-pro` path (not default for finished vivid)
