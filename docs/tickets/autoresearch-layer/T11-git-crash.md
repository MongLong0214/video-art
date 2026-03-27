# T11: Git Automation + Crash Recovery

**PRD Ref**: PRD-autoresearch-layer > US-3, AC-3.3/3.7/3.8/3.10
**Priority**: P1
**Size**: M
**Status**: Todo
**Depends On**: T10

---

## 1. Objective

autoresearch/{tag} 브랜치 자동 생성, SIGINT graceful shutdown, 5회 연속 crash 자동 중단, non-zero exit code 구현.

## 2. Acceptance Criteria

- [ ] AC-1: `--tag <name>` 으로 `autoresearch/{tag}` 브랜치 생성 (없으면 자동)
- [ ] AC-2: 브랜치 이미 존재 시 체크아웃만 (재사용)
- [ ] AC-3: SIGINT → 현재 실험 discard + config restore + results.tsv 기록 + exit 0
- [ ] AC-4: 5회 연속 crash → 자동 중단 + 마지막 5 에러 요약 출력 + non-zero exit
- [ ] AC-5: crash 후 정상 실험 → 연속 crash 카운터 리셋
- [ ] AC-6: git working tree dirty 체크 → abort 또는 stash 제안
- [ ] AC-7: `--budget N` 최대 실험 횟수 제한 (default: unlimited)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `createBranch new` | Unit | 존재하지 않는 tag → git branch | 브랜치 생성 |
| 2 | `createBranch existing` | Unit | 이미 존재 → checkout | 체크아웃만 |
| 3 | `sigintHandler` | Unit | SIGINT 시뮬레이션 → restore + log | clean exit |
| 4 | `crashCounter increment` | Unit | crash 발생 → counter++ | 1→2→3... |
| 5 | `crashCounter reset` | Unit | crash 후 성공 → counter | 0 |
| 6 | `crashCounter 5 stop` | Unit | 5연속 crash → stop flag | true |
| 7 | `dirtyCheck clean` | Unit | git status → clean | proceed |
| 8 | `dirtyCheck dirty` | Unit | git status → dirty | abort message |
| 9 | `budgetCheck` | Unit | exp#100, budget=100 → stop | true |

### 3.2 Test File Location
- `scripts/research/git-automation.test.ts`

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/git-automation.ts` | Create | branch, dirty check, SIGINT, crash counter |
| `scripts/research/run-once.ts` | Modify | git-automation 통합 |

### 4.2 Implementation Steps (Green Phase)
1. `ensureBranch(tag)` — `git checkout -b autoresearch/{tag}` or `git checkout`
2. `checkDirty()` — `git status --porcelain` parse
3. `CrashCounter` class — increment, reset, shouldStop
4. `registerSigintHandler(restoreFn)` — process.on('SIGINT', ...)
5. `BudgetTracker` — --budget N 옵션 파싱 + 카운트
6. run-once.ts에 통합: startup checks → experiment → cleanup
