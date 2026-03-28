# T12: 기존 장르 프리셋 업데이트

**PRD Ref**: PRD-track-analyzer-phase2 > US-10
**Priority**: P3
**Size**: S
**Status**: Todo
**Depends On**: T1, T2, T3, T4, T5, T6, T7, T8

---

## 1. Objective
기존 5종 장르 프리셋에 신규 SynthDef 파라미터 추가. mergeWithDefaults 로직이 optional SynthDef 처리하도록 확인.

## 2. Acceptance Criteria
- [ ] AC-1: 5종 장르 프리셋 하위 호환 유지 (AC-10.4)
- [ ] AC-2: 신규 SynthDef 파라미터 장르별 추가 (psytrance: acid_bass, layered_kick 등)
- [ ] AC-3: mergeWithDefaults가 optional SynthDef keys 처리

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `all 5 genre presets load` | Unit | loadPreset each | success |
| 2 | `psytrance has acid_bass params` | Unit | check synthParams | present |
| 3 | `mergeWithDefaults preserves optional` | Unit | merge with acid_bass | acid_bass kept |

### 3.2 Test File Location
- scripts/lib/genre-preset.test.ts

### 3.3 Mock/Setup Required
- 없음

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/presets/genres/*.json | Modify | 신규 SynthDef 파라미터 |
| scripts/lib/genre-preset.ts | Modify | mergeWithDefaults optional 처리 |

### 4.2 Implementation Steps (Green Phase)
1. 각 장르 JSON에 신규 파라미터 추가
2. mergeWithDefaults 로직 확인/수정
3. 전체 프리셋 로드 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E9 (기존 필드 없음 → optional 정상)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
