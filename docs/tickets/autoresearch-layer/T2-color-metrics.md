# T2: Color Fidelity Metrics (M1-M3)

**PRD Ref**: PRD-autoresearch-layer > US-1, §4.5 Tier 1
**Priority**: P0 (Blocker)
**Size**: L
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

CIELAB 기반 색감 충실도 메트릭 3종을 구현한다: M1 Color Palette Sinkhorn, M2 Dominant Color CIEDE2000, M3 Color Temperature Ohno+Duv.

## 2. Acceptance Criteria

- [ ] AC-1: M1 — k-means++(k=12) palette 추출 + Sinkhorn distance(ε=0.1) 계산, clamp01 적용, MAX_DIST=50
- [ ] AC-2: M2 — 상위 3 dominant color CIEDE2000 가중평균(0.5/0.3/0.2), clamp01(1 - weighted/50)
- [ ] AC-3: M3 — Ohno 2014 CCT+Duv, mireds 단위, MAX_ΔMRD=100, M3=0.7×CCT+0.3×Duv
- [ ] AC-4: sRGB→CIELAB 변환이 D65 illuminant 기준으로 정확하다
- [ ] AC-5: 동일 이미지 입력 시 M1=1.0, M2=1.0, M3=1.0
- [ ] AC-6: 모든 메트릭이 0-1 범위를 보장한다 (clamp01)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `srgbToLab correctness` | Unit | known sRGB→Lab pair (pure red) | Lab ≈ [53.23, 80.11, 67.22] ±1 |
| 2 | `ciede2000 known pair` | Unit | ΔE of (50,0,0) vs (50,25,0) | ΔE ≈ 12.8 ±0.5 |
| 3 | `ciede2000 identical` | Unit | same Lab → ΔE | 0.0 |
| 4 | `kmeanspp deterministic` | Unit | k=3, fixed seed, simple colors | 재현 가능한 centroids |
| 5 | `sinkhorn identical palettes` | Unit | same palette pair | distance ≈ 0 |
| 6 | `sinkhorn max different` | Unit | black palette vs white palette | distance near MAX_DIST |
| 7 | `M1 identical images` | Unit | same image → M1 | 1.0 |
| 8 | `M1 inverted images` | Unit | image vs color-inverted | < 0.3 |
| 9 | `M2 identical images` | Unit | same image → M2 | 1.0 |
| 10 | `M2 deltaE > 50 clamped` | Unit | very different colors | 0.0 (not negative) |
| 11 | `ohnoCCT known illuminant` | Unit | D65 white → CCT | ≈6504K ±50K |
| 12 | `M3 identical images` | Unit | same image → M3 | 1.0 |
| 13 | `M3 large CCT diff clamped` | Unit | ΔMRD > 100 | 0.0 (not negative) |
| 14 | `M3 Duv component` | Unit | tinted illuminant → Duv > 0 | Duv score < 1.0 |

### 3.2 Test File Location
- `scripts/research/metrics/color-palette.test.ts`
- `scripts/research/metrics/dominant-color.test.ts`
- `scripts/research/metrics/color-temperature.test.ts`

### 3.3 Mock/Setup Required
- 테스트용 이미지: sharp로 생성한 단색/그래디언트/다색 이미지 (파일 I/O 불필요, Buffer 직접 생성)
- k-means seed 고정 가능해야 함

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/metrics/color-palette.ts` | Create | M1: sRGB→Lab, k-means++, Sinkhorn |
| `scripts/research/metrics/dominant-color.ts` | Create | M2: CIEDE2000, top-3 weighted |
| `scripts/research/metrics/color-temperature.ts` | Create | M3: Ohno CCT, Duv, mireds |

### 4.2 Implementation Steps (Green Phase)
1. `srgbToLinear()`, `linearToXyz()`, `xyzToLab()` 변환 체인 (~30줄)
2. `ciede2000(lab1, lab2)` — ISO/CIE 11664-6 구현 (~100줄)
3. `kmeanspp(pixels, k, seed)` — k-means++ 초기화 + Lloyd 반복 (~50줄)
4. `sinkhornDistance(palette1, palette2, weights1, weights2, epsilon)` — 행렬 반복 (~40줄)
5. M1 함수: extractPalette → sinkhornDistance → clamp01
6. M2 함수: extractTopColors → ciede2000 × weights → clamp01
7. `xyzToCCT_ohno()` + `xyzToDuv()` — Robertson LUT + parabolic (~80줄)
8. `rgbToMireds()` 변환 체인
9. M3 함수: mireds delta + Duv delta → weighted → clamp01

## 5. Edge Cases
- EC-1: 단색 이미지 → k-means k=12인데 distinct color 1개 → k=1 fallback
- EC-2: 완전 검정 이미지 → Lab(0,0,0), CCT 정의 불가 → default 6500K
- EC-3: ΔE > 50 → clamp to 0.0 (not negative)
- EC-4: ΔMRD > 100 → clamp to 0.0
