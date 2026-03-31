# T5: 마스크 Hole-Filling (Gaussian Blur 근사)

**PRD Ref**: PRD-layer-pipeline-overhaul > US-2
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T2 (config 필드 morphCloseEnabled, morphCloseKernelScale)
**Wave**: 2

---

## 1. Objective

SAM3 마스크의 interior holes를 Gaussian blur + threshold 기반 hole-filling으로 메워서, 단일 객체 내부에 구멍이 없는 마스크를 생성한다.

## 2. Acceptance Criteria

- [ ] AC-1: 각 SAM3 마스크에 blur → threshold → AND with dilated original 적용
- [ ] AC-2: blur sigma는 이미지 장변의 1% (최소 3px, 최대 15px)
- [ ] AC-3: hole-filling 후 원본 마스크를 dilate(blur+threshold)한 범위를 초과하지 않음
- [ ] AC-4: sharp `.blur()` + `.threshold()` 기반 구현 (외부 dependency 없음)
- [ ] AC-5: 도넛 모양 마스크 → 내부 구멍 제거 확인
- [ ] AC-6: config `morphCloseEnabled: false` → hole-filling 건너뜀

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fillMaskHoles fills donut interior` | Unit | 50x50 도넛 마스크 (외경25, 내경10) → hole-fill → 중앙 검사 | 내부 픽셀 alpha > 0 |
| 2 | `fillMaskHoles does not expand outer boundary` | Unit | 20x20 원형 마스크 → fill 후 원본 외곽 밖 픽셀 검사 | 외곽 밖 alpha === 0 |
| 3 | `fillMaskHoles respects config disabled` | Unit | morphCloseEnabled=false → 입출력 마스크 동일 | Buffer.equals === true |
| 4 | `fillMaskHoles clamps sigma to min/max` | Unit | 매우 작은 이미지(10x10) → sigma >= 3px | sigma clamped |
| 5 | `fillMaskHoles preserves fully solid mask` | Unit | 완전 불투명 마스크 → 변경 없음 | 입출력 동일 |
| 6 | `fillMaskHoles with iterative blur fills large holes` | Unit | 50x50 도넛 (내경 30px) + 3회 iterative blur | 내부 대부분 alpha > 0 |

### 3.2 Test File Location
- `scripts/lib/mask-postprocess.test.ts` (신규 생성)

### 3.3 Mock/Setup Required
- Vitest: sharp Buffer 직접 생성 (synthetic grayscale masks)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/mask-postprocess.ts` | Create | `fillMaskHoles()` 함수 |
| `scripts/lib/mask-postprocess.test.ts` | Create | hole-filling 테스트 |
| `scripts/lib/image-decompose.ts` | Modify | `buildSam3Candidate` 후 hole-filling 호출 |

### 4.2 Implementation Steps (Green Phase)
1. `mask-postprocess.ts` 생성, `fillMaskHoles(maskBuffer, width, height, config)` 함수
2. 알고리즘:
   - `dilated = sharp(mask).blur(sigma).threshold(64)` — 원본보다 약간 확장된 범위
   - `filled = sharp(mask).blur(sigma * 2).threshold(128)` — 내부 구멍 메움
   - `result = filled AND dilated` — 확장 범위로 클램프
3. `image-decompose.ts`의 `buildSam3Candidate` 내 `applyMaskToImage` 결과에 hole-filling 적용
4. config.morphCloseEnabled=false 시 건너뜀

## 5. Edge Cases
- EC-1: 마스크가 매우 작음 (< 100px) → sigma 최소 3px 보장
- EC-2: 마스크가 완전 투명 → 변경 없이 반환
- EC-3: **대형 구멍 한계** — 단일 blur(sigma)로 내경 > sigma*4 구멍은 메울 수 없음. 해결: 반복 blur (최대 3회 iteration, 매회 threshold 후 재blur) 또는 sigma 스케일을 구멍 크기에 비례하여 동적 조정. TDD에서 내경 10px 도넛(sigma=3px일 때 메워짐) 외에 내경 30px 도넛(sigma=3px에서 부분 충전) 케이스도 테스트하여 한계를 문서화.

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
