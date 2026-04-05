# T3: 12ch 버스 할당 + OUTPUT_CHANNELS

**PRD Ref**: PRD-audio-pipeline-fix > US-4
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
STEM_BUS 매핑을 6-stem 12ch로 확장하고 OUTPUT_CHANNELS를 업데이트한다.

## 2. Acceptance Criteria
- [ ] AC-4.1: STEM_BUS 매핑 — drums:0, bass:2, hat:4, synth:6, pad:8, fx:10
- [ ] AC-4.2: OUTPUT_CHANNELS = 12

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `STEM_BUS pad group maps to bus 8` | Unit | pad, wavetable_pad → bus 8 | 8 |
| 2 | `STEM_BUS fx maps to bus 10` | Unit | riser → bus 10 | 10 |
| 3 | `OUTPUT_CHANNELS is 12` | Unit | 상수 값 | 12 |
| 4 | `no two stem groups share same bus` | Unit | drums/bass/hat/synth/pad/fx 모두 다른 버스 | True |

### 3.2 Test File Location
- `scripts/lib/render-analysis.test.ts` (새 파일 — 상수/매핑 테스트)

### 3.3 Mock/Setup Required
- 없음 (순수 상수/매핑 테스트)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/render-analysis.ts` | Modify | STEM_BUS, OUTPUT_CHANNELS 수정 |
| `scripts/lib/render-analysis.test.ts` | Create | 버스 매핑 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. STEM_BUS 맵 업데이트:
   - pad, wavetable_pad, granular_pad → 8
   - riser → 10
2. OUTPUT_CHANNELS = 12

### 4.3 Refactor Phase
- STEM_BUS를 별도 상수 파일로 추출 고려 (render-analysis.ts가 이미 길므로)

## 5. Edge Cases
- EC-1: `--multi-stem` 플래그 없으면 2ch 렌더 (기존 동작 유지). 12ch는 `--multi-stem` 또는 `--no-master` 시에만 활성화
