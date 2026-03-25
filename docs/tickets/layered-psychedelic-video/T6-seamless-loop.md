# T6: Seamless Loop 검증 + 미리보기 통합

**Size**: M
**Priority**: P0
**Depends on**: T5
**AC**: AC5, AC4

## Description

모든 애니메이션이 20초에서 완벽히 루프되는지 검증.
main.ts에 새 스케치 통합, 브라우저 미리보기 30fps 동작 확인.

## Tasks

1. main.ts 수정:
   - `createLayeredPsychedelic` 스케치 로드
   - 해상도: 1080x1080 (기존 psychedelic 스케치와 전환 가능)
   - 기존 Clock(60) 유지 — 실시간 미리보기는 60fps, recording만 30fps
2. Loop 검증 스크립트 (`scripts/validate-loop.ts`):
   - Puppeteer로 페이지 로드
   - 프레임 0 렌더 → pixel buffer 캡처
   - 시간을 20s-1frame으로 설정 → 프레임 599 렌더 → pixel buffer 캡처
   - RMSE 계산: `sqrt(mean((p0 - p599)^2))` per channel
   - RMSE < 2.0 이면 PASS
3. scene.json period 검증: 모든 period 값 ∈ [1, 2, 4, 5, 10, 20]
4. 브라우저 미리보기: `npm run dev` → 실시간 렌더링 확인

## Verification

### 자동 테스트 (vitest)
- [ ] scene.json 내 모든 period 값이 [1, 2, 4, 5, 10, 20] 중 하나 (스키마 검증)

### 스크립트 검증 (Puppeteer)
- [ ] 프레임 0 vs 프레임 599 pixel RMSE < 2.0
- [ ] 브라우저 30fps 이상 (frame delta < 34ms)
- [ ] 20초 후 시각적 불연속 없음

### 수동 확인
- [ ] `npm run dev`에서 레이어 애니메이션 + 이펙트 육안 확인
- [ ] 20초 경과 시 부드러운 루프 확인

## Files

- `src/main.ts` (수정)
- `scripts/validate-loop.ts` (생성)
