# T3: Visual Quality Metrics (M4-M6)

**PRD Ref**: PRD-autoresearch-layer > US-1, §4.5 Tier 2
**Priority**: P0 (Blocker)
**Size**: L
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

시각 품질 메트릭 3종 구현: M4 MS-SSIM(YCbCr 5-scale), M5 Canny Edge Preservation(2px tolerance), M6 Bidirectional Texture Richness.

## 2. Acceptance Criteria

- [ ] AC-1: M4 — 5-scale MS-SSIM, YCbCr(0.8Y+0.1Cb+0.1Cr), Wang et al. weights
- [ ] AC-2: M5 — Canny edge + 2px morphological dilation + F1 score
- [ ] AC-3: M6 — 8×8 블록 local variance entropy, `clamp01(1 - |log(gen/ref)|)` 양방향
- [ ] AC-4: 동일 이미지 → M4≈1.0, M5=1.0, M6=1.0
- [ ] AC-5: blur 이미지 → M4 감소, M5 감소
- [ ] AC-6: 모든 메트릭 clamp01 보장

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `rgbToYCbCr correctness` | Unit | known RGB → YCbCr | Y/Cb/Cr ±1 |
| 2 | `ssimWindow gaussian` | Unit | 11×11 Gaussian kernel 생성 | sum ≈ 1.0 |
| 3 | `ssimSingleScale identical` | Unit | same channel → SSIM | 1.0 |
| 4 | `msssim 5scale identical` | Unit | same image 5-scale | 1.0 |
| 5 | `msssim blurred < original` | Unit | original vs gaussian blur | < 0.95 |
| 6 | `M4 ycbcr weighted` | Unit | verify 0.8Y+0.1Cb+0.1Cr weighting | correct composite |
| 7 | `cannyEdge produces edges` | Unit | high-contrast image → edge map | non-empty edge map |
| 8 | `dilateEdgeMap 2px` | Unit | single pixel edge → 5×5 region | dilated correctly |
| 9 | `M5 identical images` | Unit | same image → F1 | 1.0 |
| 10 | `M5 shifted 1px` | Unit | 1px shifted image | > 0.8 (tolerance absorbs) |
| 11 | `M5 no tolerance strict` | Unit | 1px shift without dilation | < 0.5 |
| 12 | `textureRichness flat image` | Unit | solid color image | entropy ≈ 0 |
| 13 | `textureRichness noisy image` | Unit | random noise | entropy high |
| 14 | `M6 identical` | Unit | same image | 1.0 |
| 15 | `M6 over-textured penalized` | Unit | gen_richness >> ref | < 1.0 (bidirectional) |

### 3.2 Test File Location
- `scripts/research/metrics/ms-ssim.test.ts`
- `scripts/research/metrics/edge-preservation.test.ts`
- `scripts/research/metrics/texture-richness.test.ts`

### 3.3 Mock/Setup Required
- sharp로 생성한 테스트 이미지 (Buffer): solid, gradient, noise, blur
- Gaussian blur: sharp.blur() 사용

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/metrics/ms-ssim.ts` | Create | M4: MS-SSIM YCbCr 5-scale |
| `scripts/research/metrics/edge-preservation.ts` | Create | M5: Canny + dilation + F1 |
| `scripts/research/metrics/texture-richness.ts` | Create | M6: bidirectional texture |

### 4.2 Implementation Steps (Green Phase)
1. RGB→YCbCr 변환 (BT.601/709 matrix)
2. Gaussian window 생성 (11×11, σ=1.5)
3. Single-scale SSIM(channel) → luminance/contrast/structure
4. MS-SSIM: 5-scale iterative downsample → weighted product
5. M4: 0.8×MS-SSIM_Y + 0.1×Cb + 0.1×Cr
6. Canny: Gaussian smooth → Sobel gradient → NMS → hysteresis threshold
7. 2px dilation: 5×5 structuring element morphological dilation
8. F1: TP/(TP+FP) precision, TP/(TP+FN) recall, harmonic mean
9. 8×8 block variance → variance histogram → Shannon entropy
10. M6: `clamp01(1 - abs(log(gen_entropy / ref_entropy)))`

## 5. Edge Cases
- EC-1: 1×1 이미지 → SSIM undefined → return 1.0 if identical, 0.0 otherwise
- EC-2: 엣지 없는 이미지 (solid color) → empty edge map → F1=1.0 if both empty
- EC-3: ref_richness=0 → log(0) → fallback: gen also 0→1.0, else 0.5
