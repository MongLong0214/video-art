# T7: E2E Calibration 안정성 + Edge Case 에러 핸들링

**PRD Ref**: PRD-autoresearch-enterprise > US-5, US-6
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T3, T4, T5

---

## 1. Objective
calibration 3회 안정적 완료를 검증하고, 외부 의존성 실패 시 명확한 에러 가이드를 출력한다.

## 2. Acceptance Criteria

### E2E Calibration (US-5)
- [ ] AC-1: Given reference + input.png 준비 완료, When `npm run research:calibrate -- --runs 3` 실행, Then 3/3 성공
- [ ] AC-2: Given calibration 완료, When calibration.json 확인, Then baselineScore/deltaMin/compositeStats/perMetricStats/modelVersion 유효
- [ ] AC-3: Given 각 calibration run, When 시작 시, Then pipeline-runner가 `runFullPipeline()` 내부에서 이전 archive를 자동 정리 (calibrate.ts에서 별도 호출 불필요)
- [ ] AC-4: Given pipeline run 실패, When calibration 진행 중, Then 해당 run 스킵 + FAILED 로그 + 나머지 계속
- [ ] AC-5: Given 모든 run 실패, When calibration 종료, Then "No successful runs. Cannot calibrate." + exit 1

### Edge Case 에러 핸들링 (US-6)
- [ ] AC-6: Given input.png 미존재, When pipeline-runner 호출, Then "No input image found" 에러
- [ ] AC-7: Given 5회 연속 crash, When run-once 실행, Then halting 에러 + 에러 요약
- [ ] AC-8: Given SIGINT, When run-once 실행 중, Then run-once가 gitRestoreConfig 호출 (config 복원) + pipeline-runner가 scene.json을 자체 finally에서 복원 (책임 분리) + graceful exit
- [ ] AC-9: Edge case 테스트 추가 (최소 9개: 기본 6 + modelVersion mismatch + Chrome/ffmpeg 설치 가이드)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `calibrate skips failed runs and continues` | Unit | pipeline throw mock | results에 성공 run만 포함 |
| 2 | `calibrate exits when all runs fail` | Unit | 모든 pipeline throw | exit(1) |
| 3 | `runFullPipeline cleans previous archive at start` | Unit | fs mock | rmSync 호출 (pipeline-runner 내부) |
| 4 | `resolveInputImagePath throws when no input` | Unit | fs mock | Error |
| 5 | `CrashCounter stops at 5 consecutive` | Unit | 5회 recordCrash | shouldStop()=true |
| 6 | `SIGINT handler restores config` | Unit | process.emit mock | gitRestoreConfig 호출 |
| 7 | `run-once aborts on modelVersion mismatch` | Unit | calibration.json modelVersion != current | hard abort + 에러 메시지 |
| 8 | `Chrome not installed shows install guide` | Unit | puppeteer launch throw | 설치 가이드 출력 + exit |
| 9 | `ffmpeg not installed shows install guide` | Unit | checkFfmpeg throw | 설치 가이드 출력 + exit |

### 3.2 Test File Location
- `scripts/research/calibrate.test.ts` (기존 있으면 추가)
- `scripts/research/pipeline-runner.test.ts` (edge case 추가)
- `scripts/research/git-automation.test.ts` (기존 있으면 추가)

### 3.3 Mock/Setup Required
- `vi.mock("./pipeline-runner.js")` — runFullPipeline mock
- `vi.mock("./evaluate.js")` — evaluateVideo mock
- `vi.mock("child_process")` — execFileSync mock

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/research/calibrate.ts | Modify | pipeline-runner 내부 정리에 의존 (별도 archive 정리 호출 불필요) |
| scripts/research/pipeline-runner.ts | — | cleanPreviousArchive는 T5에서 내부 함수로 구현 완료. export 불필요 |
| scripts/research/calibrate.test.ts | Modify | edge case 테스트 추가 |
| scripts/research/pipeline-runner.test.ts | Modify | edge case 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. calibrate.ts: archive 정리는 pipeline-runner `runFullPipeline()` 내부에서 자동 수행. calibrate.ts에서는 별도 호출 불필요
2. 테스트 6개 작성 → Green
3. E2E 검증: `npm run research:calibrate -- --runs 3` 실행 (Replicate API 실 호출, ~15-20분)
4. calibration.json 내용 검증

### 4.3 Refactor Phase
- 없음

## 5. Edge Cases
- E1: Replicate API 타임아웃 → crash 기록 → 다음 run 계속
- E8: 5회 연속 crash → 자동 중단
- E9: SIGINT → config + scene.json 복원
- E11: modelVersion 불일치 → hard abort (run-once에서만)
- E12: scene.json 패치 중 crash → 복원

## 6. Review Checklist
- [ ] Red: 9개 테스트 FAILED
- [ ] Green: 9개 테스트 PASSED
- [ ] E2E: calibration 3/3 성공
- [ ] calibration.json 유효성 확인
- [ ] 전체 테스트 PASSED 유지
- [ ] AC 전부 충족
