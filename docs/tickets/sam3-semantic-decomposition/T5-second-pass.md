# T5: Second Pass (미커버 영역 재분석)

**PRD Ref**: PRD-sam3-semantic-decomposition > US-6 (AC-6.1~6.5)
**Priority**: P1 (High)
**Size**: M (2-3h)
**Status**: Todo
**Depends On**: T2, T3, T4

---

## 1. Objective

1차 SAM3 후 union coverage < secondPassThreshold(80%) 이면 VLM 재분석 → 추가 SAM3 호출 → 레이어 추가. 최대 2회 패스.

## 2. Acceptance Criteria

- [ ] AC-1: 1차 union coverage < secondPassThreshold → 2차 패스 트리거
- [ ] AC-2: 2차 VLM 프롬프트 = 원본 이미지 + "이미 분리된: [list] 제외하고 남은 요소 설명"
- [ ] AC-3: 2차 SAM3 결과 + 기존 candidates 합산. IoU > iouDedupeThreshold이면 중복 제거
- [ ] AC-4: 최대 2회 패스 (passCount 카운터)
- [ ] AC-5: secondPassEnabled=false(config)이면 스킵
- [ ] AC-6: 2차 패스 후에도 미커버 → bg plate에서 처리 (T4)

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `shouldTriggerSecondPass: coverage < threshold` | Unit | union=0.7, threshold=0.8 | true |
| 2 | `shouldTriggerSecondPass: coverage >= threshold` | Unit | union=0.9, threshold=0.8 | false |
| 3 | `shouldTriggerSecondPass: disabled` | Unit | enabled=false | false |
| 4 | `buildSecondPassVlmPrompt: includes exclusion list` | Unit | existing=["buddha","lotus"] | prompt contains "buddha" and "lotus" |
| 5 | `second pass max 2 iterations` | Unit | passCount check | no 3rd pass |

### 3.2 Test File Location
- `scripts/lib/image-decompose.test.ts` (append)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | secondPass logic in decomposeImageSam3() |

### 4.2 Implementation Steps

1. `shouldTriggerSecondPass(unionCoverage, config)` → boolean
2. `buildSecondPassVlmPrompt(existingPrompts)` → system prompt string with exclusion list
3. decomposeImageSam3() main loop: pass 1 → check coverage → pass 2 if needed → merge + dedup

## 5. Edge Cases

- EC-1 (E6): 2차에서도 <80% → 종료, bg plate 처리
- EC-2: 2차 VLM이 동일 프롬프트 반환 → dedup에서 제거

## 6. Review Checklist

- [ ] Red → Green → Refactor
- [ ] 최대 2회 패스 하드 리밋
- [ ] secondPassEnabled=false 스킵 확인
