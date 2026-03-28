# T5: squelch SynthDef (MoogFF self-oscillation)

**PRD Ref**: PRD-track-analyzer-phase2 > US-6
**Priority**: P2
**Size**: S
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
Resonant filter sweep SynthDef. MoogFF self-oscillation (gain→4). LFO 모듈레이션. SC3-plugins DFM1 업그레이드 옵션.

## 2. Acceptance Criteria
- [ ] AC-1: squelch.scd — resonant filter sweep (AC-6.1)
- [ ] AC-2: 11개 파라미터 + lfoRate/lfoDepth (AC-6.2)
- [ ] AC-3: EnvGen sweep (AC-6.3)
- [ ] AC-4: self-oscillation at high resonance (AC-6.4)
- [ ] AC-5: NRT 호환 (AC-6.5)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `squelch params registered` | Unit | SYNTHDEF_PARAMS | 7 params |
| 2 | `squelch.scd compiles` | Integration | sclang | exit 0 |
| 3 | `squelch NRT render` | Integration | NRT render | WAV > 0 bytes |
| 4 | `squelch high resonance self-osc` | Integration | resonance=0.95 NRT | spectral peak present |

### 3.2 Test File Location
- scripts/lib/track-analyzer.test.ts

### 3.3 Mock/Setup Required
- sclang

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/sc/synthdefs/squelch.scd | Create | resonant filter sweep |
| scripts/lib/track-analyzer.ts | Modify | mapSquelch |

### 4.2 Implementation Steps (Green Phase)
1. squelch.scd 작성 (MoogFF)
2. mapSquelch 매핑
3. sclang + NRT 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E8 (resonance clip)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
