# T-F3: Shader-Dev Manual Docs + Final Review Prep

**PRD Ref**: PRD-shader-dev-tier-abc > US-5 (AC-5.1, AC-5.2)
**Priority**: P2
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T-F1, T-F2 (all Tier A/B/C complete)

---

## 1. Objective
Produce consolidated `docs/shader-dev-manual.md` documenting all 31 shader-dev techniques now implemented (13 Tier 1 + 3 Tier A + 3 Tier B + 7 Tier C bundled + 5 already existed in Tier 0) — with uniform matrix, scene.json snippet, sketch URL, and Related technique links. Plus final readiness verification.

## 2. Acceptance Criteria
- [ ] AC-1: `docs/shader-dev-manual.md` has per-tier sections with:
  - Technique name + shader-dev/techniques reference link
  - File location (layer.frag / post.frag / sketch-name.frag)
  - Uniform table (name, type, range, default)
  - scene.json / URL example
  - Quick visual description
- [ ] AC-2: Each newly created sketch file has JSDoc block at top (already part of per-ticket AC but verified here)
- [ ] AC-3: `docs/tickets/shader-dev-tier-abc/STATUS.md` all tickets Done
- [ ] AC-4: Updated README (if exists) with sketch modes — optional
- [ ] AC-5: Build verification: `tsc --noEmit`, `npx vite build`, `npx vitest run src/`, `npm run check:shaders`, `npm run regress:pixel` 5종 PASS
- [ ] AC-6: git log concise — all 13 tickets have clear `feat(*)` commits
- [ ] AC-7: Decision log entry (DECISION_LOG.md if exists) — or inline in manual — recording OQ-1/OQ-2 final decisions

## 3. TDD Spec
Primarily documentation — minimal test:

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `manual: all 4 sketches referenced` | Unit | grep count of `?sketch=` in manual ≥4 | FAIL if missing |
| 2 | `manual: 3 Tier A uniform tables` | Unit | grep count of tables | FAIL |

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `docs/shader-dev-manual.md` | Create |
| `docs/shader-dev-manual.test.ts` | Create (light, in src/ won't be picked so place in `src/lib/docs-manual.test.ts`) |
| `src/shaders/sketches/*.frag` | Verify JSDoc top blocks present |
| `docs/tickets/shader-dev-tier-abc/STATUS.md` | Update all tickets Done |

### 4.2 Implementation Steps
1. Red test (doc file absent)
2. Generate manual: Tier 0 (pre-existing), Tier 1 (T1-T13), Tier A (T-A1/2/3), Tier B (T-B1/2/3), Tier C (T-C1/2/3 bundled 7 techniques)
3. Per technique: name | file | uniforms | example
4. Include visual thumbnails referencing out/shader-gallery/ mp4 names
5. Verify all JSDoc block present in sketch files
6. Run all 5 build verifications + document results
7. Update STATUS.md — all tickets Done

### 4.3 Refactor Phase
- N/A

## 5. Edge Cases
- N/A (docs only)

## 6. Review Checklist
- [ ] 5-check build suite PASS
- [ ] Manual complete
- [ ] All 13 tickets Done in STATUS.md
- [ ] Commit: `docs: T-F3 shader-dev manual + final readiness report`
