# Pipeline Status: Depth Cinematic Effects (Phase 2)

**PRD**: docs/prd/PRD-depth-cinematic-effects.md (v0.4, Approved)
**Size**: XL
**Current Phase**: 3 (티켓 상세화 — 다음 세션에서 시작)

## Context for Next Session

- PRD v0.4 Approved (4 rounds of review, all P0/P1 resolved)
- Phase 2 of PRD-depth-anything-v2 (Phase 1 implemented + production-ready)
- 5개 depth cinematic 효과: Depth Animation, Parallax, Haze, Edge Vignette + 5 autoresearch axes
- DOF Blur는 NG1으로 분리 (별도 PRD)
- 모든 default=0 (비활성) → 기존 출력 100% 동일 보장

## Next Steps

1. Phase 3: 티켓 상세화 (TDD spec 포함)
2. Phase 4: 티켓 리뷰 (팀)
3. Phase 5: TDD 개발
4. Phase 6: 최종 전수 리뷰
5. Phase 7: 완료 보고

## Key Technical Decisions (from PRD §4.4)

- depthNorm: renderer 런타임 계산 `(meanDepth ?? 128) / 255` (scene.json 미저장)
- Parallax: `sin(uTime * TAU)` X축만, vertex shader
- Haze: saturationBoost 이후 hsv.y 곱셈
- Feather: UV 경계 vignette + `smoothstep(0,0,x)` 가드
- Depth 분산 가드: stddev < 5 → cinematic axes 강제 0
- Quantize: depth influence를 quantize 이전에 적용

## Files to Modify (from PRD §4.1)

| File | Change |
|------|--------|
| `src/shaders/layer.vert` | parallax UV offset |
| `src/shaders/layer.frag` | haze + vignette |
| `src/sketches/layered-psychedelic.ts` | 6 new uniforms |
| `scripts/lib/scene-generator.ts` | depth-modulated animation + stddev guard + effects |
| `src/lib/scene-schema.ts` | effectsSchema parallax/haze/feather |
| `scripts/research/research-config.ts` | 5 new axes |
| `scripts/research/program.md` | docs |

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 (PRD) | 1 | HAS ISSUE | 0 | 4 | 8 | v0.1→v0.2 |
| 2 (PRD) | 2 | HAS ISSUE | 0 | 1 | 2 | v0.2→v0.3 |
| 2 (PRD) | 3 | HAS ISSUE | 0 | 1 | 2 | v0.3→v0.4 |
| 2 (PRD) | 4 | ALL PASS | 0 | 0 | 0 | v0.4 Approved |
| 3 | - | - | - | - | - | |
| 4 | - | - | - | - | - | |
| 6 | - | - | - | - | - | |
