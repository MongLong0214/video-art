# T9: pitch contour 추출 (3-tier fallback)

**PRD Ref**: PRD-track-analyzer-phase2 > US-7, US-12
**Priority**: P1
**Size**: M
**Status**: Todo
**Depends On**: None

---

## 1. Objective
torchcrepe→PESTO→pyin 3단 폴백 피치 추적. 프레임 연속성 기반 slide 감지. note events 변환.

## 2. Acceptance Criteria
- [ ] AC-1: 3단 폴백 체인 (AC-12.1). 전부 미설치 시 skip+warning
- [ ] AC-2: torchcrepe: Viterbi, 5ms hop, fmin=30, fmax=1000, model='full' (AC-12.2)
- [ ] AC-3: PESTO: 120KB, 12x realtime (AC-12.3)
- [ ] AC-4: pyin: fmin=30, fmax=1047 (AC-12.4)
- [ ] AC-5: tracker_used 필드 (AC-12.5)
- [ ] AC-6: 프레임 연속성 slide 감지 (AC-7.4, AC-12.6)
- [ ] AC-7: pitch→note events [{time, freq, duration, velocity, slide}] (AC-7.3)
- [ ] AC-8: analysis.json에 pitch_contour 필드 (AC-7.6)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `pyin fallback when no torch` | Unit | mock imports | tracker_used='pyin' |
| 2 | `slide=True for gradual pitch` | Unit | [110,112,115,119,123] | slide=True |
| 3 | `slide=False for instant jump` | Unit | [110,110,220] | slide=False |
| 4 | `note_threshold 1.5 semitones` | Unit | 1.4 st change | no new note |
| 5 | `unvoiced frames skipped` | Unit | conf < 0.5 | no note |
| 6 | `analysis.json has pitch_contour` | Integration | analyze fixture | field present |
| 7 | `all trackers absent → skip` | Edge | mock all fail | pitch_contour=null |

### 3.2 Test File Location
- audio/analyzer/test_pitch.py (신규), scripts/lib/track-analyzer.test.ts

### 3.3 Mock/Setup Required
- torchcrepe/pesto import mocking

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/analyzer/analyze_track.py | Modify | extract_pitch_contour + pitch_to_note_events |
| audio/analyzer/test_pitch.py | Create | Python pitch tests |
| audio/analyzer/requirements.txt | Modify | torchcrepe, pesto-pitch (optional) |

### 4.2 Implementation Steps (Green Phase)
1. extract_pitch_contour (3단 폴백)
2. pitch_to_note_events (프레임 연속성 slide)
3. analyze_track.py에 통합
4. Python unit tests

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E2 (전부 미설치), E5 (bass stem 부재), E10 (unvoiced 과다), E20 (MPS 호환)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
