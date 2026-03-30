# PRD: Pipeline Hardening

**Version**: 0.3
**Author**: Claude (orchestrator)
**Date**: 2026-03-29
**Status**: Approved
**Size**: L

> v0.2 changes: F1~F10 리뷰 피드백 반영 (strategist+guardian+boomer 3자 합의)
> v0.3 changes: Boomer Round 2 — 검증 순서, manual-layers 캐시 범위, 테스트 baseline 감사성

---

## 1. Problem Statement

### 1.1 Background
SAM 2 decomposition 엔진 교체 및 HSV hue rotation 셰이더 구현 과정에서 34개 이슈 중 27개를 수정 완료했다. 남은 7개 이슈는 코드 품질, 성능, 보안에 걸친 기술 부채로, 파이프라인의 안정성과 유지보수성에 영향을 준다.

### 1.2 Problem Definition
파이프라인 코드에 중복 상수, 중복 연산, 경로 검증 부재, 하드코딩된 설정값이 산재해 있어 유지보수 비용이 높고 잠재적 보안/성능 문제가 존재한다.

### 1.3 Impact of Not Solving
- path traversal 미검증으로 임의 경로 접근 가능 (보안)
- `buildExclusiveMasks` 내부의 per-candidate mask 디코딩이 매 호출마다 반복 (~3회)
- 임계값 불일치: SAM raw filter(alpha>10, coverage 0.001) vs BFS extraction(alpha 128, coverage 0.005) 혼선
- 4K 출력 시 15M bitrate로 인코딩되어 화질 저하

## 2. Goals & Non-Goals

### 2.1 Goals
- [x] G1: 공유 상수 파일로 의미별 임계값 통합 (중복 정의 0)
- [x] G2: per-candidate binary mask 캐싱으로 반복 디코딩 제거
- [x] G3: SAM-mask path의 bbox/centroid/coverage 유틸 추출
- [x] G4: path traversal 검증 추가 (프로젝트 루트 범위 제한, 항상 강제)
- [x] G5: ffmpeg bitrate 해상도 기반 동적 조정 (30fps scope)
- [x] G6: 순차 마스크 처리를 Promise.all 병렬화
- [x] G7: 기존 테스트 전수 통과 유지 + 기존 TS 에러 수정 (regression 0)

### 2.2 Non-Goals
- NG1: 파이프라인 기능 변경 (동작은 동일해야 함)
- NG2: SAM 2 API 호출 로직 변경
- NG3: 셰이더 코드 수정
- NG4: research/ 디렉토리 리팩토링 (별도 스코프)
- NG5: 새로운 CLI 플래그 추가 (기존 플래그 의미 변경도 포함)

## 3. User Stories & Acceptance Criteria

### US-1: 공유 상수 통합
**As a** developer, **I want** 파이프라인 임계값이 의미별 단일 소스에서 관리되게, **so that** 값 변경 시 일관성이 보장된다.

**Acceptance Criteria:**
- [ ] AC-1.1: `scripts/lib/pipeline-constants.ts`에 아래 상수 정의:
  - `ALPHA_THRESHOLD = 128` (BFS/ownership 판정용)
  - `SAM_OPACITY_THRESHOLD = 10` (SAM raw mask 필터용 — 0.001 coverage와 쌍)
  - `MIN_COVERAGE = 0.005` (BFS candidate 최소 커버리지)
  - `SAM_MIN_COVERAGE = 0.001` (SAM mask 최소 커버리지)
  - `UNIQUE_COVERAGE_THRESHOLD = 0.005`
  - `IOU_DEDUPE_THRESHOLD = 0.92`
  - `MAX_LAYERS = 16`
  - `MIN_RETAINED_LAYERS = 6`
- [ ] AC-1.2: `candidate-extraction.ts`, `layer-resolve.ts`, `pipeline-layers.ts`의 로컬 상수가 공유 상수를 import
- [ ] AC-1.3: `research-config.ts`의 Zod 스키마 default 값이 공유 상수 참조
- [ ] AC-1.4: 기존 동작 무변경 — SAM path는 alpha>10/coverage 0.001 유지, BFS path는 alpha 128/coverage 0.005 유지

### US-2: per-candidate binary mask 캐싱
**As a** developer, **I want** 마스크 디코딩이 candidate당 1회만 수행되게, **so that** 대형 이미지 처리 시 반복 I/O가 제거된다.

