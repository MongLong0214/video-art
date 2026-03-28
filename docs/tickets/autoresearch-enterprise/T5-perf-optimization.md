# T5: Research 전용 성능 최적화 (scene.json 패치 + archive 정리)

**PRD Ref**: PRD-autoresearch-enterprise > US-3
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T4 (pipeline-runner 버그 수정 선행)

---

## 1. Objective
pipeline-runner에 research용 성능 최적화를 추가한다: scene.json 임시 패치(해상도/duration 제한), archive 자동 정리, SIGINT 시 원본 복원.

## 2. Acceptance Criteria
- [ ] AC-1: Given scene.json resolution [1920, 1920], When pipeline-runner export, Then 임시로 [1080, 1080]으로 패치 → export → finally에서 원본 복원
- [ ] AC-2: Given scene.json duration 20, When pipeline-runner export, Then 임시로 10으로 패치 → export → 복원
- [ ] AC-3: export-layered.ts의 FPS가 이미 30임을 확인. 추가 변경 불필요. 단, 향후 production export가 60fps로 변경될 경우를 대비해 `RESEARCH_FPS` 환경변수는 유지 (default=30)
- [ ] AC-4: Given pipeline-runner 실행, When export 완료, Then ffmpeg preset `fast` 적용 (export-layered.ts에 `RESEARCH_PRESET` 환경변수 지원)
- [ ] AC-5: Given `out/layered/*_research*` 존재, When 새 pipeline-runner 실행, Then 이전 archive 삭제 후 진행
- [ ] AC-6: Given scene.json 패치 중 SIGINT 수신, When process 종료, Then scene.json 원본 복원. patchSceneJson 복원은 pipeline-runner 내부 try/finally + process.on('exit') handler에서 자체 처리. run-once.ts에 노출 불필요
- [ ] AC-7: Given 1080px/30fps/10s, When E2E 1회 실행, Then 소요 시간 ≤ 180s
- [ ] AC-8: scene.json 패치/복원 테스트 (fs mock 기반)
- [ ] AC-9: archive 정리 테스트

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `patchSceneJson reduces resolution to 1080` | Unit | 1920→1080 패치 | patched scene |
| 2 | `patchSceneJson reduces duration to 10` | Unit | 20→10 패치 | patched scene |
| 3 | `patchSceneJson preserves original under 1080` | Unit | 720 유지 | no change |
| 4 | `restoreSceneJson restores original` | Unit | 패치 후 복원 | original content |
| 5 | `cleanPreviousArchive removes _research dirs` | Unit | fs mock | rmSync 호출 |
| 6 | `runFullPipeline sets RESEARCH_FPS env` | Unit | env 전달 확인 | "30" |
| 7 | `runFullPipeline sets RESEARCH_PRESET env` | Unit | env 전달 확인 | "fast" |
| 8 | `scene.json is restored after export failure` | Unit | export throw 후 확인 | 원본 복원 |

### 3.2 Test File Location
- `scripts/research/pipeline-runner.test.ts` (T4에서 생성한 파일에 추가)

### 3.3 Mock/Setup Required
- `vi.mock("fs")` — readFileSync, writeFileSync, existsSync, readdirSync, rmSync
- `vi.mock("child_process")` — execFileSync (env 전달 확인)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/research/pipeline-runner.ts | Modify | scene.json 패치/복원 + archive 정리 + env 전달 |
| scripts/export-layered.ts | Modify | `RESEARCH_FPS`, `RESEARCH_PRESET` 환경변수 지원 추가 |
| scripts/research/pipeline-runner.test.ts | Modify | 8개 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. pipeline-runner.ts에 `patchSceneJson()` / `restoreSceneJson()` 함수 추가
   - 원본을 메모리에 백업, 패치된 버전으로 writeFileSync
   - finally 블록에서 반드시 restoreSceneJson 호출
   - process.on('exit') 핸들러에서도 복원 보장
2. pipeline-runner.ts에 `cleanPreviousArchive()` 추가 (내부 함수, export하지 않음) — `out/layered/*_research*` + `.cache/research/current/` 삭제. `runFullPipeline()` 시작 시 자동 호출
3. export-layered.ts: FPS는 이미 30. `const FPS = Number(process.env.RESEARCH_FPS) || 30;` 형태로 환경변수 오버라이드만 추가 (기본값 30 유지)
4. export-layered.ts: `const PRESET = process.env.RESEARCH_PRESET || "slow";` 추가, ffmpeg args에 적용
5. pipeline-runner.ts `runExportLayered()`: env에 `RESEARCH_FPS=30`, `RESEARCH_PRESET=fast` 전달
6. 테스트 작성 후 Green 확인
7. E2E 실행으로 ≤180s 확인

### 4.3 Refactor Phase
- patchSceneJson/restoreSceneJson을 별도 유틸로 분리 검토

## 5. Edge Cases
- E7: 디스크 공간 — 1080px로 프레임 크기 축소
- E12: scene.json 패치 중 crash — finally + exit handler + git checkout fallback

## 6. Review Checklist
- [ ] Red: 8개 테스트 FAILED
- [ ] Green: 8개 테스트 PASSED
- [ ] Refactor: 전체 PASSED 유지
- [ ] scene.json 복원 보장 (finally + exit handler)
- [ ] E2E ≤ 180s
