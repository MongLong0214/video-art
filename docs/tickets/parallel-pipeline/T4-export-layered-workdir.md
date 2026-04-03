# T4: export-layered.ts — --work-dir + 동적 포트 + graceful shutdown

**PRD Ref**: PRD-parallel-pipeline > US-1
**Priority**: P0 (Blocker)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T1, T2

---

## 1. Objective
`export-layered.ts`가 `--work-dir`에서 scene.json을 읽고, Vite를 동적 포트 + `VITE_PUBLIC_DIR` 환경변수로 기동하며, 캡처 완료 후 Vite를 gracefully shutdown한다.

## 2. Acceptance Criteria
- [ ] AC-1: `--work-dir /tmp/test` 지정 시 `/tmp/test/scene.json`에서 config를 읽는다
- [ ] AC-2: Vite가 `VITE_PUBLIC_DIR=<work-dir>` 환경변수와 함께 시작된다
- [ ] AC-3: Vite 포트가 `findAvailablePort()`로 동적 할당된다 (5300-5399)
- [ ] AC-4: 캡처 완료 후 Vite 프로세스에 SIGTERM → 2초 대기 → SIGKILL 순으로 종료
- [ ] AC-5: `--work-dir` 미지정 시 기존대로 `public/scene.json` + port 5299 사용

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `reads scene.json from work-dir` | Unit | workDir 경로 전달 | workDir/scene.json 파싱 |
| 2 | `reads scene.json from public when no work-dir` | Unit | workDir 없음 | public/scene.json 파싱 |
| 3 | `starts vite with VITE_PUBLIC_DIR env` | Unit | startViteServer 호출 | execFile env에 VITE_PUBLIC_DIR 포함 |
| 4 | `uses dynamic port from findAvailablePort` | Unit | workDir 모드 | port ≠ 5299, 5300-5399 범위 |
| 5 | `uses port 5299 when no work-dir` | Unit | 기본 모드 | port = 5299 |
| 6 | `graceful shutdown sends SIGTERM then SIGKILL` | Unit | killVite 호출 | SIGTERM → 타임아웃 → SIGKILL 순서 |

### 3.2 Test File Location
- `scripts/__tests__/export-layered-workdir.test.ts`

### 3.3 Mock/Setup Required
- `child_process.execFile` — vi.mock (Vite 프로세스 시뮬레이션)
- `findAvailablePort` — vi.mock (고정 포트 반환)
- `fs.readFileSync` — scene.json mock 데이터

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/export-layered.ts` | Modify | scene.json 경로 동적화, Vite env 전달, 포트 동적화, graceful shutdown |

### 4.2 Implementation Steps (Green Phase)
1. `--work-dir` CLI 파싱 (기존 argv 파싱에 추가)
2. `scenePath` 분기: `workDir ? path.join(workDir, "scene.json") : path.join(projectRoot, "public", "scene.json")`
3. `startViteServer` 수정: `env: { ...process.env, VITE_PUBLIC_DIR: workDir }` 추가
4. 포트 분기: `workDir ? await findAvailablePort() : 5299`
5. `killVite` 수정: SIGTERM → `setTimeout(SIGKILL, 2000)` + `process.on('exit')` 대기

### 4.3 Refactor Phase
- `startViteServer` 시그니처에 `options: { port, env }` 객체 패턴 적용

## 5. Edge Cases
- EC-1 (E1): 포트 할당 실패 → findAvailablePort가 에러 던짐 → captureFrames에서 catch + 정리
- EC-2 (E8): Vite가 SIGTERM에 응답하지 않음 → 2초 후 SIGKILL
- EC-3 (E4): --work-dir 없이 실행 → 기존 동작 100% 유지

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 `npm run export:layered -- --title test` 동작 유지