**Acceptance Criteria:**
- [ ] AC-2.1: `resolveExclusiveOwnership`에 optional `predecodedMasks` 파라미터 추가 — 전달 시 내부 mask 디코딩 스킵
- [ ] AC-2.2: **SAM path**: `pipeline-layers.ts`에서 Step 4(SAM mask 변환) 시 디코딩한 binary mask를 `Map<candidateId, Uint8Array>`에 보존. **Manual-layers path**: `extractCandidates` 호출 후 동일하게 binary mask를 캐시에 추가
- [ ] AC-2.3: Step 6, Step 8의 `resolveExclusiveOwnership` 호출 시 보존된 mask 전달 (양쪽 path 모두)
- [ ] AC-2.4: Step 10의 `buildExclusiveMasks` 호출은 retention 이후이므로 캐시 미사용 (정확성 보장)
- [ ] AC-2.5: 기존 테스트 전수 통과 + 캐시 유무에 따른 결과 동일성 fixture 테스트

### US-3: computeMaskStats 유틸 추출 (SAM path 전용)
**As a** developer, **I want** SAM mask의 bbox/centroid/coverage 계산이 유틸 함수로 추출되게, **so that** pipeline-layers.ts의 inline 로직이 단순화된다.

**Acceptance Criteria:**
- [ ] AC-3.1: `scripts/lib/mask-stats.ts`에 `computeMaskStats(rgba, width, height, alphaThreshold)` 함수 정의
- [ ] AC-3.2: 반환 타입: `{ coverage, bbox, centroid, opaqueCount }`
- [ ] AC-3.3: `pipeline-layers.ts` Step 4에서 이 유틸 사용 (SAM mask path)
- [ ] AC-3.4: `candidate-extraction.ts`의 labeled-component fast path는 변경하지 않음 (BFS는 single-pass label map이므로 별도 최적화 경로 유지)
- [ ] AC-3.5: 합성 RGBA 버퍼 fixture 테스트로 정확도 검증

### US-4: Path Traversal 검증
**As a** developer, **I want** 입력 경로가 프로젝트 루트 내로 제한되게, **so that** 임의 파일 시스템 접근이 차단된다.

**Acceptance Criteria:**
- [ ] AC-4.1: 기존 `scripts/lib/validate-file-path.ts`의 `validateFilePath` 헬퍼를 확장하여 이미지 확장자(`.png`, `.jpg`, `.jpeg`, `.webp`) 지원
- [ ] AC-4.2: `pipeline-layers.ts`에서 `cliArgs.inputPath`에 대해 `validateFilePath(resolvedPath, projectRoot, imageExtensions)` 호출. `fs.realpathSync` + `startsWith(projectRoot + path.sep)` 시맨틱 사용
- [ ] AC-4.3: manual layers 디렉토리 및 파일 검증 — (1) `detectManualLayers` 호출 전에 `layers/` 디렉토리 자체를 `fs.realpathSync`로 resolve하여 projectRoot 내부인지 확인 (symlinked dir 차단). (2) 결과의 각 파일에 대해 `validateFilePath` 호출을 **sharp/fs.copyFileSync 등 첫 I/O 이전에** 수행
- [ ] AC-4.4: 범위 외 경로 시 `"Input path must be within project root: <path>"` 에러 + exit(1)
- [ ] AC-4.5: 상대 경로(`../`), 심볼릭 링크(외부 타깃), `/project-evil/` prefix 공격 모두 차단 확인 테스트
- [ ] AC-4.6: TOCTOU는 로컬 CLI 컨텍스트에서 accepted risk로 문서화

### US-5: FFmpeg Bitrate 동적 조정
**As a** developer, **I want** 출력 해상도에 맞는 bitrate가 자동 적용되게, **so that** 4K 출력 화질이 보장된다.

**Acceptance Criteria:**
- [ ] AC-5.1: 해상도별 bitrate 매핑 (픽셀 수 기준): 720p(921,600px)→8M, 1080p(2,073,600px)→15M, 1440p(3,686,400px)→25M, 4K(8,294,400px)→40M
- [ ] AC-5.2: 매핑에 없는 해상도는 픽셀 수 기반 선형 보간. 720p 미만→8M 클램프, 4K 초과→40M 클램프
- [ ] AC-5.3: portrait/landscape 구분 없이 총 픽셀 수(width*height)로 판정
- [ ] AC-5.4: `export-layered.ts`의 `encodeVideo`가 resolution을 인자로 받아 bitrate 결정
- [ ] AC-5.5: 기존 1080p 출력은 15M 유지 (기존 동작 호환)
- [ ] AC-5.6: scope는 30fps 고정. 60fps는 이 PRD 범위 외

### US-6: 마스크 처리 병렬화
**As a** developer, **I want** 독립적인 마스크 I/O가 병렬 처리되게, **so that** 다중 레이어 파이프라인 속도가 향상된다.

