# T0-b: FBO Float Texture Spike (Puppeteer/ANGLE)

**PRD Ref**: PRD-shader-dev-tier-abc > §10.4 (FBO Float Texture Spike)
**Priority**: P1 (High — gate for Tier B)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
Validate that Puppeteer + ANGLE (used in gallery render) supports `THREE.FloatType` WebGLRenderTarget with precision sufficient for GPU particle positions and cellular automata state buffers. Fail-fast before building Tier B if unsupported.

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/fbo-float-spike.ts` runs headless Puppeteer + Three.js WebGL2 renderer
- [ ] AC-2: Allocates `WebGLRenderTarget(128, 128, { type: THREE.FloatType, format: THREE.RGBAFormat })` — no silent fallback check via `gl.getExtension('EXT_color_buffer_float')`
- [ ] AC-3: Writes known 4-vector value (e.g., `vec4(1.234, 5.678, 9.0, 42.0)`) via a simple fragment shader
- [ ] AC-4: Reads back via `gl.readPixels` with `gl.FLOAT` — asserts all 4 components match within ε=1e-4
- [ ] AC-5: Output JSON: `{ "floatSupported": true|false, "halfFloatSupported": true|false, "precisionError": number }`
- [ ] AC-6: Exit 0 if floatSupported=true, else exit 1 with recommendation (use HalfFloatType / CPU fallback)
- [ ] AC-7: Documented outcome in `docs/tickets/shader-dev-tier-abc/T0-b-spike-result.md` (append after first run)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fbo-float-spike: script loads and exports main` | Unit | import → assert main is Function | FAIL (file absent) |
| 2 | `fbo-float-spike: output JSON shape matches schema` | Unit | Run with mock (Puppeteer stubbed) → parse JSON → assert 3 keys present | FAIL |

### 3.2 Test File Location
- `scripts/fbo-float-spike.test.ts` (vitest)

### 3.3 Mock/Setup
- For unit test: stub Puppeteer launch to return mock browser; real browser only in manual run

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/fbo-float-spike.ts` | Create | Puppeteer + in-page Three.js FBO validation |
| `scripts/fbo-float-spike.test.ts` | Create | Unit smoke test |
| `docs/tickets/shader-dev-tier-abc/T0-b-spike-result.md` | Create | Result report (appended after spike runs) |
| `package.json` | Modify | Add `spike:fbo` script |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. Create spike script structure — reuse vite boot + puppeteer init
3. In-page script (page.evaluate):
   - Create tiny Three.js scene: 128x128 ortho camera, plane w/ shader outputting fixed vec4
   - Render to WebGLRenderTarget floatType
   - Readback via `renderer.readRenderTargetPixels(target, 0, 0, 128, 128, Float32Array)`
   - Compute max-error vs expected, return JSON
4. Handle case where `gl.getExtension('EXT_color_buffer_float')` returns null → mark unsupported
5. Output JSON to stdout; write result file

### 4.3 Refactor Phase
- **Consume** `scripts/lib/headless-browser.ts` created in T0-a. Do NOT duplicate puppeteer.launch or vite boot logic
- If T0-a headless-browser.ts not yet merged (out-of-order session), wait for T0-a (dep)

## 5. Edge Cases
- EC-1: ANGLE reports float support but readback returns NaN → mark unsupported
- EC-2: Precision issue > 1e-3 → mark halfFloat as fallback target
- EC-3: Spike returns inconsistent results across runs → docs prescribe running 3× and using worst case

## 6. Review Checklist
- [ ] Red → Green passes
- [ ] Spike result committed to T0-b-spike-result.md
- [ ] If floatSupported=false, PRD §10.4 fallback (HalfFloatType) escalated to T-B3 scope
- [ ] `npm run spike:fbo` reproducible
- [ ] Commit: `feat(infra): T0-b FBO float texture spike + result doc`
