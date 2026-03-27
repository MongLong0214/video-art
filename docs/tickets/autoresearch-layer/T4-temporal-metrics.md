# T4: Temporal Metrics (M7-M8)

**PRD Ref**: PRD-autoresearch-layer > US-1, §4.5 Tier 3
**Priority**: P0 (Blocker)
**Size**: M
**Status**: Todo
**Depends On**: T1, T3 (M8 uses single-scale SSIM from T3's ms-ssim module)

---

## 1. Objective

시간축 품질 메트릭 2종 구현: M7 VMAF(ffmpeg libvmaf), M8 Temporal Coherence(consecutive SSIM + flicker detection).

## 2. Acceptance Criteria

- [ ] AC-1: M7 — ffmpeg libvmaf로 full-reference VMAF 0-100 계산 → clamp01(score/100)
- [ ] AC-2: M7 — ffmpeg에 libvmaf 필터 없으면 명확한 에러 + 설치 안내
- [ ] AC-3: M8 — 3 temporal pairs의 consecutive SSIM 평균
- [ ] AC-4: M8 — 저모션 영역 pixel variance로 flicker score 계산
- [ ] AC-5: M8 = 0.5×mean_consecutive_ssim + 0.5×flicker_score
- [ ] AC-6: 동일 영상 비교 → M7 ≈ 1.0 (VMAF 100/100)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `checkVmafAvailable` | Unit | ffmpeg -filters parse | true/false |
| 2 | `parseVmafJson` | Unit | mock VMAF JSON output → score | 번호 추출 |
| 3 | `vmafIdentical` | Integration | same video → VMAF | ≥ 95 |
| 4 | `vmafScoreNormalized` | Unit | VMAF 85 → 0.85 | clamp01 |
| 5 | `consecutiveSsim identical` | Unit | same frame pair → SSIM | 1.0 |
| 6 | `flickerScore stable` | Unit | identical consecutive frames | flicker ≈ 0 → score ≈ 1.0 |
| 7 | `flickerScore unstable` | Unit | alternating black/white frames | flicker high → score low |
| 8 | `M8 composite` | Unit | ssim=0.9 flicker=0.8 → M8 | 0.85 |

### 3.2 Test File Location
- `scripts/research/metrics/vmaf.test.ts`
- `scripts/research/metrics/temporal-coherence.test.ts`

### 3.3 Mock/Setup Required
- VMAF: integration test에 ffmpeg+libvmaf 필요. Unit은 JSON output mock.
- Temporal: sharp로 생성한 동일/다른 프레임 쌍 (Buffer)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/metrics/vmaf.ts` | Create | M7: ffmpeg libvmaf wrapper |
| `scripts/research/metrics/temporal-coherence.ts` | Create | M8: consecutive SSIM + flicker |

### 4.2 Implementation Steps (Green Phase)
1. `checkVmafAvailable()`: `ffmpeg -filters` 파싱 → libvmaf 존재 확인
2. `computeVmaf(refPath, genPath)`: ffmpeg spawn → JSON 파싱 → VMAF score
3. M7: `clamp01(vmaf / 100)`
4. `consecutiveSsim(frameA, frameB)`: grayscale SSIM (T3의 single-scale 재사용)
5. `flickerScore(frameA, frameB)`: pixel diff variance in low-motion regions
6. M8: `0.5 × mean(consecutiveSsim_pairs) + 0.5 × mean(flickerScore_pairs)`

## 5. Edge Cases
- EC-1: ffmpeg libvmaf 미지원 → P0 에러, 설치 안내
- EC-2: 영상 길이 0초 → M7=0, M8=0
- EC-3: VMAF JSON 파싱 실패 → crash 처리 + 진단 로그
- EC-4: 해상도 불일치 → ffmpeg scale 필터 자동 적용
