# T1: Depth Anything V2 API Integration

**PRD**: PRD-depth-anything-v2.md
**US**: US-1 (AC-1.1, 1.2, 1.3, 1.5, 1.6, 1.9, 1.10)
**Size**: M
**Depends on**: T2 (luminance 제거 후 clean decomposeImage()에 작업)
**Blocks**: T3

---

## Description

Replicate API를 통해 Depth Anything V2 모델을 호출하는 `getDepthMap()` 함수를 구현하고, 기존 `decomposeImage()`에 SAM2와 병렬 호출을 통합한다.

## Acceptance Criteria

- [ ] `getDepthMap(replicate, imagePath)` 함수가 `chenxwh/depth-anything-v2` 모델을 호출하여 depth map Buffer 반환
- [ ] `withRetry()` 래핑하여 SAM2와 동일한 재시도 정책 적용
- [ ] SAM2와 DA V2가 `Promise.all`로 병렬 실행. 각 API는 독립적으로 data URI 구성
- [ ] DA V2 input은 preparedPath (SAM2와 동일한 prepared 이미지)
- [ ] depth map을 grayscale Uint8Array로 변환. convention: 0=far, 255=near (DA V2 disparity map 기본 일치)
- [ ] `DecomposeResult`에 `depthMap?: Buffer` 필드 추가
- [ ] DA V2 API 실패 시 graceful fallback — depthMap=undefined, console warning, 파이프라인 계속
- [ ] 입력 이미지 20MB 초과 시 downsample 후 처리
- [ ] Replicate URL validation (기존 `validateReplicateUrl` 재사용)

## Files to Modify

- `scripts/lib/image-decompose.ts` — `getDepthMap()` 추가, `decomposeImage()` Promise.all 통합, DecomposeResult 확장

## TDD Spec (Red Phase)

### Unit Tests
1. `getDepthMap()` — Replicate mock → grayscale Buffer 반환 확인
2. `getDepthMap()` — API 에러 → null 반환 + console.warn 호출
3. `getDepthMap()` — RGB 출력 → grayscale 변환 확인 (sharp.grayscale())
4. `getDepthMap()` — withRetry 동작: 1회 일시 실패 후 재시도 성공 → Buffer 반환
5. `getDepthMap()` — withRetry 최대 초과: 전부 실패 → null 반환 + console.warn
6. `getDepthMap()` — validateReplicateUrl 호출 확인 (잘못된 URL → 에러)
7. `decomposeImage()` — Promise.all로 SAM2+DA V2 병렬 호출 확인 (mock timing)
8. `decomposeImage()` — DA V2 실패 시 SAM masks 정상 반환 + depthMap=undefined
9. `DecomposeResult.depthMap` — Buffer 또는 undefined 타입 확인
10. 입력 크기 검증 — 20MB 초과 이미지 경고/downsample 확인
