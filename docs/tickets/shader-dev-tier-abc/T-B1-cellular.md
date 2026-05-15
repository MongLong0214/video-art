# T-B1: Cellular Automata Sketch (Gray-Scott Reaction-Diffusion)

**PRD Ref**: PRD-shader-dev-tier-abc > US-2 (AC-2.1)
**Priority**: P1 (Tier B)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T0-b (FBO float texture spike confirmed OK)

---

## 1. Objective
Implement a standalone sketch mode `?sketch=cellular` that runs Gray-Scott reaction-diffusion simulation on GPU via FBO ping-pong. Produces organic, coral/mushroom-like evolving patterns.

## 2. Acceptance Criteria
- [ ] AC-1: `src/shaders/sketches/cellular.frag` exists with Gray-Scott formula: `du/dt = Du*∇²u - uv² + f*(1-u)` / `dv/dt = Dv*∇²v + uv² - (f+k)*v`
- [ ] AC-2: `src/lib/sketch-registry.ts` registers `cellular` with `width: 720, height: 1280, fps: 60, postProcessing: "default"`
- [ ] AC-3: `?sketch=cellular` loads → 60fps RD simulation on 512×512 grid (internal) → output 720×1280
- [ ] AC-4: Ping-pong implementation: two `WebGLRenderTarget({ type: HalfFloatType })` alternating read/write each frame
- [ ] AC-5: Uniforms: `uFeed=0.0367, uKill=0.0649, uDiffA=1.0, uDiffB=0.5, uTime` (stable RD params per **Pearson 1993** "Complex patterns in a simple system" — classic coral/spot regime)
- [ ] AC-5a: **Stability validation**: After 500 simulation steps (8.3s @ 60fps), min/max value of state texture stays within [0.0, 1.0] (no divergence). Verify via spike: run sim 500 steps, readback, assert bounds. Document in `T-B1-stability-result.md`.
- [ ] AC-6: Visualization pass: final state → hue-mapped output (use uPaletteA-D from Tier 1 T5 if reusable, or simpler colormap)
- [ ] AC-7: `npm run check:shaders` PASS for `?sketch=cellular`
- [x] AC-8: **Non-loopable — explicit disclosure** in `src/sketches/cellular.ts` header JSDoc. Gray-Scott RD state evolves continuously, not loop-phase-synchronized. Gallery mp4 captures 5s snapshot (frame[0] ≠ frame[149]). Reels downstream can apply ffmpeg ping-pong or accept hard cut.

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `cellular.frag: declares Gray-Scott uniforms` | Unit | Source regex: `uFeed\|uKill\|uDiffA\|uDiffB` | FAIL |
| 2 | `cellular.frag: laplacian 9-tap kernel` | Unit | Regex: `(0\.2\|0\.05).*neighbor\|lap = ` | FAIL |
| 3 | `cellular.frag: uv*v*v term` | Unit | Regex: `u \* v \* v\|uv2` | FAIL |
| 4 | `sketch-registry: cellular entry` | Unit | import + assert has `cellular` key | FAIL |
| 5 | `cellular renders without shader error` | Integration (manual) | `npm run check:shaders` → no error | FAIL until impl |

### 3.2 Test File Location
- `src/shaders/sketches/cellular.test.ts` (shader source regex)
- Extension of `src/lib/sketch-registry.test.ts` if exists, or new

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/shaders/sketches/cellular.frag` | Create | Gray-Scott RD + colormap |
| `src/shaders/sketches/cellular-sim.frag` | Create | Simulation step (write to FBO) |
| `src/lib/sketch-registry.ts` | Modify | Register cellular |
| `src/sketches/cellular.ts` | Create | THREE sketch wrapper (ping-pong FBO) |
| `src/main.ts` | Modify | `loadSketch` supports cellular via dynamic import |
| `src/shaders/sketches/cellular.test.ts` | Create | Regex tests |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. Create `src/sketches/cellular.ts`:
   - Two `WebGLRenderTarget(512, 512, { type: HalfFloatType })` 
   - Initial state: center seeded with u=0.5, v=0.25 (circle)
   - `update(time)`: render sim shader to writeTarget reading from readTarget → swap; then render display shader reading final state
3. Create `cellular-sim.frag` — Gray-Scott step with Laplacian 9-tap
4. Create `cellular.frag` — display pass: sample sim state, colormap to RGB
5. Register in `sketch-registry.ts`
6. Wire in `main.ts loadSketch` with `?sketch=cellular` branch (dynamic import pattern matching existing)
7. Verify: `npm run check:shaders` PASS + browser visual
8. Preset: `public/presets/sketches/cellular.json` (if sketch-registry needs params)

### 4.3 Refactor Phase
- Extract ping-pong helper `src/lib/ping-pong.ts` (will be reused by T-B3 particles)

## 5. Edge Cases
- EC-1 (PRD E4): Unstable feed/kill combos → lock defaults 0.0367/0.0649, allow preset override but document ranges
- EC-2 (PRD E10): Seam at loop end — Gray-Scott state doesn't naturally loop. **Accept + document**: sketch is evolutionary, Reel output = infinite wandering (no "seam" mention)
- EC-3: HalfFloat not supported (from T0-b result) → fallback to CPU-side or abort with instruction

## 6. Review Checklist
- [ ] Red/Green all PASS
- [ ] `check:shaders` PASS for cellular
- [ ] 60fps in browser @ 720×1280
- [ ] Organic biological patterns visible
- [ ] Commit: `feat(sketch): T-B1 cellular automata (Gray-Scott RD)`
