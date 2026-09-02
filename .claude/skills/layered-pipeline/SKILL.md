---
name: layered-pipeline
description: >
  Layered psychedelic video pipeline — 이미지 1장으로 사이키델릭 루프 영상 생성.
  Use when user says "파이프라인 돌려", "영상 만들어", "layered pipeline",
  "generate video", or provides an image file and wants a psychedelic loop.
  Triggers: /layered-pipeline, /lp, image path + "영상", "비디오", "render", "pipeline"
---

# Layered Pipeline

**Do not run commands from this file as a shortcut.**  
**SSOT start:** `docs/video-os/00-INDEX.md` (OS v2: floor + ceiling + loop + Isaac quote dictionary) → `04-QUALITY-CONTRACT.md` → `01-CREATE-OS.md` §3 (type) or `02-REPRO-LOCKS.md` (rebuild).

If this skill and `00-INDEX.md` disagree, **00 wins**.

The loop (`00` §2): INTAKE → PREPARE (`prepare-new-source`, `--hero` is the only legal detector override) → SKETCH (`export-layered --sketch` tiles → `sketch-grid.ts`; Isaac picks a **language**, not a knob) → PREVIEW (≤3 per source) → QUOTE (decode with `00` §4) → PICK (`isaac-pick.ts --quote`) → FULL → AUDIO (track + start only) → CLOSE (`close-lock.ts`, default).

Closed rebuild:

```bash
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest-slug>
```

Scaffold-only r221 on rings/pour/beam is a hard FAIL (`session-grade`). There is no skip flag. A knob-only answer to “더 창의적으로” is a ceiling FAIL (`00` §3).
