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
**SSOT start:** `docs/video-os/00-INDEX.md` → `04-QUALITY-CONTRACT.md` → `01-CREATE-OS.md` (new) or `02-REPRO-LOCKS.md` (rebuild).

If this skill and `00-INDEX.md` disagree, **00 wins**.

Closed rebuild:

```bash
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest-slug>
```

New source: follow `00` job A (classify → hero tree → preview). Scaffold-only r221 on rings/pour is a miss.
