# T10: Score 75+ Hard Gate 달성

**Size**: S | **Depends**: T8, T9 | **PRD**: v0.2

## Goal
T8 (onset fix) + T9 (envelope) 합산 후 total_score ≥ 75 검증.
미달 시 추가 튜닝: 이벤트 밀도, amp 레벨, sidechain depth 조정.

## Tuning Levers (if needed)
1. kick amp 증가 (더 많은 onset detection)
2. sidechain depth 조정 (envelope shape 영향)
3. pad/supersaw amp 조정 (envelope RMS 영향)
4. bass drone 주파수/amp 조정

## TDD Spec
- [ ] TC-10.1: calibrate total_score ≥ 75 (hard gate)
- [ ] TC-10.2: attacks ≥ 30
- [ ] TC-10.3: envelope ≥ 40
- [ ] TC-10.4: mfcc ≥ 85 (regression guard)
- [ ] TC-10.5: spectral ≥ 90 (regression guard)
- [ ] TC-10.6: 처리 시간 < 30초

## AC
- [ ] AC-10.1: E2E void-acid-carousel total_score ≥ 75
- [ ] AC-10.2: 전체 TS 테스트 regression 없음
