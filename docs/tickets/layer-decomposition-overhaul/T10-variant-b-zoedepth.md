# T10: Variant B (Qwen+ZoeDepth)

**PRD Ref**: PRD-layer-decomposition-overhaul > US-4, §5.6, §4.1
**Priority**: P2 (Medium)
**Size**: M
**Status**: Todo
**Depends On**: T7, T9

---

## 1. Objective

Variant B 구현: Qwen candidate에 ZoeDepth depth signal을 보조로 추가. per-variant API budget 준수.

## 2. Acceptance Criteria

- [ ] AC-1: `--variant qwen-zoedepth` 경로가 동작 (AC-4.2)
- [ ] AC-2: 같은 input/archive/scene-generator contract 사용 (AC-4.3)
- [ ] AC-3: Variant B API budget: qwen 1 + zoedepth 1 + recursive 최대 2 = 총 4회
- [ ] AC-4: depth signal은 candidate ordering tie-break + selective depth split에만 사용
- [ ] AC-5: depth로 blanket split 금지 (semantic candidate 우선)
- [ ] AC-6: candidate에 meanDepth, depthStd 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should compute meanDepth for candidate` | Unit | known depth map + mask | correct mean |
| 2 | `should compute depthStd for candidate` | Unit | known depth map + mask | correct std |
| 3 | `should use depth as tie-breaker only` | Unit | same role, different depth | deeper one placed behind |
| 4 | `should respect Variant B API budget` | Unit | 1 qwen + 1 zoe + 2 recursive | total=4 |
| 5 | `should not blanket split by depth` | Unit | large candidate, low depthStd | no depth split |
| 6 | `should depth-split when depthStd high` | Unit | large candidate, depthStd > threshold | split into sub-candidates |
| 7 | `should produce same archive structure as Variant A` | Integration | both variants | identical file tree |
| 8 | `should fallback to qwen-only on ZoeDepth failure` | Integration | ZoeDepth mock reject | Variant A와 동일 scene.json 구조 |

### 3.2 Test File Location
- `scripts/lib/pipeline-integration.test.ts` (추가)

### 3.3 Mock/Setup Required
- ZoeDepth API mock (depth map PNG)
- sharp mock for depth computation

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | ZoeDepth 호출 개선 (retry, version pin) |
| `scripts/lib/candidate-extraction.ts` | Modify | depth stats 계산 추가 |
| `scripts/lib/layer-resolve.ts` | Modify | depth tie-breaker + selective split |
| `scripts/pipeline-layers.ts` | Modify | variant-b 분기 |

### 4.2 Implementation Steps (Green Phase)
1. ZoeDepth 호출에 retry + URL validation + version pin 적용
2. candidate extraction에 meanDepth/depthStd 계산 추가
3. layer-resolve에 depth tie-breaker 로직 추가
4. selective depth split: depthStd > threshold인 candidate만 분할
5. pipeline variant-b 분기 조합

### 4.3 Refactor Phase
- depth split threshold를 config로 분리

## 5. Edge Cases
- EC-1: ZoeDepth 실패 → semantic-first fallback (Variant A처럼 동작)
- EC-2: depth map이 전체 flat → depth 정보 무용, tie-break 무효
- EC-3: noisy depth map → depthStd 인위적 높음 → split threshold 상향 필요

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
