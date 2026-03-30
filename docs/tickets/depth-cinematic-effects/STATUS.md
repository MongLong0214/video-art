# Pipeline Status: Depth Cinematic Effects (Phase 2)

**PRD**: docs/prd/PRD-depth-cinematic-effects.md (v0.4, Approved)
**Size**: XL
**Current Phase**: 4 완료 (Phase 5 개발 대기)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | Schema + Config Foundation | M | Todo | - | None | scene-schema.ts + research-config.ts |
| T2 | Depth Animation (scene-generator) | M | Todo | - | T1 | depthNorm, speed/glow modulation, stddev guard, effects pass-through |
| T3 | Parallax (vertex shader + renderer) | M | Todo | - | T1, T2 | layer.vert + layered-psychedelic.ts |
| T4 | Haze + Vignette (frag shader + renderer) | M | Todo | - | T1, T2, T3 | layer.frag + layered-psychedelic.ts |
| T5 | Autoresearch Documentation | S | Todo | - | T1-T4 | program.md |

## Dependency Graph

```
T1 (Schema+Config) → T2 (Depth Animation) → T3 (Parallax) → T4 (Haze+Vignette) → T5 (Docs)
```

> 순차 실행: T3→T4 (layered-psychedelic.ts 공유, T4는 T3의 uDepthNorm 바인딩 전제)

## Key Technical Decisions (from PRD §4.4)

- depthNorm: renderer 런타임 계산 `(meanDepth ?? 128) / 255` (scene.json 미저장)
- Parallax: `sin(uTime * TAU)` X축만, vertex shader
- Haze: saturationBoost 이후 hsv.y 곱셈
- Feather: UV 경계 vignette + `smoothstep(0,0,x)` 가드
- Depth 분산 가드: stddev < 5 → cinematic axes 강제 0
- Quantize: depth influence를 quantize 이전에 적용

## Files to Modify (from PRD §4.1)

| File | Tickets | Change |
|------|---------|--------|
| `src/lib/scene-schema.ts` | T1 | effectsSchema parallax/haze/feather |
| `scripts/research/research-config.ts` | T1 | 5 new axes |
| `scripts/lib/scene-generator.ts` | T2 | depth animation + stddev guard + effects |
| `src/shaders/layer.vert` | T3 | parallax UV offset |
| `src/shaders/layer.frag` | T4 | haze + vignette |
| `src/sketches/layered-psychedelic.ts` | T3, T4 | 6 new uniforms |
| `scripts/research/program.md` | T5 | docs |

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 (PRD) | 1 | HAS ISSUE | 0 | 4 | 8 | v0.1→v0.2 |
| 2 (PRD) | 2 | HAS ISSUE | 0 | 1 | 2 | v0.2→v0.3 |
| 2 (PRD) | 3 | HAS ISSUE | 0 | 1 | 2 | v0.3→v0.4 |
| 2 (PRD) | 4 | ALL PASS | 0 | 0 | 0 | v0.4 Approved |
| 4 | 1 | HAS ISSUE | 0 | 7 | 9 | Round 1: P1×7 P2×9 → 수정 |
| 4 | 2 | ALL PASS | 0 | 0 | 1 | Round 2: P2×1 잔여(ESM __dirname, 구현 시 확인) |
| 6 | - | - | - | - | - | |