**Acceptance Criteria:**
- [ ] AC-6.1: `pipeline-layers.ts` Step 4의 순차 마스크 로딩을 batched `Promise.all`로 전환
- [ ] AC-6.2: 동시 처리 수 제한 (concurrency limit = 4, 메모리 안전). 4K 이미지에서 peak ~400-500MB (raw + sharp intermediate)
- [ ] AC-6.3: 결과 순서가 기존과 동일 (마스크 인덱스 보존)
- [ ] AC-6.4: 에러 발생 시 전체 실패 (partial result 없음)

### US-7: Regression 검증 + Baseline 수정
**As a** developer, **I want** 모든 리팩토링 후 기존 테스트가 통과하게, **so that** 동작 변경이 없음이 증명된다.

**Acceptance Criteria:**
- [ ] AC-7.1: 기존 `pipeline-layers.ts`의 TS 에러 3건 수정 (prerequisite): `"qwen-base"` 타입 불일치 2건 + `selectedLayerCount` 미정의 1건
- [ ] AC-7.2: `vitest run` 전체 통과 (기존 passing 테스트 + 신규 테스트). 구현 시작 전 `vitest run --reporter=json > .cache/test-baseline.json` 으로 failing test 목록을 아티팩트로 저장. net new failure = 0 (`.cache/test-baseline.json`에 없는 새 실패 0건)
- [ ] AC-7.3: `tsc --noEmit` net new 에러 0 (기존 에러 수정 포함)
- [ ] AC-7.4: deterministic portion 검증 — manual layers 입력으로 파이프라인 실행 시 동일 레이어 수/역할 배정 (SAM 2 API는 비결정적이므로 제외)

## 4. Technical Design

### 4.1 Architecture Overview
순수 리팩토링. 기존 `scripts/lib/` 모듈 내 코드 재배치 + 유틸 추출.

```
scripts/lib/
  pipeline-constants.ts   (신규: 의미별 공유 상수)
  mask-stats.ts           (신규: SAM mask bbox/centroid/coverage 유틸)
  validate-file-path.ts   (수정: 이미지 확장자 지원 추가)
  candidate-extraction.ts (수정: 공유 상수 import)
  layer-resolve.ts        (수정: 공유 상수 import + resolveExclusiveOwnership에 predecodedMasks 옵션)
scripts/
  pipeline-layers.ts      (수정: TS에러 수정 + 캐싱 + 병렬화 + 상수/유틸/검증 import)
  export-layered.ts       (수정: 동적 bitrate)
```

### 4.2 Data Model Changes
없음.

### 4.3 API Design
CLI 인터페이스 변경 없음. `--unsafe` 플래그의 의미 변경 없음 (manifest 기록 전용 유지).

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 상수 분류 | 이름 기준 통합 / 의미 기준 분리 | **의미 기준 분리** (SAM vs BFS) | SAM alpha>10, BFS alpha 128은 다른 semantic — 통합하면 동작 변경 |
| mask 캐싱 방식 | claimedMask 캐시 (Step 8→10) / per-candidate mask 캐시 | **per-candidate mask** | retention이 후보를 변경하므로 claimedMask 캐시는 stale. per-candidate는 안전 |
| computeMaskStats 적용 범위 | 양쪽 path / SAM path만 | **SAM path만** | BFS는 label-map single-pass. 강제 적용 시 추가 scan 발생 |
| path validation | 신규 헬퍼 / 기존 validate-file-path.ts 재사용 | **기존 헬퍼 확장** | realpathSync + trailing sep 검증 이미 구현됨 |
| --unsafe와 path validation | unsafe가 bypass / 항상 강제 | **항상 강제** | unsafe는 현재 no-op. 보안 bypass 추가는 NG5 위반 |
| bitrate FPS 고려 | resolution만 / resolution+FPS | **resolution만 (30fps scope)** | 프로젝트 FPS 기본값 30. 60fps는 별도 PRD |
| bitrate clamp | extrapolation / clamp | **clamp** (720p미만→8M, 4K초과→40M) | 예측 가능, 안전 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | 입력 경로가 `../../etc/passwd` | 에러: "Input path must be within project root" + exit(1) | High |
| E2 | 심볼릭 링크가 프로젝트 외부를 가리킴 | `fs.realpathSync` 후 동일 검증 | High |
| E3 | `/project-evil/pwned.png` prefix 공격 | `startsWith(projectRoot + path.sep)` 로 차단 | High |
| E4 | manual layers 중 하나가 프로젝트 외부 | 해당 파일에서 에러 + exit(1) | High |
| E5 | 4096x4096 이미지에서 병렬 마스크 로딩 | concurrency=4, peak ~400-500MB (raw+sharp intermediate) | Medium |
| E6 | 비표준 해상도 (예: 1920x800, portrait) | 픽셀 수 기반 보간, portrait도 width*height로 동일 처리 | Low |
| E7 | 마스크 0개 (전부 coverage < threshold) | 기존 fallback bg-plate 합성 유지 | Low |
| E8 | 720p 미만 / 4K 초과 해상도 | bitrate 8M / 40M으로 클램프 | Low |
| E9 | TOCTOU (symlink 타깃 변경) | accepted risk for local CLI context | Low |

