# T18: E2E: hybrid render → mastering → calibration

**PRD Ref**: PRD-track-analyzer-phase2-completion > ALL
**Priority**: P1
**Size**: M
**Status**: Todo
**Depends On**: T16, T17

---

## 1. Objective
전체 파이프라인 통합 검증: hybrid render → mastering → dual-score calibration.

## 2. Acceptance Criteria
- [ ] AC-1: hybrid render → mastered WAV 존재 + size > 0
- [ ] AC-2: calibration dual-score JSON 생성 (synthesis_only + hybrid)
- [ ] AC-3: hybrid_score > synthesis_only_score (샘플 효과 검증)
- [ ] AC-4: mastered hybrid_score >= hybrid_score (마스터링 효과 검증, non-regression)
- [ ] AC-5: 전체 TS 테스트 regression 0
- [ ] AC-6: 전체 Python 테스트 PASS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `hybrid render produces WAV` | E2E | --hybrid mode | WAV > 0 bytes |
| 2 | `mastering produces output` | E2E | master.py on render | mastered WAV exists |
| 3 | `dual-score JSON generated` | E2E | calibrate after mastering | JSON with both scores |
| 4 | `hybrid > synthesis score` | E2E | compare scores | hybrid > synthesis |
| 5 | `mastered >= unmastered` | E2E | compare scores | mastered >= hybrid |
| 6 | `no test regression` | Regression | full suite | baseline+ PASS |

### 3.2 Test File Location
- scripts/lib/pipeline-completion-e2e.test.ts (신규)

### 3.3 Mock/Setup Required
- 실제 analysis directory with manifest + samples (or generated fixtures)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/lib/pipeline-completion-e2e.test.ts | Create | E2E integration tests |
| docs/tickets/track-analyzer-phase2/STATUS.md | Modify | final status update |

### 4.2 Implementation Steps
1. E2E test 작성
2. Full pipeline 실행 검증
3. STATUS.md 최종 업데이트

## 5. Edge Cases
- ALL (E1-E7 통합 검증)

## 6. Review Checklist
- [ ] E2E tests PASS
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
