# T4: Python backward warp + alpha 처리 스크립트

**PRD Ref**: PRD-ai-motion-pipeline > US-1 (AC-1.4 hueKey 보존), §4.1.3, §4.1 Step M4
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T3

---

## 1. Objective

Python 스크립트 `scripts/motion/warp_pixels.py`를 작성. 원본 이미지 + flow .npy 시퀀스를 입력받아 원본 픽셀을 flow 벡터로 워핑한 프레임 시퀀스를 출력. 전경 RGBA alpha 보존 처리 포함.

## 2. Acceptance Criteria

- [ ] AC-1: 원본 PNG + flow .npy → warped PNG 프레임 시퀀스 출력
- [ ] AC-2: 워핑된 프레임의 RGB가 원본 픽셀에서 비롯됨 (bilinear interpolation)
- [ ] AC-3: RGBA 입력 시 RGB만 워핑 + 원본 alpha 채널 정적 재적용
- [ ] AC-4: 디스클루전 영역 감지 + AI ref 프레임 Oklab L-ab 블렌딩 폴백
- [ ] AC-5: stdout JSON 메타데이터 (frame_count, disocclusion_ratio_avg)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `warps pixels with zero flow` | Integration | flow=0 everywhere | 출력 = 원본과 동일 |
| 2 | `warps pixels with known flow` | Integration | uniform flow (5,0) | 출력이 5px 오른쪽 shift |
| 3 | `preserves alpha channel` | Integration | RGBA 입력 + flow | alpha 채널 원본과 동일 |
| 4 | `detects disocclusion` | Integration | 큰 flow → 경계 영역 | disocclusion_ratio > 0 |
| 5 | `falls back to ref for disocclusion` | Integration | AI ref 프레임 제공 | 디스클루전 영역이 ref에서 채워짐 |
| 6 | `outputs json metadata` | Integration | 정상 실행 | stdout JSON 파싱 가능 |

### 3.2 Test File Location

- `scripts/motion/__tests__/warp_pixels.test.ts`

### 3.3 Mock/Setup Required

- 테스트용 64×64 이미지 + 합성 flow .npy
- AI ref 프레임 (테스트용 단색 이미지)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/motion/warp_pixels.py` | Create | backward warp 메인 스크립트 |

### 4.2 Implementation Steps (Green Phase)

1. argparse: original_image, flow_dir, output_dir, --ref-frames-dir (optional), --has-alpha
2. 원본 이미지 로드 (RGBA 시 alpha 분리)
3. flow .npy 순차 로드
4. 각 flow에 대해 backward warp (cv2.remap, bilinear)
5. 디스클루전 마스크 계산 (forward flow로 빈 영역 감지)
6. 디스클루전 영역: AI ref 프레임에서 Oklab L-ab 블렌딩
7. RGBA 시 원본 alpha 재적용
8. warped PNG 저장 + JSON 메타데이터

### 4.3 Refactor Phase

- NumPy vectorization으로 warp 속도 개선

## 5. Edge Cases

- EC-1: RGBA 전경 alpha (E9, §4.1.3)
- EC-2: 대규모 디스클루전 > 5% (E4)
- EC-3: AI ref 프레임 미제공 시 → 디스클루전 영역 원본 유지

## 6. Review Checklist

- [ ] Red/Green/Refactor 완료
- [ ] AC 전부 충족
- [ ] 원본 vs 워핑 프레임 deltaE < 1 (정적 flow 시)
