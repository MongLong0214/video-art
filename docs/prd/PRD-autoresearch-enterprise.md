# PRD: Autoresearch Enterprise — E2E 파이프라인 완성 + 전수 테스트 정비

**Version**: 0.2
**Author**: Claude (orchestrator)
**Date**: 2026-03-28
**Status**: Approved
**Size**: XL

**Review History:**
- v0.1 → HAS ISSUE (P0×2, P1×3, P2×3, P3×2) — strategist/guardian/boomer 통합 리뷰
- v0.2 — P0/P1/P2 전건 수정, OQ-3 해결 → ALL PASS (잔존 P3×2 구현 시 처리)

---

## 1. Problem Statement

### 1.1 Background
Autoresearch 시스템은 AI 에이전트가 `research-config.ts` 파라미터를 자율적으로 튜닝하여 레이어 분해 품질을 개선하는 자가 개선 루프다. 최근 대규모 리팩터링(image-decompose 통합, variant 제거, threshold 변경)이 수행되었으나, 이에 따른 테스트 동기화와 E2E 파이프라인 통합이 미비한 상태다.

### 1.2 Problem Definition
1. **47개 테스트 실패** — schema default 변경(IoU 0.70→0.92, uniqueCoverage 0.02→0.005, 레이어 수 3/4/6→6/7/8 등)이 기존 테스트에 반영되지 않음
2. **pipeline-runner.ts 소스 버그** — `--variant` 플래그가 CLI에서 제거되었으나 pipeline-runner에 잔존
3. **pipeline-runner.ts 테스트 0개** — 핵심 오케스트레이션 모듈에 테스트 없음
4. **E2E 성능 미최적화** — 1920x1920 @ 60fps × 20s = 1200프레임 캡처에 ~4분 소요
5. **VMAF 미연동** — libvmaf 미설치로 M7 메트릭이 항상 fallback 0.5

### 1.3 Impact of Not Solving
- 47개 테스트 실패 상태에서 자율 실험 루프 가동 불가 (run-once가 clean tree 요구)
- pipeline-runner `--variant` 버그로 config.method 전달 불가
- pipeline-runner 버그 시 무방비 (regression 감지 불가)
- 실험 1회당 6분은 10회 calibration에 60분 → 파라미터 탐색 속도 병목
- VMAF fallback으로 temporal 평가 정확도 저하 → 잘못된 keep/discard 판정

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: 전체 테스트 스위트 **0 fail** (현재 47 fail → 0 fail)
- [ ] G2: pipeline-runner.ts **소스 버그 수정 + 테스트 커버리지 90%+** (현재 0%)
- [ ] G3: 실험 1회 소요 시간 **6분 → 3분 이하** (research용 30fps + 해상도 축소)
- [ ] G4: VMAF 메트릭 **실제 계산** (libvmaf 연동, fallback은 evaluate.ts 책임)
- [ ] G5: `npm run research:calibrate -- --runs 3` **성공적 완료** (E2E 안정성 증명)

