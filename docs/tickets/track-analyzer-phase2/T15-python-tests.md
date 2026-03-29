# T15: Python 단위 테스트 (calibrate + sample_extract + master)

**PRD Ref**: PRD-track-analyzer-phase2-completion > US-3
**Priority**: P1
**Size**: M
**Status**: Todo
**Depends On**: None

---

## 1. Objective
calibrate.py, sample_extract.py, master.py(T17 이후)의 핵심 함수에 pytest 단위 테스트 작성. CI 강제 게이트.

## 2. Acceptance Criteria
- [ ] AC-1: test_calibrate.py — composite_similarity, dual_score, per_stem_scores (AC-3.1)
- [ ] AC-2: 동일 파일 score >= 95 (AC-3.2)
- [ ] AC-3: 무관 파일 score < 50 (AC-3.3)
- [ ] AC-4: 무음 입력 → score=0 + warning (AC-3.4)
- [ ] AC-5: onset F1 bipartite 중복 방지 (AC-3.5)
- [ ] AC-6: test_sample_extract.py — classify_hit, fade, MAX_HITS (AC-3.6)
- [ ] AC-7: pytest 전체 PASS. pytest 미설치 시 error exit (AC-3.7)
- [ ] AC-8: requirements.txt에 pytest + scipy 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_identical_score_high` | Unit | 동일 WAV pair | score >= 95 |
| 2 | `test_unrelated_score_low` | Unit | 무관 WAV pair (sine vs noise) | score < 50 |
| 3 | `test_silence_returns_zero` | Unit | 무음 WAV | score=0 + warning key |
| 4 | `test_onset_f1_no_double_count` | Unit | [1.0, 1.04] vs [1.02] | recall=50% |
| 5 | `test_dual_score_keys` | Unit | dual_score output | synthesis_only_score, mode keys |
| 6 | `test_classify_kick` | Unit | 60Hz sine segment | 'kick' |
| 7 | `test_classify_hat` | Unit | 8kHz sine segment | 'hat' |
| 8 | `test_classify_bass_override` | Unit | stem_type='bass' | always 'bass' |
| 9 | `test_fade_applied` | Unit | segment edges | non-zero ramp |
| 10 | `test_max_hits_pruning` | Unit | 40 kicks | 32 in manifest |

### 3.2 Test File Location
- audio/analyzer/test_calibrate.py
- audio/analyzer/test_sample_extract.py

### 3.3 Mock/Setup Required
- Test WAV fixtures: generate programmatically with numpy (sine, noise, silence)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/analyzer/test_calibrate.py | Create | calibrate 테스트 |
| audio/analyzer/test_sample_extract.py | Create | sample_extract 테스트 |
| audio/analyzer/requirements.txt | Modify | + pytest, scipy |
| package.json | Modify | + test:python script |

### 4.2 Implementation Steps (Green Phase)
1. requirements.txt에 pytest, scipy 추가
2. test fixtures: numpy로 sine/noise/silence WAV 생성 (conftest.py)
3. test_calibrate.py 작성
4. test_sample_extract.py 작성
5. package.json에 `"test:python": "cd audio/analyzer && python -m pytest -v"` 추가
6. pytest 실행 → PASS 확인

## 5. Edge Cases
- E5 (pytest 미설치 → error exit)

## 6. Review Checklist
- [ ] Red: pytest 실행 → FAILED 확인됨
- [ ] Green: pytest 실행 → PASSED 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
