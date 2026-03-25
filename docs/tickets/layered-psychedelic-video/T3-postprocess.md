# T3: 레이어 후처리 + scene.json 자동 생성 (Step 2)

**Size**: M
**Priority**: P0
**Depends on**: T2
**AC**: AC2, AC3

## Description

sharp로 레이어 알파 정리, 노이즈 제거, alpha dilate(hole filling), 순서 정리.
분석 결과를 바탕으로 scene.json 자동 생성. Zod 스키마 정의.

## Tasks

1. `scripts/lib/postprocess.ts`:
   - 알파 가장자리 정리: semi-transparent edge → blur + threshold → clean edge
   - 노이즈 제거: 50px 미만 alpha island 제거
   - Alpha dilate: morphological expand (콘텐츠 복원 아님, 가장자리 확장만)
   - 레이어 순서 정리: alpha 커버리지(불투명 비율) 기준 내림차순 = 배경 먼저
2. `src/lib/scene-schema.ts` (브라우저+Node 공용):
   - Zod 스키마 정의 (version, resolution, duration, fps, layers[], effects)
   - 모든 animation period는 20의 약수 [1,2,4,5,10,20] 검증
3. `scripts/lib/scene-generator.ts`:
   - 레이어별 bounds (sharp trim → bounding box)
   - zIndex (순서 결과)
   - 프리셋 animation 파라미터: 배경(zIndex 낮음)→강한 colorCycle/wave, 전경→미세 wave/glow
   - effects 기본값 (bloom, chromaticAberration, sparkle)
4. scene.json 저장 + Zod validation 통과 확인

## Verification

### 자동 테스트 (vitest)
- [ ] 후처리 후 가장자리 1px 이상 노이즈 없음 (alpha histogram)
- [ ] 50px 미만 alpha island 제거됨
- [ ] 레이어 순서: alpha 커버리지 내림차순
- [ ] scene.json 파일 생성 확인
- [ ] scene.json Zod 스키마 통과
- [ ] version, resolution, duration, fps, layers, effects 필드 존재
- [ ] 각 layer: id, file, zIndex, opacity, animation 필드 존재
- [ ] 모든 animation period ∈ [1, 2, 4, 5, 10, 20]

## Files

- `scripts/lib/postprocess.ts` (생성)
- `scripts/lib/scene-generator.ts` (생성)
- `src/lib/scene-schema.ts` (생성 — 브라우저+Node 공용)
