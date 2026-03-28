# T8: sample_player SynthDef + sample_extract.py

**PRD Ref**: PRD-track-analyzer-phase2 > US-11
**Priority**: P1
**Size**: L
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
PlayBuf 샘플 재생기 (buf sentinel=-1) + demucs stem 히트 추출 파이프라인 (다중 특성 분류, per-type 순번, fade, MAX_HITS=32).

## 2. Acceptance Criteria
- [ ] AC-1: sample_player.scd — PlayBuf, buf=-1 sentinel, playing guard (AC-11.1)
- [ ] AC-2: 10개 파라미터 (AC-11.2)
- [ ] AC-3: 다중 특성 히트 분류 — low_energy/high_energy/flatness/unknown (AC-11.3)
- [ ] AC-4: per-type 순번 파일명 kick_001.wav (AC-11.3, AC-11.8)
- [ ] AC-5: 1ms fade-in/out (AC-11.3, E19)
- [ ] AC-6: MAX_HITS_PER_TYPE=32 (AC-11.3, E17)
- [ ] AC-7: manifest.json 단수형 키 (AC-11.8)
- [ ] AC-8: stem_type 우선 분류 (AC-11.3, E18)
- [ ] AC-9: NRT b_allocRead 상대 경로 (§4.3.1, E22)
- [ ] AC-10: Python __main__ 경로 검증 (§6)
- [ ] AC-11: demucs bass stem → bass 원샷 추출 (AC-11.4)
- [ ] AC-12: demucs other stem → FX 샘플 추출 (AC-11.5)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `sample_player params registered` | Unit | SYNTHDEF_PARAMS | 7 params |
| 2 | `sample_player buf=-1 silent` | Unit | buf sentinel | no crash, silent |
| 3 | `classify_hit kick low_energy` | Unit | 60Hz sine | 'kick' |
| 4 | `classify_hit hat high_energy` | Unit | 8kHz sine | 'hat' |
| 5 | `classify_hit snare flatness` | Unit | noise burst | 'snare' |
| 6 | `classify_hit bass stem override` | Unit | stem_type='bass' | always 'bass' |
| 7 | `per-type sequential naming` | Unit | 3 kicks | kick_001, kick_002, kick_003 |
| 8 | `MAX_HITS_PER_TYPE pruning` | Unit | 40 kicks | 32 in manifest |
| 9 | `manifest keys singular` | Unit | output | kick, snare, hat |
| 10 | `fade applied at boundaries` | Unit | segment edges | non-zero ramp |
| 11 | `sample_player.scd compiles` | Integration | sclang | exit 0 |
| 12 | `sample_player NRT with manifest` | Integration | 3kick+2snare | WAV, onset≥3 |
| 13 | `empty drum stem` | Edge | 0 onsets | empty manifest |

### 3.2 Test File Location
- scripts/lib/sample-utils.test.ts (신규), audio/analyzer/test_sample_extract.py (신규)

### 3.3 Mock/Setup Required
- sclang + librosa test fixtures

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/sc/synthdefs/sample_player.scd | Create | PlayBuf, buf sentinel |
| audio/analyzer/sample_extract.py | Create | classify_hit + extract_hits |
| scripts/lib/sample-utils.ts | Create | generateSampleBufferCommands |
| audio/analyzer/test_sample_extract.py | Create | Python unit tests |

### 4.2 Implementation Steps (Green Phase)
1. sample_player.scd (buf=-1 sentinel)
2. sample_extract.py (classify_hit, extract_hits, per-type naming, fade, MAX_HITS)
3. sample-utils.ts (generateSampleBufferCommands, relative paths). **parseStemGroupRef는 T13 범위 — 여기서 구현 금지**
4. Python unit tests + TS unit tests
5. NRT 통합 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E13 (buf sentinel), E14 (빈 스템), E17 (수백 개), E18 (bass stem 오분류), E19 (클릭 아티팩트), E22 (절대 경로)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
