# T-F2: Gallery Render — Tier B/C Sketches (?sketch= URL Routing)

**PRD Ref**: PRD-shader-dev-tier-abc > US-4 (AC-4.1b, AC-4.2)
**Priority**: P2
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T-B1, T-B2, T-B3, T-C3

---

## 1. Objective
Extend `gallery-render.ts` to handle sketch modes (cellular, volumetric, particles, fractal-cave). Current script only handles layered presets (scene.json-based).

## 2. Acceptance Criteria
- [ ] AC-1: `gallery-render.ts` branches on "sketch" vs "preset" inputs: if preset `.json` → existing layered flow; if sketch name → `?sketch=` URL + sketch-registry duration/fps lookup
- [ ] AC-2: 4 신규 mp4 생성: `cellular.mp4`, `volumetric.mp4`, `particles.mp4`, `fractal-cave.mp4`
- [ ] AC-3: 각 sketch 720×1280 9:16 5s @ 30fps (or sketch-registry fps if different, documented)
- [ ] AC-4: 총 갤러리 mp4 ≥21 (T-F1의 17 + T-F2의 4)
- [ ] AC-5: `scripts/gallery-render.ts` refactored — `renderLayeredPreset(name)` + `renderSketch(name)` 분리 함수

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `gallery-render: sketch mode URL building` | Unit | input name "cellular" → URL `?sketch=cellular` | FAIL |
| 2 | `gallery-render: dispatch to renderSketch for sketch names` | Unit | spy on renderSketch → assert called | FAIL |
| 3 | `gallery-render: sketch list from sketch-registry` | Unit | expects exactly [cellular, volumetric, particles, fractal-cave] in sketch mode list | FAIL |

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `scripts/gallery-render.ts` | Refactor into dispatch + add sketch mode |
| `scripts/gallery-render.test.ts` | Extend (from T-F1) |

### 4.2 Implementation Steps
1. Red tests
2. Refactor: extract `renderLayeredPreset(presetPath)` from existing monolithic `renderPreset`
3. Add `renderSketch(sketchName)`:
   - Duration/fps from sketch-registry (imported or re-read)
   - URL: `http://localhost:5299/?sketch=${sketchName}`
   - Viewport size 720×1280
   - Capture 5s × 30fps = 150 frames
   - Encode with same libx264 veryfast settings
4. Main loop: iterate over layered presets + sketch names
5. Run + verify 21 mp4 in out/shader-gallery/

### 4.3 Refactor Phase
- Shared boot helper (vite + puppeteer) already extracted in T0-a

## 5. Edge Cases
- EC-1: sketch loads failure — capture compile error, skip that sketch with WARNING
- EC-2: particles sketch no `window.__captureFrame` (if implementation differs) — ensure main.ts keeps same capture API for all sketches (should already)
- EC-3: fractal-cave FPS <30 → still render at 30fps (engine-adaptive timestep in main.ts)

## 6. Review Checklist
- [ ] Red/Green PASS
- [ ] 21+ mp4 in out/shader-gallery/
- [ ] Each sketch visually distinct
- [ ] Commit: `feat(gallery): T-F2 sketch mode rendering (?sketch= support)`
