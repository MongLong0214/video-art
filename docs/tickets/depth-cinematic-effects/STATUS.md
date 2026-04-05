# Pipeline Status: Depth Cinematic Effects (Phase 2)

**PRD**: docs/prd/PRD-depth-cinematic-effects.md (v0.4, Approved)
**Size**: XL
**Current Phase**: 7 완료

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | Schema + Config Foundation | M | Done | PASS | None | scene-schema.ts + research-config.ts |
| T2 | Depth Animation (scene-generator) | M | Done | PASS | T1 | depthNorm, speed/glow modulation, stddev guard, effects pass-through |
| T3 | Parallax (vertex shader + renderer) | M | Done | PASS | T1, T2 | layer.vert + layered-psychedelic.ts |
| T4 | Haze + Vignette (frag shader + renderer) | M | Done | PASS | T1, T2, T3 | layer.frag + layered-psychedelic.ts |
| T5 | Autoresearch Documentation | S | Done | PASS | T1-T4 | program.md |

## Dependency Graph

```
T1 (Schema+Config) → T2 (Depth Animation) → T3 (Parallax) → T4 (Haze+Vignette) → T5 (Docs)
```

## Key Technical Decisions (from PRD §4.4)

- depthNorm: renderer 런타임 계산 `(meanDepth ?? 128) / 255` (scene.json 미저장)
- Parallax: `sin(uTime * TAU)` X축만, vertex shader
- Haze: saturationBoost 이후 hsv.y 곱셈
- Feather: UV 경계 vignette + `uFeatherRadius < 1e-4` 가드
- Depth 분산 가드: stddev < 5 → cinematic axes 강제 0
- Quantize: depth influence를 quantize 이전에 적용

## Files Modified

| File | Tickets | Change |
|------|---------|--------|
| `src/lib/scene-schema.ts` | T1 | effectsSchema parallax/haze/feather |
| `scripts/research/research-config.ts` | T1 | 5 new axes |
| `scripts/lib/scene-generator.ts` | T2 | depth animation + stddev guard + effects |
| `src/shaders/layer.vert` | T3 | parallax UV offset |
| `src/shaders/layer.frag` | T4 | haze + vignette |
| `src/sketches/layered-psychedelic.ts` | T3, T4 | 6 new uniforms + ClampToEdgeWrapping |
| `scripts/research/program.md` | T5 | docs |

## Test Files Added/Modified

| File | Tests Added |
|------|------------|
| `src/lib/scene-schema.test.ts` | +15 (effects schema) |
| `scripts/research/research-config.test.ts` | +9 (depth cinematic axes) |
| `scripts/lib/scene-generator.test.ts` | +16 (depth modulation + guard + effects) |
| `src/shaders/layer-vert.test.ts` | +7 (new file) |
| `src/shaders/layer-frag.test.ts` | +13 (new file) |
| `src/sketches/layered-psychedelic.test.ts` | +7 (new file) |
| `scripts/research/program.test.ts` | +9 (new file) |

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 (PRD) | 1 | HAS ISSUE | 0 | 4 | 8 | v0.1→v0.2 |
| 2 (PRD) | 2 | HAS ISSUE | 0 | 1 | 2 | v0.2→v0.3 |
| 2 (PRD) | 3 | HAS ISSUE | 0 | 1 | 2 | v0.3→v0.4 |
| 2 (PRD) | 4 | ALL PASS | 0 | 0 | 0 | v0.4 Approved |
| 4 | 1 | HAS ISSUE | 0 | 7 | 9 | Round 1: P1×7 P2×9 → 수정 |
| 4 | 2 | ALL PASS | 0 | 0 | 1 | Round 2: P2×1 잔여(ESM __dirname, 구현 시 확인) |
| 5 | - | PASS | 0 | 0 | 0 | All 5 tickets TDD complete |
| 6 | 1 | HAS ISSUE | 0 | 0 | 3 | P2×3 test gaps → T6-fix |
| 6 | 2 | ALL PASS | 0 | 0 | 0 | P2 all resolved |
