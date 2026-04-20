# Shader-Dev Manual

> Reference for all shader-dev techniques implemented in `experiment/shader-dev-maximal` branch.
>
> **Coverage**: 31/36 applicable techniques from MiniMax-AI/skills shader-dev
> (~86% of project-applicable scope; 5 skipped as subject-mismatch).

## Table of Contents

- [Tier 0 — Pre-existing (5)](#tier-0-pre-existing)
- [Tier 1 — layer.frag extensions (13)](#tier-1-layerfrag-extensions)
- [Tier A — Post-FX chain (3)](#tier-a-post-fx-chain)
- [Tier B — Standalone sketches (3)](#tier-b-standalone-sketches)
- [Tier C — Fractal cave bundle (7)](#tier-c-fractal-cave-bundle)
- [Skipped techniques (5)](#skipped)
- [URL cheat sheet](#url-cheat-sheet)

---

## Tier 0 — Pre-existing

Already in `effect-composer.ts` before this branch.

| Technique | File | Uniforms / Config |
|-----------|------|-------------------|
| kaleidoscope (polar-uv-manipulation) | effect-composer.ts | `effects.kaleidoscope.{segments, blend}` |
| bloom | effect-composer.ts (pmndrs BloomEffect) | `effects.bloom.{strength, radius, threshold}` |
| trails (simple mix feedback) | effect-composer.ts | `effects.trails.strength` |
| godRays | effect-composer.ts | `effects.godRays.{intensity, decay, density, weight, threshold, samples, centerX, centerY}` |
| aura | effect-composer.ts | `effects.aura.{intensity, radius, hueSpeed, samples}` |

---

## Tier 1 — layer.frag extensions

13 techniques added as per-layer uniforms in `animation.*`.

| # | Technique | Uniform key | Range | Default | Visual |
|---|-----------|-------------|-------|---------|--------|
| T1 | domain-warping (IQ recursive fbm) | `domainWarp` | 0..3 | 0 | Organic fbm swirls |
| T2 | domain-repetition | `tileRepeat` | 0..20 | 0 | Infinite tiled pattern |
| T3 | polar-uv-manipulation | `polarTwist` | -10..10 | 0 | Spiral/mandala |
| T4 | voronoi cellular | `voronoiScale, voronoiAmount` | 0..50, 0..2 | 8, 0 | Crystal cell overlay |
| T5 | IQ cosine color-palette | `paletteAmount, paletteA/B/C/D` | 0..1, vec3×4 | 0, IQ defaults | Full palette replacement |
| T6 | procedural-2d-pattern (check/stripe/dot) | `patternType, patternScale, patternAmount` | 0..3, 0..200, 0..1 | 0 | Pattern overlay |
| T7 | sdf-2d (circle/star/hexagon) | `sdfType, sdfScale, sdfAmount` | 0..3, 0..20, 0..1 | 0 | 2D shape edges |
| T8 | fractal-rendering (Julia) | `juliaAmount, juliaC` | 0..1, vec2 | 0, [-0.7, 0.27015] | Julia escape-time |
| T9 | matrix-transform UV | `rotateSpeed, scalePulse` | -5..5, 0..0.5 | 0 | Rotation / pulse |
| T10 | anti-aliasing (fwidth) | — | — | built-in | Derivative-based edges |
| T11 | bicubic texture-sampling | `bicubicFilter` | bool | false | Higher quality texture |
| T12 | Worley F2-F1 veins | `worleyScale, worleyAmount` | 0..50, 0..1 | 8, 0 | Vein network overlay |
| T13 | webgl-pitfalls (audit) | — | — | N/A | Driver-safe patterns |

**scene.json example** (turns on domain-warp + polar-twist + IQ palette):

```json
{
  "layers": [{
    "animation": {
      "domainWarp": 2.0,
      "polarTwist": 3.0,
      "paletteAmount": 0.6
    }
  }]
}
```

---

## Tier A — Post-FX chain

Added as new ShaderPass effects in `effect-composer.ts` and scene schema.

| # | Technique | Uniform key | Range | Default |
|---|-----------|-------------|-------|---------|
| T-A1 | multipass-buffer (feedback + warp) | `effects.multipassFeedback.{strength, warp, decay, hueShift}` | 0..0.95, 0..1 × 3 | 0, 0.2, 0.9, 0 |
| T-A2 | camera-effects (Brown distortion + chromatic + DoF) | `effects.lensDistortion.{barrel, chromatic, dof, vignetteRadius}` | -0.5..0.5, 0..2, 0..1, 0.5..1 | 0, 0, 0, 1 |
| T-A3 | post-processing chain polish | `effects.bloom.*` (tuning via existing uniforms) | — | preserved |

**Pass order** (actual code in `effect-composer.ts`): RenderPass → aura → godRays → mandala → bloom+chromaticAberration (EffectPass) → kaleidoscope → filmGrade → **trails → lensDistortion → multipassFeedback**

> Rationale: feedback-dependent passes (trails, multipassFeedback) run LAST so `feedbackTarget` captures the fully-composed screen-space output. lensDistortion inserted between them for lens-wrap-of-trails behavior.

**Shared infra**: `multipassFeedback` reads from the SAME `feedbackTarget` WebGLRenderTarget as `trails` (no new allocation).

---

## Tier B — Standalone sketches

Independent sketches, loaded via `?sketch=<name>`.

| # | Sketch | File | Technique coverage | FPS target |
|---|--------|------|--------------------|-----------|
| T-B1 | cellular | `src/shaders/sketches/cellular{,-sim}.frag` + `src/sketches/cellular.ts` | cellular-automata (Gray-Scott RD, ping-pong FBO) — **non-loopable (stateful)** | 60 |
| T-B2 | volumetric | `src/shaders/sketches/volumetric.frag` | volumetric-rendering (64-step raymarch + 3D fbm density) | 60 |
| T-B3 | particles | `src/shaders/sketches/particles{-sim}.{frag,vert}` + `src/sketches/particles.ts` | particle-system + simulation-physics (65k particles via position FBO ping-pong, curl-noise flow) — **non-loopable (stateful)** | 60 |

**URL**: `http://localhost:5299/?sketch=volumetric` (or cellular, particles, fractal-cave)

---

## Tier C — Fractal cave bundle

Single file `src/shaders/sketches/fractal-cave.frag` implements 7 techniques (173 LOC, under 600 cap):

| Section | Technique(s) |
|---------|-------------|
| [SECTION 1] SDF Primitives & CSG | sdf-3d, sdf-tricks, csg-boolean-operations |
| [SECTION 2] Scene Composition | animated morphing via CSG |
| [SECTION 3] Ray Marching + Normal Estimation | ray-marching, normal-estimation |
| [SECTION 4] Lighting | lighting-model (Phong), shadow-techniques (soft shadow), ambient-occlusion |
| [SECTION 5] Main | camera orbit, depth fog |

**URL**: `http://localhost:5299/?sketch=fractal-cave`

---

## Skipped

Subject-mismatch for psychedelic loop pipeline:

- `atmospheric-scattering` (realistic sky — off-theme)
- `terrain-rendering` (landscape — off-theme)
- `water-ocean` (realistic water — off-theme)
- `voxel-rendering` (blocky — aesthetic mismatch)
- `sound-synthesis` (in-GLSL audio — orthogonal to audio analyze-track.ts pipeline)

---

## URL cheat sheet

| Mode | URL |
|------|-----|
| Layered (default scene) | `/?mode=layered` |
| Layered (custom preset) | `/?mode=layered&scene=/presets/solo/T13-baseline.json` |
| Sketch — volumetric | `/?sketch=volumetric` |
| Sketch — cellular | `/?sketch=cellular` |
| Sketch — particles | `/?sketch=particles` |
| Sketch — fractal-cave | `/?sketch=fractal-cave` |

**Gallery**: `http://localhost:5299/presets/solo/gallery.html` — all 13 Tier 1 solo previews as iframe grid.

---

## CLI commands

```bash
# Dev server
npm run pipeline:preview

# Verify all shaders compile in headless GL
npm run check:shaders

# Validate Puppeteer/ANGLE float texture support
npm run spike:fbo

# Pixel regression (Tier A backward-compat)
npm run regress:pixel -- --preset solo/T13-baseline --threshold 0.99

# Render full gallery (17 mp4, 9:16, 5s @ 30fps)
npx tsx scripts/gallery-render.ts
```
