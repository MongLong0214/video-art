# Palette Snap Feature Review (2026-04-08)

## 대상
- `scripts/lib/extract-palette.ts` (신규)
- `src/shaders/layer.frag` (snapToPalette 추가)
- `src/sketches/layered-psychedelic.ts` (padPalette + uniform 전달)
- `src/lib/scene-schema.ts` (palette 필드)
- `scripts/lib/pipeline-cli.ts` (ColorMode 타입 + positional arg)
- `scripts/pipeline-pro.ts` (palette 추출 조건부)
- `scripts/pipeline.ts` (colorModeArg 포워딩)
- `.claude/skills/layered-pipeline/SKILL.md` (스킬)

## 결과: PASS (P1 1건)
- P1: extractPalette 결과 2개 미만 시 classic fallback 필요
- P2: GLSL break 호환성 — 데스크톱 전용이므로 OK

## 검증
- tsc 0에러, 143 tests 통과, as any 0건, TODO 0건
- 하위호환 확인 (palette 없는 scene.json → uPaletteSize=0 → classic)
- e2e 검증 완료 (부처 + 연꽃 이미지)
