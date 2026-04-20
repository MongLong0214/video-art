# T-F1: Gallery Render — Tier A Applied to Existing 13 Presets

**PRD Ref**: PRD-shader-dev-tier-abc > US-4 (AC-4.1a, AC-4.2)
**Priority**: P2
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T-A1, T-A2, T-A3

---

## 1. Objective
Re-render 13 existing solo presets through updated pipeline (now with Tier A uniforms backward-compat at 0) + generate Tier A before/after comparison pairs.

## 2. Acceptance Criteria
- [ ] AC-1: `out/shader-gallery/` 기존 13 mp4 재렌더 (Tier A uniforms = 0 → 시각 동일)
- [ ] AC-2: Tier A before/after 비교 4개 mp4 추가:
  - `baseline-pre-A.mp4` (T13 baseline, no Tier A)
  - `baseline-post-A.mp4` (T13 baseline + multipassFeedback 0.7)
  - `mandala-pre-A.mp4`
  - `mandala-post-A.mp4` (mandala-flow + multipassFeedback 0.5 + lensDistortion 0.2)
- [ ] AC-3: 총 mp4 ≥ 17 (13 기존 + 4 비교)
- [ ] AC-4: 9:16 (720×1280) 5s × 30fps 유지
- [ ] AC-5: `gallery-render.ts`에 `--tier-a-demo` 플래그 (optional CLI) 추가 — 4 비교 mp4 생성 로직

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `gallery-render: --tier-a-demo flag detected` | Unit | argv mock `['--tier-a-demo']` → flag true | FAIL |
| 2 | `gallery-render: tier-a-demo generates 4 comparison presets` | Unit | Mock: list of presets returned when flag on | FAIL |

### 3.2 Test File Location
- `scripts/gallery-render.test.ts` — minimal unit for flag parsing

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `scripts/gallery-render.ts` | Modify (add --tier-a-demo branch) |
| `scripts/gallery-render.test.ts` | Create |

### 4.2 Implementation Steps
1. Red tests
2. Add `--tier-a-demo` arg parser
3. If flag on: generate 4 temp scene presets (baseline/mandala × pre/post) in memory → render each
4. If flag off: original 13-preset loop
5. Run: `npm run gallery:render` renders 13; `npx tsx scripts/gallery-render.ts --tier-a-demo` renders 4 comparison

### 4.3 Refactor Phase
- Consider adding `--include` / `--exclude` for selective re-renders

## 5. Edge Cases
- EC-1: Pre-A preset = multipassFeedback/lensDistortion missing → handled by schema defaults (0)
- EC-2: Post-A preset validation — ensure boosted uniforms within schema range

## 6. Review Checklist
- [ ] Red/Green PASS
- [ ] 17 mp4 files in out/shader-gallery/
- [ ] Visual diff between pre/post pairs
- [ ] Commit: `feat(gallery): T-F1 Tier A re-render + before/after pairs`
