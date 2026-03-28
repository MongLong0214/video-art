# T11: 캘리브레이션 프레임워크 (5-metric composite score)

**PRD Ref**: PRD-track-analyzer-phase2 > US-9
**Priority**: P2
**Size**: M
**Status**: Todo
**Depends On**: None

---

## 1. Objective
calibrate.py (LUFS pyloudnorm + 5-metric composite + bipartite onset F1) + calibrate.ts CLI. dual-score + per-stem.

## 2. Acceptance Criteria
- [ ] AC-1: npm run calibrate CLI (AC-9.1). validateFilePath 양쪽
- [ ] AC-2: 무음 guard (AC-9.1a)
- [ ] AC-3: 5-metric 복합 스코어 (AC-9.2). LUFS 정규화
- [ ] AC-4: onset F1 bipartite matching (중복 방지)
- [ ] AC-5: 결과 JSON dual-score (AC-9.3)
- [ ] AC-6: per-stem 비교 (AC-9.5)
- [ ] AC-7: hybrid ≥75 Production Ready (AC-9.6)
- [ ] AC-8: benchmark-tracks.json 스키마 정의 (AC-9.7)
- [ ] AC-9: Python __main__ 경로 검증

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `identical files score ~100` | Integration | same WAV | total ≥ 95 |
| 2 | `unrelated files score < 50` | Integration | different genre | total < 50 |
| 3 | `silence input returns 0` | Edge | empty WAV | score=0, warning |
| 4 | `LUFS normalization applied` | Unit | check loudness | -14 LUFS |
| 5 | `onset F1 no double counting` | Unit | [1.0,1.04] vs [1.02] | recall=50% |
| 6 | `per-stem breakdown present` | Unit | with stems | drums/bass keys |
| 7 | `calibration JSON schema valid` | Unit | output | all required fields |
| 8 | `output has mode and lufs_normalized` | Unit | JSON check | both fields present |
| 9 | `benchmark-tracks.json schema loads` | Unit | JSON load | valid schema |

### 3.2 Test File Location
- audio/analyzer/test_calibrate.py (신규), scripts/lib/calibrate.test.ts (신규)

### 3.3 Mock/Setup Required
- test WAV fixtures

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/analyzer/calibrate.py | Create | composite_similarity + LUFS |
| scripts/calibrate.ts | Create | CLI wrapper |
| audio/analyzer/requirements.txt | Modify | + pyloudnorm |
| package.json | Modify | + calibrate script |

### 4.2 Implementation Steps (Green Phase)
1. calibrate.py (LUFS + 5 metrics + bipartite)
2. calibrate.ts CLI
3. package.json script
4. 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E6 (길이 불일치), E12 (무음 입력)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
