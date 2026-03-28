# T4: pipeline-runner 버그 수정 + 테스트 작성

**PRD Ref**: PRD-autoresearch-enterprise > US-2
**Priority**: P0 (Blocker)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: None (신규 테스트 파일 생성으로 T1/T2와 겹침 없음)

---

## 1. Objective
pipeline-runner.ts의 `--variant` 잔존 버그를 수정하고, 14개 테스트를 작성하여 90%+ 커버리지를 달성한다.

## 2. Acceptance Criteria
- [ ] AC-1: `runLayerDecomposition()` — `--variant` 플래그 제거, config.method가 있어도 `--variant`로 전달하지 않음
- [ ] AC-2: `runFullPipeline()` 정상 흐름 테스트 — execFileSync mock 기반
- [ ] AC-3: `runFullPipeline()` pipeline-layers 실패 시 에러 전파 테스트
- [ ] AC-4: `runFullPipeline()` export-layered 실패 시 에러 전파 테스트
- [ ] AC-5: `runFullPipeline()` archive에 mp4 없을 시 에러 테스트
- [ ] AC-6: `runFullPipeline()` manifest 없을 때 "" 반환 테스트
- [ ] AC-7: `runFullPipeline()` config.numLayers=6 전달 시 subprocess에 `--layers 6` 포함 테스트
- [ ] AC-8: `resolveInputImagePath()` — input.png 존재 시 반환
- [ ] AC-9: `resolveInputImagePath()` — input.png 없고 단일 .png 시 반환
- [ ] AC-10: `resolveInputImagePath()` — .png 없을 시 에러
- [ ] AC-11: `resolveInputImagePath()` — 복수 .png 시 에러
- [ ] AC-12: `copyToResearchDir()` — .cache/research/current/로 복사
- [ ] AC-13: `findManifest()` — manifest 존재 시 경로 반환
- [ ] AC-14: `findManifest()` — manifest 없을 시 "" 반환

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `runLayerDecomposition does not pass --variant` | Unit | config.method="qwen-only" 시 CLI args 확인 | --variant 미포함 |
| 2 | `runFullPipeline returns videoPath and manifestPath` | Unit | 정상 흐름 mock | { videoPath, manifestPath, elapsedMs } |
| 3 | `runFullPipeline throws on pipeline-layers failure` | Unit | execFileSync throw | Error 전파 |
| 4 | `runFullPipeline throws on export-layered failure` | Unit | 2번째 execFileSync throw | Error 전파 |
| 5 | `runFullPipeline throws when no mp4 in archive` | Unit | 빈 archive dir | "did not produce" |
| 6 | `runFullPipeline returns empty manifestPath when no manifest` | Unit | manifest 미존재 | manifestPath="" |
| 7 | `runFullPipeline passes --layers N from config` | Unit | config.numLayers=6 | args에 "--layers 6" |
| 8 | `resolveInputImagePath returns input.png when exists` | Unit | fs mock | "input.png" |
| 9 | `resolveInputImagePath returns single png when no input.png` | Unit | fs mock | "photo.png" |
| 10 | `resolveInputImagePath throws when no png` | Unit | fs mock | Error |
| 11 | `resolveInputImagePath throws when multiple png` | Unit | fs mock | Error |
| 12 | `copyToResearchDir copies video to cache dir` | Unit | fs mock | dest path |
| 13 | `findManifest returns path when exists` | Unit | fs mock | manifest path |
| 14 | `findManifest returns empty when not exists` | Unit | fs mock | "" |

### 3.2 Test File Location
- `scripts/research/pipeline-runner.test.ts` (신규 생성)

### 3.3 Mock/Setup Required
- `vi.mock("child_process")` — execFileSync mock (pipeline-runner.ts가 bare `"child_process"` import 사용)
- `vi.mock("node:fs")` — existsSync, readdirSync, mkdirSync, copyFileSync mock (pipeline-runner.ts가 `"node:fs"` import 사용)
- `vi.mock("node:path")` — 필요시 join mock (pipeline-runner.ts가 `"node:path"` import 사용)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/research/pipeline-runner.ts | Modify | `--variant` → 제거 (config.method 전달 제거 또는 적합한 플래그로 교체) + resolveInputImagePath 에러 메시지 분화 (0개 PNG vs 2+개 PNG 구분) |
| scripts/research/pipeline-runner.test.ts | Create | 14개 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. pipeline-runner.ts: `runLayerDecomposition()`에서 `--variant` 줄 제거 (config.method는 pipeline-layers가 research-config에서 직접 로드)
1b. pipeline-runner.ts: `resolveInputImagePath()`에서 0개 PNG와 2+개 PNG를 구분하는 에러 메시지 추가. 현재 둘 다 같은 메시지 출력 → "No .png files found" vs "Multiple .png files found (expected 1): [filenames]"
2. pipeline-runner.test.ts 생성: vi.mock 설정
3. resolveInputImagePath 4개 테스트 작성 → Green
4. findManifest 2개 테스트 작성 → Green
5. copyToResearchDir 1개 테스트 작성 → Green
6. runLayerDecomposition --variant 미전달 테스트 작성 → Green
7. runFullPipeline 정상/에러 6개 테스트 작성 → Green
8. 전체 vitest run 확인

### 4.3 Refactor Phase
- 내부 함수 export 필요 시 (테스트를 위해) 최소한으로 export

## 5. Edge Cases
- E10: archive dir 이름 충돌 시 reverse sort로 최신 선택
- resolveInputImagePath에서 favicon.png 등 시스템 파일 제외

## 6. Review Checklist
- [ ] Red: 14개 테스트 전부 FAILED (구현 전)
- [ ] Green: 14개 테스트 PASSED
- [ ] Refactor: 전체 PASSED 유지
- [ ] AC 전부 충족
- [ ] `--variant` 버그 수정 확인
