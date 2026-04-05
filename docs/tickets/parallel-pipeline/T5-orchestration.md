# T5: publish.ts + pipeline.ts — _work/ 오케스트레이션

**PRD Ref**: PRD-parallel-pipeline > US-1
**Priority**: P0 (Blocker)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T3, T4

---

## 1. Objective
`publish.ts`와 `pipeline.ts`가 run-id 기반 `_work/` 디렉토리를 자동으로 생성하고, 하위 스크립트에 `--work-dir`를 전달하며, 성공 시 `_work/`를 자동 정리한다.

## 2. Acceptance Criteria
- [ ] AC-1: `publish.ts` 실행 시 archive 디렉토리 내 `_work/` 자동 생성
- [ ] AC-2: `pipeline-pro.ts`와 `export-layered.ts`에 `--work-dir` 인자가 전달됨
- [ ] AC-3: 성공 완료 시 `_work/` 자동 삭제
- [ ] AC-4: 실패 시 `_work/` 잔존 + 경고 메시지 출력
- [ ] AC-5: `pipeline.ts`에서도 `--work-dir` 전달 지원

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `publish creates _work dir in archive` | Unit | publish 시작 시 | _work/ 생성됨 |
| 2 | `publish passes --work-dir to pipeline-pro` | Unit | run 호출 인자 확인 | --work-dir 포함 |
| 3 | `publish passes --work-dir to export-layered` | Unit | run 호출 인자 확인 | --work-dir 포함 |
| 4 | `publish cleans _work on success` | Unit | 정상 완료 후 | _work/ 없음 |
| 5 | `publish keeps _work on failure` | Unit | 에러 발생 시 | _work/ 존재 + 경고 로그 |
| 6 | `pipeline.ts forwards --work-dir` | Unit | --work-dir 전달 | 하위 스크립트에 전파 |

### 3.2 Test File Location
- `scripts/__tests__/publish-workdir.test.ts`

### 3.3 Mock/Setup Required
- `child_process.execFileSync` — vi.mock (하위 스크립트 시뮬레이션)
- `fs` — 실제 tmpdir 사용
- `createWorkDir/cleanupWorkDir` — T1 구현 사용

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/publish.ts` | Modify | _work/ 생성 → --work-dir 전달 → 정리 |
| `scripts/pipeline.ts` | Modify | --work-dir 파싱 + 하위 전달 |

### 4.2 Implementation Steps (Green Phase)
1. `publish.ts`: archive 디렉토리 먼저 생성 → `createWorkDir(archiveDir)` 호출
2. `pipeline-pro.ts` 실행 인자에 `--work-dir ${workDir}` 추가
3. `export-layered.ts` 실행 인자에 `--work-dir ${workDir}` 추가
4. try/finally에서 성공 시 `cleanupWorkDir(archiveDir)`, 실패 시 경고
5. `pipeline.ts`: `--work-dir` argv에서 파싱 → 하위 스크립트에 전달

### 4.3 Refactor Phase
- publish.ts의 Step 1-5 순서를 함수로 추출하여 가독성 향상

## 5. Edge Cases
- EC-1 (E2): Ctrl+C 시 _work/ 잔존 — SIGINT 핸들러에서 경고 메시지
- EC-2 (E6): 동일 title 동시 실행 — archive 디렉토리에 run-id 포함하여 충돌 방지
- EC-3 (E3): 디스크 부족 — createWorkDir 실패 시 명확한 에러

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 `npm run pipeline input.png` 동작 유지