### 2.2 Non-Goals
- NG1: 자동 파라미터 탐색 전략(Bayesian, Grid Search 등) 구현 — 향후 별도 PRD
- NG2: CI/CD 파이프라인 구축 — 로컬 개발 환경 전용
- NG3: evaluate.ts / metrics/* 로직 변경 — 고정된 harness
- NG4: 새로운 메트릭(M11+) 추가

## 3. User Stories & Acceptance Criteria

### US-1: 테스트 스위트 전체 통과
**As a** 개발자, **I want** 전체 테스트가 통과하도록, **so that** 코드 변경의 안전성을 확인할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: Given 전체 테스트 스위트, When `npm run test` 실행, Then 0 fail, 0 error
- [ ] AC-1.2: `scripts/lib/complexity-scoring.test.ts` + `complexity-scoring.comprehensive.test.ts` — tier 값 6/7/8 기준 통과
- [ ] AC-1.3: `scripts/lib/layer-resolve.test.ts` + `layer-resolve.comprehensive.test.ts` — IoU 0.92, uniqueCoverage 0.005, maxLayers 16 기준 통과
- [ ] AC-1.4: `scripts/lib/pipeline-integration.test.ts` — `--variant` 제거, `--description` 추가 반영 통과
- [ ] AC-1.5: `scripts/lib/scene-generator.test.ts` — glow 파라미터 + saturationBoost 2.5 + luminanceKey 0.6 반영 통과
- [ ] AC-1.6: `scripts/research/research-config.test.ts` + `research-config.comprehensive.test.ts` — 28개 파라미터 현재 default/range 반영 통과
- [ ] AC-1.7: `scripts/research/run-once.test.ts` + `run-once.comprehensive.test.ts` + `run-once.comprehensive2.test.ts` — pipeline-runner 통합 반영 통과
- [ ] AC-1.8: `scripts/lib/decomposition-manifest.comprehensive.test.ts` — variant 제거 리팩터링 반영 통과
- [ ] AC-1.9: `scripts/lib/e2e-golden.test.ts` — threshold 조정으로 현재 파이프라인 출력에 맞게 통과 (fixture 교체 불필요 — OQ-3 해결)

### US-2: pipeline-runner 버그 수정 + 테스트 커버리지
**As a** 개발자, **I want** pipeline-runner의 소스 버그가 수정되고 모든 경로가 테스트되도록, **so that** 오케스트레이션 버그를 사전에 감지할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: `runLayerDecomposition()` — `--variant` 플래그 제거, `--description` 또는 적합한 CLI 플래그로 교체
- [ ] AC-2.2: `runFullPipeline()` 정상 흐름 — Given input.png + config, When 실행, Then videoPath + manifestPath 반환 (execFileSync mock)
- [ ] AC-2.3: `runFullPipeline()` — Given pipeline-layers 실패, When 실행, Then 에러 전파 + 원인 메시지 포함
- [ ] AC-2.4: `runFullPipeline()` — Given export-layered 실패, When 실행, Then 에러 전파
- [ ] AC-2.5: `runFullPipeline()` — Given archive dir에 mp4 없음, When 실행, Then "did not produce a video file" 에러
- [ ] AC-2.6: `runFullPipeline()` — Given manifest 없는 archive, When 실행, Then manifestPath = ""
- [ ] AC-2.7: `runFullPipeline()` — Given config.numLayers=6, When 실행, Then subprocess에 `--layers 6` 전달
- [ ] AC-2.8: `resolveInputImagePath()` — Given input.png 존재, When 호출, Then "input.png" 반환
- [ ] AC-2.9: `resolveInputImagePath()` — Given input.png 없고 단일 .png 존재, When 호출, Then 해당 파일명 반환
- [ ] AC-2.10: `resolveInputImagePath()` — Given .png 없음, When 호출, Then Error throw
- [ ] AC-2.11: `resolveInputImagePath()` — Given input.png 없고 복수 .png 존재, When 호출, Then Error throw (ambiguous)
- [ ] AC-2.12: `copyToResearchDir()` — Given videoPath, When 호출, Then .cache/research/current/video.mp4로 복사 + 경로 반환
- [ ] AC-2.13: `findManifest()` — Given archive dir 내 manifest 존재, When 호출, Then 경로 반환
- [ ] AC-2.14: `findManifest()` — Given manifest 없음, When 호출, Then "" 반환

### US-3: Research 전용 성능 최적화
**As a** 연구자, **I want** 실험 1회 소요 시간이 3분 이하로, **so that** 더 많은 파라미터 탐색을 수행할 수 있다.

**scene.json 패치 전략**: pipeline-runner가 export 전 `public/scene.json`을 research 설정으로 패치하고, export 완료 후 반드시 복원한다. 복원은 `finally` 블록에서 수행하며, SIGINT 시에도 `process.on('exit')` 핸들러로 복원을 보장한다.

**Acceptance Criteria:**
- [ ] AC-3.1: Given scene.json resolution > 1080, When pipeline-runner export, Then 임시로 resolution을 [1080, 1080]으로 패치 → export → 원본 복원
- [ ] AC-3.2: Given scene.json, When pipeline-runner export, Then fps를 30으로 패치 (export-layered가 scene.json의 fps는 무시하므로 별도 메커니즘 필요 — export-layered에 `--fps` 플래그 추가 또는 환경변수)
- [ ] AC-3.3: Given scene.json duration > 10, When pipeline-runner export, Then duration을 10으로 패치 → export → 원본 복원
- [ ] AC-3.4: Given pipeline-runner export, When ffmpeg 실행, Then preset `fast` 적용 (export-layered의 기본값이 `slow`이므로 환경변수 또는 플래그 필요)
- [ ] AC-3.5: Given 이전 _research archive 존재 (`out/layered/*_research*`), When 새 pipeline-runner 실행, Then 이전 archive 삭제 후 진행
- [ ] AC-3.6: Given scene.json 패치 중 SIGINT 수신, When 프로세스 종료, Then scene.json이 원본으로 복원됨
- [ ] AC-3.7: Given 1080px/30fps/10s 설정, When E2E 실행, Then 총 소요 시간 ≤ 180s

### US-4: VMAF 메트릭 실제 연동
**As a** 연구자, **I want** M7(VMAF) 메트릭이 실제 계산되도록, **so that** temporal 품질 평가가 정확해진다.

**VMAF fallback 책임**: `evaluate.ts`가 `computeVmaf()` 호출을 try/catch로 감싸고, 실패 시 fallback 0.5를 반환한다. `vmaf.ts`는 계산 실패 시 throw한다. 이 구조가 현재 구현과 일치하는지 검증 필요.

**Acceptance Criteria:**
- [ ] AC-4.1: Given ffmpeg에 libvmaf 포함, When `checkVmafAvailable()` 호출, Then true 반환
- [ ] AC-4.2: Given ffmpeg에 libvmaf 미포함, When `checkVmafAvailable()` 호출, Then false 반환
- [ ] AC-4.3: Given libvmaf available, When `computeVmaf()` 호출, Then 실제 VMAF 점수(0-1) 반환
- [ ] AC-4.4: Given libvmaf unavailable, When `evaluateVideo()` 호출, Then M7 = 0.5 + stderr에 설치 가이드 1회 출력
- [ ] AC-4.5: Given evaluate.ts, When computeVmaf() throw, Then catch에서 M7 = 0.5 fallback (evaluate.ts 책임)
- [ ] AC-4.6: libvmaf 설치 가이드 문서화 (`docs/` 또는 README §Prerequisites)
- [ ] AC-4.7: VMAF 계산 테스트 — Given mock ffmpeg VMAF output, When computeVmaf(), Then 정규화된 0-1 점수 반환

### US-5: E2E Calibration 안정성
**As a** 연구자, **I want** calibration 3회 이상 안정적으로 완료되도록, **so that** 신뢰할 수 있는 noise floor를 측정할 수 있다.

**전제조건**: `npm run research:prepare -- source.mp4` 완료 상태 (`.cache/research/reference/metadata.json` 존재).

**Acceptance Criteria:**
- [ ] AC-5.1: Given reference 준비 완료 + input.png 존재, When `npm run research:calibrate -- --runs 3` 실행, Then 3/3 성공 완료
- [ ] AC-5.2: Given calibration 완료, When calibration.json 확인, Then baselineScore/deltaMin/compositeStats/perMetricStats/modelVersion 모두 유효
- [ ] AC-5.3: Given 이전 _research archive 존재, When 각 calibration run 시작, Then 이전 archive 자동 삭제 (`out/layered/*_research*` + `.cache/research/current/` 덮어쓰기)
- [ ] AC-5.4: Given pipeline run 실패, When calibration 진행 중, Then 해당 run 스킵 + console에 FAILED 로그 + 나머지 run 계속 실행
- [ ] AC-5.5: Given 모든 run 실패 (0 성공), When calibration 종료, Then "No successful runs. Cannot calibrate." 에러 + exit code 1
- [ ] AC-5.6: Given calibrate 실행 중, When modelVersion 불일치 감지 (calibration vs baseline), Then 명확한 에러 메시지 + recalibrate 요구 — run-once.ts에서 처리, calibrate.ts는 modelVersion을 기록만 함

### US-6: Edge Case 에러 핸들링
**As a** 개발자, **I want** 모든 외부 의존성 실패 시 명확한 가이드가 출력되도록, **so that** 디버깅 시간을 최소화할 수 있다.

**Acceptance Criteria:**
- [ ] AC-6.1: Given Chrome 미설치, When export-layered 실행 실패, Then 에러 메시지에 `npx puppeteer browsers install chrome` 가이드 포함
- [ ] AC-6.2: Given ffmpeg 미설치, When export 또는 evaluate 실행, Then 에러 메시지에 `brew install ffmpeg` 가이드 포함
- [ ] AC-6.3: Given input.png 미존재, When pipeline-runner 호출, Then "No input image found. Place input.png at the project root." 에러
- [ ] AC-6.4: Given 5회 연속 crash (crash-count.json count=5), When run-once 실행, Then `"{N} consecutive crashes — halting"` 에러 + 최근 에러 요약 출력 + process.exit(1)
- [ ] AC-6.5: Given SIGINT 수신, When run-once 실행 중, Then config 복원(git checkout) + scene.json 복원(if 패치 중) + graceful exit
- [ ] AC-6.6: Given Replicate API 타임아웃 (300s), When pipeline-layers 실행, Then subprocess timeout 에러 → crash 기록 → 다음 run 계속

## 4. Technical Design

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  research:calibrate / research:run                          │
│    ├─ pipeline-runner.ts (오케스트레이터)                    │
│    │   ├─ pipeline-layers.ts (subprocess: Replicate API)    │
│    │   ├─ scene.json 패치 (research 설정 적용)             │
│    │   │   ├─ resolution → [1080, 1080] (max)              │
│    │   │   ├─ duration → 10 (max)                          │
│    │   │   └─ finally 블록에서 반드시 원본 복원             │
│    │   ├─ export-layered.ts (subprocess: Vite+Puppeteer)    │
│    │   ├─ archive 정리 (out/layered/*_research* 삭제)      │
│    │   └─ .cache/research/current/video.mp4 (최종 출력)    │
│    │                                                        │
│    ├─ evaluate.ts (고정 harness)                            │
│    │   ├─ frame-extractor.ts                                │
│    │   ├─ metrics/M1-M10 (고정)                            │
│    │   └─ VMAF: try computeVmaf() catch → fallback 0.5    │
│    │                                                        │
│    └─ git-automation.ts (브랜치/커밋/복원)                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Data Model Changes
N/A — 파일 기반 시스템, DB 없음.

### 4.3 API Design
N/A — CLI 스크립트, HTTP API 없음.

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Export 방식 | In-process Puppeteer vs subprocess export-layered | **subprocess** | 검증된 export-layered 재사용, stdio buffer deadlock 방지 |
| Research 해상도 | 원본 유지 vs 1080px 제한 | **1080px 제한** | 평가 메트릭은 해상도 무관, 캡처 시간 75% 단축 |
| Research FPS | 60fps vs 30fps | **30fps** | 프레임 수 절반, 평가 정확도 영향 미미. export-layered에 환경변수/플래그 추가 |
| Research Duration | scene.json 원본 vs 10s 제한 | **10s 제한** | calibration 속도 우선, 메트릭 안정성 유지 |
| scene.json 패치 | export-layered 플래그 추가 vs pipeline-runner에서 패치/복원 | **패치/복원** | export-layered 수정 최소화, finally 블록 + exit 핸들러로 원자성 보장 |
| VMAF 설치 | brew formula vs 직접 빌드 | **빌드 가이드 + fallback** | macOS에서 `brew install ffmpeg --with-libvmaf` 불가. fallback 0.5는 evaluate.ts 책임 |
| VMAF fallback 책임 | vmaf.ts에서 fallback vs evaluate.ts에서 catch | **evaluate.ts catch** | vmaf.ts는 실패 시 throw (순수 계산), evaluate.ts가 catch 후 fallback 처리 |
| Archive 정리 | 보존 vs 덮어쓰기 | **삭제 후 실행** | out/layered/*_research* + .cache/research/current/ 모두 정리 |
| e2e-golden 수정 | fixture 교체 vs threshold 조정 | **threshold 조정** | Replicate API 호출 없이 해결, 기존 fixture 재사용 (OQ-3 해결) |

### 4.5 Implementation Order (Critical Path)

```
US-1 (테스트 수정) ──→ US-3 (성능 최적화) ──→ US-5 (E2E calibration)
       ↕ 병렬                                       ↑
US-2 (pipeline-runner) ─────────────────────────────┘
US-4 (VMAF) ──→ 독립 (US-5와 무관하게 진행 가능)
US-6 (Edge Case) ──→ US-1/US-2와 함께 진행
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | Replicate API 타임아웃 | pipeline-layers subprocess 300s timeout → Error throw → calibrate/run-once가 crash 기록 → 다음 run 계속 | P2 |
| E2 | Vite 서버 포트 충돌 (5299 사용 중) | export-layered 실패 → Error throw → crash 기록 → 에러 메시지에 포트 포함 | P2 |
| E3 | Puppeteer Chrome 미설치 | export-layered 실패 → 에러에 `npx puppeteer browsers install chrome` 가이드 포함 | P1 |
| E4 | ffmpeg 미설치 | encode/evaluate 실패 → 에러에 `brew install ffmpeg` 가이드 포함 | P1 |
| E5 | libvmaf 미설치 | evaluate.ts가 computeVmaf() catch → M7=0.5 + stderr "VMAF not available" 1회 출력 | P3 |
| E6 | input.png 미존재 | resolveInputImagePath() → Error("No input image found. Place input.png at the project root.") | P1 |
| E7 | 디스크 공간 부족 | research 해상도 제한(1080px)으로 프레임 디스크 ~330MB로 축소. archive 자동 정리 | P2 |
| E8 | 5회 연속 crash | CrashCounter.shouldStop() → Error("{N} consecutive crashes — halting") + 최근 에러 요약 출력 | P1 |
| E9 | SIGINT during run-once | registerSigintHandler → gitRestoreConfig + scene.json 복원(패치 중이었다면) + process.exit(0) | P1 |
| E10 | archive dir 이름 충돌 (-2, -3 suffix) | runExportLayered()에서 reverse sort → 최신 dir의 mp4 선택 | P3 |
| E11 | modelVersion 불일치 (calibration vs baseline) | run-once.ts에서 hard abort: "Model version mismatch... Run research:calibrate" | P1 |
| E12 | scene.json 패치 중 crash/SIGINT | finally 블록 + process.on('exit') 핸들러에서 원본 복원. 복원 실패 시 `git checkout -- public/scene.json` fallback | P1 |

## 6. Security & Permissions

### 6.1 Authentication
N/A — 로컬 CLI 도구. Replicate API token은 `.env`에서 로드 (gitignored).

### 6.2 Authorization
N/A

### 6.3 Data Protection
- `.env` (API token) gitignored
- `source.mp4`, `input.png` gitignored
- `.cache/research/` gitignored
- `out/` gitignored

## 7. Performance & Monitoring

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| 실험 1회 E2E | ~360s (6min) | ≤180s (3min) | `pipeline-runner.elapsedMs` |
| 캡처 프레임 수 | 1200 (60fps×20s) | 300 (30fps×10s) | 75% 감소 |
| 캡처 디스크 | ~5.4GB (1920px) | ~330MB (1080px) | 94% 감소 |
| 테스트 실행 | 47 fail / 2417 | 0 fail / ~2450 | `npm run test` |

### 7.1 Monitoring & Alerting
- `results.tsv` — 실험별 점수/상태/소요시간 로그
- `calibration.json` — baseline/deltaMin/sigma 기록
- `crash-count.json` — 연속 실패 추적 (5회 자동 중단)
- Console output — 실시간 진행 상황 (`[exp #N] quality: X.XXXX`)

## 8. Testing Strategy

### 8.1 Unit Tests

| 모듈 | 테스트 파일 | 현재 | 목표 | 주요 변경 |
|------|-----------|------|------|----------|
| pipeline-runner | `scripts/research/pipeline-runner.test.ts` (신규) | 0 tests | 14 tests | execFileSync mock, fs mock, 에러 경로 |
| complexity-scoring | `scripts/lib/complexity-scoring.test.ts`, `*.comprehensive.test.ts` | fail | pass | tier 값 3/4/6→6/7/8 |
| layer-resolve | `scripts/lib/layer-resolve.test.ts`, `*.comprehensive.test.ts` | fail | pass | IoU 0.85→0.92, unique 0.02→0.005, cap 8→16 |
| pipeline-cli | `scripts/lib/pipeline-integration.test.ts` | fail | pass | --variant→--description |
| scene-generator | `scripts/lib/scene-generator.test.ts` | fail | pass | glow, satBoost 2.5, lumKey 0.6 |
| research-config | `scripts/research/research-config.test.ts`, `*.comprehensive.test.ts` | fail | pass | numLayers 8, maxLayers 16 등 |
| run-once | `scripts/research/run-once.test.ts`, `*.comprehensive*.test.ts` (3개) | fail | pass | pipeline-runner import 반영 |
| decomposition-manifest | `scripts/lib/decomposition-manifest.comprehensive.test.ts` | fail | pass | variant 제거 반영 |
| e2e-golden | `scripts/lib/e2e-golden.test.ts` | fail | pass | threshold 조정 |

### 8.2 Integration Tests
- pipeline-runner E2E mock: `execFileSync` stub + filesystem mock으로 full flow 검증
- calibrate 내부: `buildCalibrationResult` + `computeDeltaMin` 체인 (기존 테스트 유지)
- run-once 내부: `makeKeepDecision` + `formatTsvRow` 체인 (기존 테스트 유지)

### 8.3 Edge Case Tests
- E1-E12 각각에 대한 유닛 테스트 (해당 모듈의 테스트 파일에 추가)
- VMAF available/unavailable 분기 테스트 (vmaf.test.ts에 추가)
- archive dir 다중 존재 시 최신 선택 테스트 (pipeline-runner.test.ts에 추가)
- scene.json 패치/복원 원자성 테스트 (pipeline-runner.test.ts에 추가)
- resolveInputImagePath 복수 PNG 테스트 (pipeline-runner.test.ts에 추가)

## 9. Rollout Plan

### 9.1 Migration Strategy
N/A — 테스트 수정 + 신규 모듈, DB 마이그레이션 없음.

### 9.2 Feature Flag
N/A — 로컬 CLI 도구.

### 9.3 Rollback Plan
- git revert로 즉시 복원 가능
- 각 티켓별 독립 커밋으로 세밀한 revert 가능

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| ffmpeg | system | installed | E2E 불가 |
| Puppeteer + Chrome | npm | installed | export 불가 |
| Replicate API | external | available | 파이프라인 불가 (mock으로 테스트 가능) |
| libvmaf | system | **미설치** | M7 fallback 유지 (품질 저하). cmake + Xcode CLT 필요 |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| libvmaf macOS 빌드 실패 (cmake/Xcode CLT 의존) | Medium | Low | fallback 0.5 유지, 빌드 가이드 문서화 |
| Replicate API 비용 증가 | Low | Low | calibration runs 최소화 (3회) |
| 테스트 수정이 연쇄 실패 유발 | Medium | Medium | 모듈별 순차 수정, 매 모듈 후 전체 테스트 |
| export-layered subprocess 불안정 | Low | High | stdio inherit로 해결 (검증 완료) |
| scene.json 패치 중 crash → 원본 손실 | Low | High | finally + exit handler + git checkout fallback |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| Test failures | 47 | 0 | `npm run test` |
| pipeline-runner coverage | 0% | 90%+ | vitest --coverage |
| 실험 E2E 시간 | 360s | ≤180s | pipeline-runner.elapsedMs |
| Calibration 성공률 | 1/1 | 3/3 | research:calibrate --runs 3 |
| VMAF 실제 계산 | No (fallback) | Yes (libvmaf 설치 시) | evaluate output M7 ≠ 0.5 |

## 12. Open Questions

- [x] OQ-1: ~~Research용 해상도/fps 제한을 export-layered에 플래그로 추가 vs pipeline-runner에서 scene.json 패치~~ → pipeline-runner에서 scene.json 패치 후 export, finally에서 복원. SIGINT 시 exit handler로 복원 보장
- [x] OQ-2: ~~libvmaf 설치를 자동화할 것인가~~ → 빌드 가이드 문서화 + checkVmafAvailable fallback 유지. cmake + Xcode CLT 전제조건 명시
- [x] OQ-3: ~~e2e-golden 테스트는 fixture 이미지 교체 필요한가~~ → threshold 조정으로 해결. Replicate API 호출 없이 기존 fixture 재사용

---
