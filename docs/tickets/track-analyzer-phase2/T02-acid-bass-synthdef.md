# T2: acid_bass SynthDef + MoogFF/RLPFD 런타임 감지

**PRD Ref**: PRD-track-analyzer-phase2 > US-1
**Priority**: P1
**Size**: L
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
MoogFF 기반 303-style acid bass SynthDef 구현. accent(filter only, amp boost), slide(Lag.kr), distortion(.tanh). SC3-plugins RLPFD 런타임 감지 + 폴백.

## 2. Acceptance Criteria
- [ ] AC-1: acid_bass.scd 생성 — MoogFF LPF + filter envelope + accent + slide + distortion (AC-1.1)
- [ ] AC-2: 13개 파라미터 (AC-1.2). 범위 검증
- [ ] AC-3: SC3-plugins RLPFD 감지 → 자동 사용. 미설치 → MoogFF (AC-1.3)
- [ ] AC-4: accent=1: filter depth 2x, resonance +0.5, filter decay 2x, **dur 불변**, amp 30% boost (AC-1.4)
- [ ] AC-5: slide=1: Lag.kr(freq, slideTime) (AC-1.5)
- [ ] AC-6: NRT 호환. doneAction:2 (AC-1.6)
- [ ] AC-7: sclang 컴파일 성공

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `acid_bass params registered` | Unit | SYNTHDEF_PARAMS.acid_bass | 9 params |
| 2 | `acid_bass in SYNTH_STEM_MAP` | Unit | map lookup | stem:bass, bus:2 |
| 3 | `mapAcidBass generates valid params` | Unit | mapBassType('acid') | cutoff, resonance, envDepth... |
| 4 | `acid_bass accent does not change dur` | Unit | accent=0 vs 1 output | dur identical |
| 5 | `acid_bass accent boosts amp 30%` | Unit | accent=1 | amp * 1.3 |
| 6 | `acid_bass.scd compiles` | Integration | sclang load | exit 0 |
| 7 | `acid_bass NRT render produces WAV` | Integration | NRT render 1 bar | WAV > 0 bytes |
| 8 | `RLPFD fallback to MoogFF` | Integration | SC3-plugins absent | no error, WAV output |

### 3.2 Test File Location
- scripts/lib/track-analyzer.test.ts, audio/sc/test-synthdefs.scd

### 3.3 Mock/Setup Required
- sclang 실행 (실제 SC 필요)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/sc/synthdefs/acid_bass.scd | Create | MoogFF 303 SynthDef |
| scripts/lib/track-analyzer.ts | Modify | mapAcidBass 함수 추가 |
| scripts/lib/sc-plugins-detect.ts | Create | RLPFD 런타임 감지 유틸 |

### 4.2 Implementation Steps (Green Phase)
1. acid_bass.scd 작성 (MoogFF 버전)
2. sc-plugins-detect.ts: sclang -e "RLPFD" 실행 → boolean
3. track-analyzer.ts: mapAcidBass 매핑 함수
4. sclang 컴파일 + NRT 렌더 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E1 (SC3-plugins 미설치 → MoogFF 폴백), E8 (resonance > 4.0 clip)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
