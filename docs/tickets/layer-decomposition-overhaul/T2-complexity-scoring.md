# T2: Complexity Scoring

**PRD Ref**: PRD-layer-decomposition-overhaul > US-3, §5.3
**Priority**: P1 (High)
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective

입력 이미지의 복잡도를 측정하여 Qwen layer count (3/4/6)를 자동 결정하는 모듈 구현.

## 2. Acceptance Criteria

- [ ] AC-1: `scoreComplexity(imagePath)` → `{ edgeDensity, colorEntropy, tier, layerCount }`
- [ ] AC-2: simple (edgeDensity < 0.10 && entropy < 5.5) → 3 layers
- [ ] AC-3: complex (edgeDensity > 0.20 || entropy > 7.0) → 6 layers
- [ ] AC-4: medium (그 외) → 4 layers
- [ ] AC-5: `--layers N` override 처리는 T7 (pipeline)에서 담당. scoring 함수 자체는 CLI를 인식하지 않음

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should return 3 for simple image` | Unit | low edge + low entropy 합성 이미지 | tier="simple", layerCount=3 |
| 2 | `should return 6 for complex image` | Unit | high edge density 합성 이미지 | tier="complex", layerCount=6 |
| 3 | `should return 4 for medium image` | Unit | 중간 수준 합성 이미지 | tier="medium", layerCount=4 |
| 4 | `should return edgeDensity in 0-1 range` | Unit | 임의 이미지 | 0 <= edgeDensity <= 1 |
| 5 | `should return colorEntropy in bits` | Unit | 임의 이미지 | entropy > 0 |

### 3.2 Test File Location
- `scripts/lib/complexity-scoring.test.ts` (신규)

### 3.3 Mock/Setup Required
- sharp로 합성 테스트 이미지 생성 (단색, 그라디언트, 노이즈)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/complexity-scoring.ts` | Create | Sobel edge density + HSV histogram entropy |

### 4.2 Implementation Steps (Green Phase)
1. Sobel edge detection (sharp convolution) → edge pixel ratio
2. HSV histogram (hue channel 36-bin) → Shannon entropy
3. Threshold 기반 tier 분류
4. `scoreComplexity()` export

### 4.3 Refactor Phase
- threshold를 const로 분리

## 5. Edge Cases
- EC-1: 단색 이미지 → edgeDensity=0, entropy≈0 → simple (3)
- EC-2: 노이즈 이미지 → edgeDensity≈1 → complex (6)
- EC-3: 모노크롬 그라디언트 → low edge, low entropy → simple (3)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
