# T4: layered_kick SynthDef (Nathan Ho 3-layer)

**PRD Ref**: PRD-track-analyzer-phase2 > US-5
**Priority**: P2
**Size**: M
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
3-layer 킥 (sub: SinOsc+multi-stage pitchEnv, body: Formant UGen, click: Impulse+BPF). DetectSilence(-60dB, 100ms). .tanh drive.

## 2. Acceptance Criteria
- [ ] AC-1: layered_kick.scd — 3-layer (AC-5.1)
- [ ] AC-2: 10개 파라미터 (AC-5.2)
- [ ] AC-3: Sub: SinOsc + 3-stage pitch env (AC-5.3)
- [ ] AC-4: Body: Formant UGen (AC-5.4)
- [ ] AC-5: Click: Impulse → BPF(6100Hz) (AC-5.5)
- [ ] AC-6: punch transient shaper (AC-5.6)
- [ ] AC-7: DetectSilence(0.001, 0.1, doneAction:2)
- [ ] AC-8: NRT 호환 (AC-5.8)
- [ ] AC-9: `.tanh` distortion stage — drive=0 vs drive=1 출력 차이 (AC-5.7)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `layered_kick params registered` | Unit | SYNTHDEF_PARAMS | 6 params |
| 2 | `layered_kick.scd compiles` | Integration | sclang load | exit 0 |
| 3 | `layered_kick NRT render` | Integration | NRT render | WAV > 0 bytes |
| 4 | `layered_kick NRT node frees` | Integration | DetectSilence | no hanging nodes |
| 5 | `layered_kick drive affects output` | Integration | drive=0 vs 1 | spectral difference |

### 3.2 Test File Location
- scripts/lib/track-analyzer.test.ts

### 3.3 Mock/Setup Required
- sclang

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/sc/synthdefs/layered_kick.scd | Create | 3-layer kick |
| scripts/lib/track-analyzer.ts | Modify | mapLayeredKick |

### 4.2 Implementation Steps (Green Phase)
1. layered_kick.scd 작성
2. mapLayeredKick 매핑
3. sclang + NRT 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- 없음

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
