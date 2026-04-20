# T-B3: Particles Sketch (GPU Particle Flow Field)

**PRD Ref**: PRD-shader-dev-tier-abc > US-2 (AC-2.3)
**Priority**: P1 (Tier B)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T0-b (FBO float texture confirmed)

---

## 1. Objective
Implement `?sketch=particles` — 65,536 GPU particles (256×256 position FBO) flowing through a curl-noise vector field. Trail-visualized via additive blending + decay.

## 2. Acceptance Criteria
- [ ] AC-1: `src/shaders/sketches/particles.frag` (display) + `particles-sim.frag` (position update)
- [ ] AC-2: Position FBO: 256×256 RGBA float (65,536 particles). Double-buffered ping-pong
- [ ] AC-3: Simulation: curl-of-fbm3 velocity field, wrapping boundaries
- [ ] AC-4: Rendering: `THREE.Points` with `PointsMaterial` custom shader — reads position from FBO (`gl_VertexID` via `aVertexIndex` attribute → UV lookup)
- [ ] AC-5: Trail effect via blend = additive + frame clear α=0.05 (gradual fade)
- [ ] AC-6: 60fps target @ 720×1280
- [ ] AC-7: sketch-registry entry with `postProcessing: "default"` or `"none"` (decision per perf)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `particles-sim.frag: curl computation` | Unit | Regex: `curl\|∂.*∂y\|dFd` — or custom analytic derivative | FAIL |
| 2 | `particles-sim.frag: position sampled from texture` | Unit | Regex: `texture.*uPositionTex\|uPrevPosition` | FAIL |
| 3 | `particles.frag: uses vertex index for UV lookup` | Unit | Regex: `aVertexIndex\|gl_VertexID\|indexUv` | FAIL |
| 4 | `sketch-registry: particles entry` | Unit | Exists | FAIL |

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `src/shaders/sketches/particles.frag` | Create (fragment = point render) |
| `src/shaders/sketches/particles.vert` | Create (vertex: UV lookup position) |
| `src/shaders/sketches/particles-sim.frag` | Create (position update) |
| `src/shaders/sketches/particles-sim.vert` | Create (fullscreen quad) |
| `src/sketches/particles.ts` | Create (THREE orchestration) |
| `src/main.ts` | Modify (add `particles` branch in `loadSketch()` like T-B1 cellular pattern) |
| `src/lib/sketch-registry.ts` | Modify |
| `src/shaders/sketches/particles.test.ts` | Create |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. Build `src/sketches/particles.ts`:
   - Two position FBOs 256×256 FloatType (or HalfFloat fallback)
   - Init shader: random positions in [-1, 1]^2
   - Sim shader: read prev, apply curl(fbm3) velocity × dt, wrap boundary, write
   - Render: BufferGeometry with 65,536 vertices, `aVertexIndex` attribute ∈ [0, 65535]
   - Vertex shader: `uv = vec2(mod(i,256)/256, floor(i/256)/256)`, sample position from texture, `gl_Position = projection(pos)`
3. Display shader: small point with soft alpha
4. Renderer loop: sim pass → swap buffers → draw particles with additive blend
5. Frame-clear background with α=0.05 for trails (alternatively: accumulation FBO)
6. Register in sketch-registry, wire in main.ts

### 4.3 Refactor Phase
- Reuse `src/lib/ping-pong.ts` from T-B1 if extracted

## 5. Edge Cases
- EC-1 (PRD E6): No RGBA32F support → T0-b said so → fallback HalfFloat (16-bit precision tolerable for particles) or abort Tier B3 with escalation note
- EC-2: Curl noise computation expensive per particle @ 65k → benchmark. Can lower to 32k (128×128) if needed
- EC-3: Trail accumulation — first frames solid → same as multipass E3, accept warmup

## 6. Review Checklist
- [ ] Red/Green PASS
- [ ] `check:shaders` PASS
- [ ] 60fps @ 65k particles (or documented fallback)
- [ ] Visual: particle flow with trails
- [ ] Commit: `feat(sketch): T-B3 GPU particles (curl flow field)`