## 6. Security & Permissions

### 6.1 Authentication
N/A (로컬 CLI 도구)

### 6.2 Authorization
N/A

### 6.3 Data Protection
- 기존 `validate-file-path.ts` 확장으로 이미지 입력 경로 검증
- `fs.realpathSync` → `startsWith(projectRoot + path.sep)` 시맨틱 (trailing separator 필수)
- manual layers도 동일 검증 적용
- `--unsafe` 플래그는 path validation과 무관 (기존 동작 유지: manifest 기록만)
- TOCTOU gap은 로컬 CLI 컨텍스트에서 accepted risk

## 7. Performance & Monitoring

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| per-candidate mask 디코딩 | 매 buildExclusiveMasks 호출마다 반복 | candidate당 1회 (캐시 후 재사용) | 로그 |
| Step 4 마스크 로딩 시간 (8 layers, 1080p) | ~순차 N*T | ~병렬 ceil(N/4)*T | console.time |
| 4K 출력 bitrate | 15M (고정) | 40M (동적) | ffmpeg 로그 |

### 7.1 Monitoring & Alerting
N/A (로컬 CLI). 파이프라인 로그에 성능 관련 정보 출력.

## 8. Testing Strategy

### 8.1 Unit Tests
- `pipeline-constants.ts`: 상수 값 존재 + SAM/BFS 분리 확인
- `mask-stats.ts`: 합성 RGBA 버퍼 fixture로 bbox/centroid/coverage 정확도 검증
- `export-layered.ts`: `getBitrate(resolution)` — 720p/1080p/1440p/4K 정확값 + 보간/클램프 경계값
- `validate-file-path.ts`: traversal/symlink/prefix-attack/manual-layer 거부 + 정상 경로 허용

### 8.2 Integration Tests
- 기존 `pipeline-integration.test.ts` 전수 통과
- 기존 `input-validator.test.ts` 전수 통과
- per-candidate mask 캐시 유무에 따른 `resolveExclusiveOwnership` 결과 동일성

### 8.3 Edge Case Tests
- E1~E9 시나리오별 테스트 케이스
- manual layers 입력으로 파이프라인 deterministic path 검증 (레이어 수/역할 동일)

### 8.4 Fixture Tests (신규)
- 합성 RGBA 이미지로 bg-plate fill 정확성 검증 (retention 이후)
- bitrate boundary: 720p-1, 720p, 1080p, 1440p, 4K, 4K+1 입력

## 9. Rollout Plan

### 9.1 Migration Strategy
없음.

### 9.2 Feature Flag
없음.

### 9.3 Rollback Plan
`git revert` 커밋 범위. 동작 변경 없으므로 롤백 리스크 낮음.

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| sharp | 외부 | 사용 중 | 없음 (버전 변경 없음) |
| ffmpeg | 외부 | 사용 중 | 없음 (인자만 변경) |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 병렬화 race condition | Low | High | 독립 마스크 버퍼, 공유 상태 없음. 순서 보존 검증 |
| 상수 통합 시 import 순환 | Low | Medium | `pipeline-constants.ts`는 의존성 없는 leaf 모듈 |
| SAM/BFS 임계값 혼동 | Medium | Medium | 상수명에 semantic prefix (SAM_/BFS 구분), AC-1.4 fixture 검증 |
| 4K 병렬 로딩 메모리 피크 | Medium | Medium | concurrency=4 제한, E5 문서화 |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| 중복 상수 정의 수 | 5+ (3파일) | 0 (1파일) | grep 카운트 |
| bbox/centroid 중복 코드 | 2곳 (pipeline-layers + candidate-extraction) | SAM path 1곳 (유틸) + BFS 1곳 (기존 유지) | 코드 리뷰 |
| mask 디코딩 반복 | 매 ownership 호출마다 | candidate당 1회 | 로그/테스트 |
| 테스트 통과율 | passing tests + 0 new failures | passing + N new tests, 0 new failures | vitest run |
| tsc 에러 | 3건 (기존) | 0건 | tsc --noEmit |

## 12. Open Questions

- [x] OQ-1: `research-config.ts`의 Zod default도 공유 상수 참조해야 하는가? → Yes (AC-1.3)
- [x] OQ-2: `--unsafe`로 path validation도 우회 가능하게 할 것인가? → No (NG5 위반, 보안 위험)
- [x] OQ-3: computeMaskStats를 candidate-extraction.ts에도 적용? → No (BFS label-map fast path 유지)

---
