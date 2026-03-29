# PRD: RGB Independent Phase-Offset Color Cycling

**Version**: 0.1
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-28
**Status**: Done (Reverted — per-channel RGB phase offset degrades quality; v7 single-hue rotation is optimal)
**Size**: S

---

## 1. Problem Statement

### 1.1 Background
300-frame reference video analysis revealed that the psychedelic color effect is achieved through **independent R/G/B channel oscillation with phase offsets** (R→G: 72deg, R→B: 106deg), not simple HSV hue rotation. Current shader rotates all channels synchronously via a single `hueShift`, causing monochromatic images to produce excessive RGB amplitude (73.5 vs reference 43.0, 71% gap) because all pixels shift to the same hue simultaneously.

### 1.2 Problem Definition
The current single-hueShift color engine cannot match reference quality for monochromatic/low-contrast input images. RGB amplitude overshoots by 71%, and temporal dynamics (frame-to-frame diff) are 53% below reference.

### 1.3 Impact of Not Solving
Quality score capped at ~68/100 (excl edge ~72/100). The pipeline produces visually monotone color cycling that lacks the rich, shifting palette of the reference.

## 2. Goals & Non-Goals

### 2.1 Goals
- [x] G1: Implement per-channel (R/G/B) independent phase offsets in the fragment shader
- [x] G2: Reduce RGB amplitude gap from 71% to <15% (target: 40-46 vs ref 43)
- [x] G3: Increase temporal diff mean from 5.2 to >8.0 (ref: 11.1)
- [x] G4: Maintain luminance stability (lum range <40, ref: 31.5)
- [x] G5: Achieve quality score (excl edge) >= 85

### 2.2 Non-Goals
- NG1: Fixing edge density gap (content-dependent, not solvable via shader)
- NG2: Adding spatial distortion (wave/parallax removed per reference analysis)
- NG3: Changing the layer decomposition pipeline

## 3. User Stories & Acceptance Criteria

### US-1: Per-channel RGB phase offset in shader
**As a** video artist, **I want** the color cycling to oscillate R, G, B channels independently, **so that** the output matches the reference video's anti-phase color dynamics.

**Acceptance Criteria:**
- [ ] AC-1.1: Shader accepts `uRgPhaseOffset` and `uRbPhaseOffset` uniforms (in degrees, 0-360)
- [ ] AC-1.2: R channel hue is shifted by `hueShift`, G by `hueShift + rgOffset/360`, B by `hueShift + rbOffset/360`
- [ ] AC-1.3: Default values match reference: rgOffset=72, rbOffset=106
- [ ] AC-1.4: Luminance preservation (`hsv.z = originalVal`) still holds
- [ ] AC-1.5: Scene schema validates `rgPhaseOffset` (0-360) and `rbPhaseOffset` (0-360) in AnimationConfig
- [ ] AC-1.6: Scene generator includes phase offsets in role presets
- [ ] AC-1.7: `layered-psychedelic.ts` binds the new uniforms

## 4. Technical Design

N/A (S-size, design is straightforward: add 2 uniforms + schema fields + preset values)

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | rgPhaseOffset=0, rbPhaseOffset=0 | Equivalent to current behavior (single hue shift) | Low |
| E2 | Phase offsets > 360 or < 0 | Zod schema clamps to 0-360 | Low |
| E3 | Fully transparent layer (alpha=0) | `discard` in shader, no color processing | Low |

## 6-12. N/A
