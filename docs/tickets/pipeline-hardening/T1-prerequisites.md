# T1: Prerequisites — Test Baseline Capture

**PRD Ref**: PRD-pipeline-hardening > US-7 (AC-7.1, AC-7.2 partial)
**Priority**: P1 (High)
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective
테스트 baseline 스냅샷을 생성하여 이후 티켓의 regression gate 기준을 확립한다. pipeline-layers.ts의 TS 에러는 이미 수정된 상태이므로 baseline capture에 집중한다.

## 2. Acceptance Criteria
- [ ] AC-1: `mkdir -p .cache && vitest run --reporter=json > .cache/test-baseline.json` 실행하여 baseline 아티팩트 저장
- [ ] AC-2: `.gitignore`에 `.cache/test-baseline.json` 추가
- [ ] AC-3: baseline 파일에 `numTotalTests`, `testResults` 필드 포함 확인
- [ ] AC-4: 이후 각 티켓 완료 시 `vitest run --reporter=json`과 baseline 대조 — baseline에 없는 새 실패 = 0 (cross-cutting regression gate)

## 3. TDD Spec (Red Phase)

> T1은 baseline 캡처이므로 신규 테스트 없음. 이후 티켓의 regression gate 기준 제공.

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | (baseline) vitest run | Smoke | 기존 테스트 실행 상태 캡처 | JSON 파일 생성 |

### 3.2 Test File Location
N/A

### 3.3 Mock/Setup Required
없음

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.gitignore` | Modify | `.cache/test-baseline.json` 추가 |

### 4.2 Implementation Steps
1. `mkdir -p .cache`
2. `npx vitest run --reporter=json > .cache/test-baseline.json 2>&1 || true`
3. `.gitignore`에 `.cache/test-baseline.json` 추가
4. baseline 파일 내용 확인 (failing test 목록 기록됨)

### 4.3 Refactor Phase
없음

## 5. Edge Cases
없음

## 6. Review Checklist
- [ ] `.cache/test-baseline.json` 생성 확인
- [ ] `.gitignore` 업데이트 확인
