# T0-a: Shader Compile Check Script + Pixel-Regression Stub

**PRD Ref**: PRD-shader-dev-tier-abc > §8.2 (Integration Tests — Mandatory Gate) + §10.3 (perf plan)
**Priority**: P0 (Blocker — gate for all subsequent tickets)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
Create two CLI scripts: **(a) shader-compile-check** — Puppeteer-based headless WebGL2 loader that catches shader compile failures in any mode/sketch; **(b) pixel-regression stub** — placeholder for Tier A before/after visual diff (real impl in T-A3).

Tier 1 hit `'program not valid'` runtime errors that regex tests missed. This script closes that gap.

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/shader-compile-check.ts` exists and exits 0 when all modes compile clean
- [ ] AC-2: Script exits 1 with diagnostic output when any of these patterns detected in browser console: `'program not valid'`, `'compile failed'`, `'no matching overloaded function'`, `'undeclared identifier'`, `'WebGL: INVALID_OPERATION: useProgram'`
- [ ] AC-3: Script iterates over all modes: `?mode=layered`, `?mode=layered&scene=/presets/solo/T13-baseline.json`, `?sketch=psychedelic`, `?sketch=cellular`, `?sketch=volumetric`, `?sketch=particles`, `?sketch=fractal-cave` (currently failing modes = `cellular/volumetric/particles/fractal-cave` since not yet built — treat 404 as skip-with-warning)
- [ ] AC-4: `scripts/pixel-regression.ts` stub exists with TODO comment + CLI signature (will be filled in T-A3)
- [ ] AC-5: `package.json` scripts added: `"check:shaders": "tsx scripts/shader-compile-check.ts"`
- [ ] AC-6: Running `npm run check:shaders` on current branch (pre-Tier-A) PASSES for `layered` + `psychedelic` (the two existing working modes)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `shader-compile-check: script exists and is executable` | Unit | Vitest loads file, asserts main() is exported function | FAIL (file doesn't exist) |
| 2 | `shader-compile-check: detects fake shader error string` | Unit | Mock console message matching `'program not valid'` → assert detection | FAIL (no detector) |
| 3 | `shader-compile-check: lists all expected modes` | Unit | Import MODES constant, assert 7 entries | FAIL (no MODES const) |
| 4 | `pixel-regression: stub exists` | Unit | Vitest imports file without throw | FAIL (file doesn't exist) |

### 3.2 Test File Location
- `scripts/shader-compile-check.test.ts` — vitest (project test convention)
- `scripts/pixel-regression.test.ts` — stub test

### 3.3 Mock/Setup
- `vi.spyOn(console, 'error')` for pattern detection tests (no real Puppeteer in unit tests)
- Integration mode (manual): `npm run check:shaders` spins up real Vite + Puppeteer

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/shader-compile-check.ts` | Create | Puppeteer + Vite loader + console capture + exit code |
| `scripts/shader-compile-check.test.ts` | Create | Unit tests for detector + MODES constant |
| `scripts/pixel-regression.ts` | Create | CLI signature stub with TODO markers |
| `scripts/pixel-regression.test.ts` | Create | Import smoke test |
| `package.json` | Modify | Add `check:shaders` script |

### 4.2 Implementation Steps (Green Phase)
1. Write failing tests (Red)
2. Create `shader-compile-check.ts` — reuse `gallery-render.ts` vite + puppeteer boot pattern
3. Define `MODES` array with URL + description
4. Define `ERROR_PATTERNS` regex list
5. Loop: for each mode → new page → goto URL → wait 3s → collect `page.on('console'|'pageerror')` → check against patterns
6. Collect failures; output summary; exit 1 if any
7. Create `pixel-regression.ts` stub (exports `main()` throwing "not implemented", CLI parses `--before` / `--after` args)
8. Add `check:shaders` npm script
9. Verify: `npm run check:shaders` on current branch (layered/psychedelic modes only) passes — Tier B/C sketches don't exist yet, filter or skip gracefully

### 4.3 Refactor Phase
- Extract vite-boot + puppeteer-init helpers to `scripts/lib/headless-browser.ts` (shared with gallery-render.ts)

## 5. Edge Cases
- EC-1: Vite server fails to start → exit 1 with clear message (not hang)
- EC-2: Puppeteer binary missing → clear error
- EC-3: sketch file 404 (mode not yet built) → log WARNING, skip (not FAIL). Allows incremental development
- EC-4: Browser page crash → treated as FAIL

## 6. Review Checklist
- [ ] Red: all 4 tests FAIL before implementation
- [ ] Green: all 4 tests PASS after implementation
- [ ] Refactor: headless-browser.ts shared helper (if extracted)
- [ ] AC-1..6 all checked
- [ ] `npm run check:shaders` PASS on current branch
- [ ] No regression: existing 158 tests still PASS
- [ ] Commit: `feat(infra): T0-a shader compile check + pixel-regression stub`
