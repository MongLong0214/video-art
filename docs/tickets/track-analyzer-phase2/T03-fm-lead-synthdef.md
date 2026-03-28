# T3: fm_lead SynthDef

**PRD Ref**: PRD-track-analyzer-phase2 > US-2
**Priority**: P2
**Size**: S
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
2-operator FM lead SynthDef 구현. modulation index envelope, vibrato, .tanh drive. Core SC only.

## 2. Acceptance Criteria
- [ ] AC-1: fm_lead.scd 생성 — 2-op FM (AC-2.1)
- [ ] AC-2: 10개 파라미터 (AC-2.2)
- [ ] AC-3: mod index envelope [index, index*iScale, index] (AC-2.3)
- [ ] AC-4: vibrato = SinOsc.kr(5) * vibrato * freq * 0.02 (AC-2.4)
- [ ] AC-5: .tanh soft clipping (AC-2.5)
- [ ] AC-6: NRT 호환. Core SC only (AC-2.6)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fm_lead params registered` | Unit | SYNTHDEF_PARAMS.fm_lead | 6 params |
| 2 | `fm_lead in SYNTH_STEM_MAP` | Unit | map lookup | stem:synth, bus:4 |
| 3 | `fm_lead.scd compiles` | Integration | sclang load | exit 0 |
| 4 | `fm_lead NRT render` | Integration | NRT render | WAV > 0 bytes |

### 3.2 Test File Location
- scripts/lib/track-analyzer.test.ts

### 3.3 Mock/Setup Required
- sclang

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/sc/synthdefs/fm_lead.scd | Create | 2-op FM SynthDef |
| scripts/lib/track-analyzer.ts | Modify | mapFmLead 함수 |

### 4.2 Implementation Steps (Green Phase)
1. fm_lead.scd 작성
2. mapFmLead 매핑 함수
3. sclang 컴파일 + NRT 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- 없음 (core SC만 사용)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
