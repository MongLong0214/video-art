# T1: 병렬 파이프라인 인프라 유틸리티

**PRD Ref**: PRD-parallel-pipeline > US-1
**Priority**: P0 (Blocker)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
병렬 파이프라인의 기반이 되는 포트 할당, run-id 생성 유틸리티를 `scripts/lib/work-dir.ts`에 구현하고, `archive.ts`의 `generateRunId()`를 crypto 기반으로 교체하며 `createArchiveDir()`에 run-id suffix를 추가한다.

## 2. Acceptance Criteria
- [ ] AC-1: `findAvailablePort()`가 5300-5399 범위에서 사용 가능한 포트를 반환한다
- [ ] AC-2: 포트가 모두 사용 중이면 5회 재시도 후 에러를 던진다
- [ ] AC-3: `archive.ts`의 `generateRunId()`가 `crypto.randomUUID()` 기반 8자리 hex를 반환한다
- [ ] AC-4: `createWorkDir(archiveDir)`가 `{archiveDir}/_work/layers/` 구조를 생성한다
- [ ] AC-5: `cleanupWorkDir(archiveDir)`가 `_work/` 디렉토리를 삭제한다
- [ ] AC-6: archive 디렉토리명에 run-id가 포함된다 (`{date}_{title}-{run-id}/`) [PRD AC-1.5]
- [ ] AC-7: 동일 title로 동시 2개 `createRunContext()` 호출 시 서로 다른 디렉토리 생성

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `findAvailablePort returns port in range` | Unit | 반환 포트가 5300-5399 범위 | 범위 내 숫자 |
| 2 | `findAvailablePort retries on occupied port` | Unit | 점유된 포트 건너뜀 | 다른 포트 반환 |
| 3 | `findAvailablePort throws after max retries` | Unit | 모두 점유 시 | Error throw |
| 4 | `generateRunId returns 8-char string` | Unit | 길이 + 형식 확인 | /^[0-9a-f]{8}$/ |
| 5 | `generateRunId is unique across calls` | Unit | 100회 호출 | 모두 다른 값 |
| 6 | `createWorkDir creates directory structure` | Unit | 디렉토리 생성 확인 | scene.json 위치 + layers/ 존재 |
| 7 | `cleanupWorkDir removes _work directory` | Unit | 삭제 확인 | _work/ 없음 |
| 8 | `cleanupWorkDir is no-op if _work missing` | Unit | 없는 디렉토리 삭제 시도 | 에러 없음 |

### 3.2 Test File Location
- `scripts/lib/__tests__/work-dir.test.ts`

### 3.3 Mock/Setup Required
- `net.createServer` — 포트 점유 시뮬레이션용 vi.mock 또는 실제 서버 바인드
- `fs.mkdirSync/rmSync` — 실제 tmpdir 사용 (no mock)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/work-dir.ts` | Create | findAvailablePort, createWorkDir, cleanupWorkDir |
| `scripts/lib/archive.ts` | Modify | generateRunId → crypto 기반, createArchiveDir에 run-id suffix |
| `scripts/lib/__tests__/work-dir.test.ts` | Create | 유닛 테스트 10개 |

### 4.2 Implementation Steps (Green Phase)
1. `generateRunId()` — `crypto.randomUUID().substring(0, 8)`
2. `findAvailablePort()` — `net.createServer` 바인드 테스트, 5회 재시도
3. `createWorkDir(archiveDir)` — `fs.mkdirSync` recursive
4. `cleanupWorkDir(archiveDir)` — `fs.rmSync` recursive, force

### 4.3 Refactor Phase
- 포트 범위를 상수로 추출 (PORT_MIN, PORT_MAX, MAX_RETRIES)

## 5. Edge Cases
- EC-1 (E1): 모든 포트 점유 시 명확한 에러 메시지
- EC-2 (E7): cleanupWorkDir 호출 시 _work/ 없으면 무시

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
