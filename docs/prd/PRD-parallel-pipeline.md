# PRD: Parallel Pipeline — .work/ 격리 아키텍처

**Version**: 0.2
**Author**: Claude
**Date**: 2026-04-02
**Status**: Approved
**Size**: L

---

## 1. Problem Statement

### 1.1 Background
현재 파이프라인(`pipeline-pro.ts` → `export-layered.ts`)은 `public/` 디렉토리를 전역 상태로 사용한다.
`pipeline-pro.ts`가 `public/layers/` + `public/scene.json`에 쓰고, `export-layered.ts`가 Vite를 port 5299에 띄워서 같은 `public/`을 서빙한다.

### 1.2 Problem Definition
2개 이상의 파이프라인을 병렬 실행하면 `public/` 디렉토리에서 경쟁 조건이 발생하여, 두 번째 실행이 첫 번째의 레이어를 덮어쓰고 동일한 영상이 출력된다.

### 1.3 Impact of Not Solving
- 이미지 여러 장을 한번에 처리할 수 없어 작업 시간이 선형으로 증가
- `npm run publish`를 병렬로 돌리면 데이터 손실(첫 번째 결과 덮어쓰기) 발생

## 2. Goals & Non-Goals

### 2.1 Goals
- [x] G1: `npm run publish` 2개 이상을 동시에 실행해도 각각 독립적으로 정상 동작
- [x] G2: 각 실행이 고유한 작업 디렉토리(`.work/{run-id}/`)를 사용하여 격리
- [x] G3: 각 Vite 인스턴스가 고유 포트를 사용하여 충돌 없음
- [x] G4: 실행 완료 후 `.work/{run-id}/` 자동 정리
- [x] G5: `public/` 디렉토리 의존성 완전 제거 (레거시 코드 정리)

### 2.2 Non-Goals
- NG1: dev 모드(`npm run dev`)의 라이브 프리뷰 변경 — dev는 기존대로 `public/` 사용
- NG2: research 파이프라인 병렬화 — 별도 스코프
- NG3: 분산 시스템/큐 기반 처리 — 로컬 병렬 실행만

## 3. User Stories & Acceptance Criteria

### US-1: 병렬 파이프라인 실행
**As a** 크리에이터, **I want** 여러 이미지를 동시에 파이프라인에 넣고 싶다, **so that** 대기 시간 없이 배치 처리할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: 2개의 `npm run publish` 프로세스를 동시에 실행하면, 출력 MP4의 SHA256 해시가 서로 다르다
- [ ] AC-1.2: 각 프로세스가 `out/{type}/{date}_{title}/_work/` 디렉토리에서 독립적으로 동작한다
- [ ] AC-1.3: 각 Vite 인스턴스가 서로 다른 포트(5300-5399)를 사용한다
- [ ] AC-1.4: 성공 완료 후 `_work/` 디렉토리가 자동 삭제된다
- [ ] AC-1.5: 동일 `--title`로 동시 실행 시 archive 디렉토리가 충돌하지 않는다 (run-id suffix)

### US-2: dev 모드 호환
**As a** 개발자, **I want** `npm run dev`로 실시간 프리뷰를 볼 수 있다, **so that** 셰이더 개발 워크플로우가 유지된다.

**Acceptance Criteria:**
- [ ] AC-2.1: `npm run dev` + `/?mode=layered`가 기존과 동일하게 동작한다
- [ ] AC-2.2: dev 모드는 `public/scene.json` + `public/layers/`를 계속 사용한다

### US-3: 레거시 정리
**As a** 개발자, **I want** `public/` 하드코딩이 export/pipeline 코드에서 제거된다, **so that** 코드가 깨끗하고 의도가 명확하다.

**Acceptance Criteria:**
- [ ] AC-3.1: `export-layered.ts`에서 `public/scene.json` 직접 참조가 없다
- [ ] AC-3.2: `pipeline-pro.ts`에서 `public/layers/` 직접 쓰기가 파이프라인 모드에서 없다
- [ ] AC-3.3: 데드코드/미사용 import 없음

## 4. Technical Design

### 4.1 Architecture Overview

```
Before (전역 상태):
  pipeline-pro → public/ ← Vite:5299 ← Puppeteer
  pipeline-pro → public/ ← Vite:5299 ← Puppeteer  ❌ 충돌

After (격리 — archive 내 _work/):
  pipeline-pro → out/.../run-A/_work/ ← Vite:5312 ← Puppeteer
  pipeline-pro → out/.../run-B/_work/ ← Vite:5347 ← Puppeteer  ✅

dev 모드 (변경 없음):
  npm run dev → public/ ← Vite:5173 ← Browser
```

**작업 디렉토리 구조 (archive 내 _work/):**
```
out/layered/{date}_{title}/
├── _work/                  ← 렌더링 중 Vite가 서빙 (완료 후 삭제)
│   ├── scene.json
│   └── layers/
│       ├── layer-0.png
│       ├── layer-1.png
│       └── depth.png
├── {title}.mp4             ← 고해상도 렌더링 결과
├── {title}-instagram.mp4   ← Instagram 최적화
├── layers/                 ← 스냅샷 (archive용)
└── scene.json              ← 스냅샷 (archive용)
```

**run-id 생성:** `crypto.randomUUID().substring(0, 8)` — 충분한 엔트로피, 동시 실행 시 충돌 없음.

### 4.2 Data Model Changes
N/A — 파일시스템 구조 변경만

### 4.3 API Design (CLI Interface)

| Script | 새 Flag | 설명 |
|--------|---------|------|
| `pipeline-pro.ts` | `--work-dir <path>` | 출력 디렉토리 (기본: `public/`) |
| `export-layered.ts` | `--work-dir <path>` | 소스 디렉토리 (기본: `public/`) |
| `publish.ts` | (내부 생성) | archive 내 `_work/` 자동 생성/전달/정리 |
| `pipeline.ts` | `--work-dir <path>` | 하위 스크립트에 전달 |

**dev 모드**: `--work-dir` 미지정 시 기존대로 `public/` 사용 → 하위 호환성 유지.

**Vite publicDir 동적 변경 방식:**
```typescript
// vite.config.ts — 환경변수로 publicDir 오버라이드
export default defineConfig({
  publicDir: process.env.VITE_PUBLIC_DIR || "public",
  // ...
});

// export-layered.ts — env 전달
execFile("npx", ["vite", "--port", String(port)], {
  cwd: projectRoot,
  env: { ...process.env, VITE_PUBLIC_DIR: workDir },
});
```

**포트 할당:**
```typescript
// net.createServer로 바인드 가능 여부 테스트, 최대 5회 재시도
async function findAvailablePort(min = 5300, max = 5399, retries = 5): Promise<number>
```

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 격리 단위 | (A) 프로젝트 루트 `.work/` (B) archive 내 `_work/` | B: archive 내 `_work/` | archive와 생명주기 동일, 기존 archive.ts 호환 |
| 포트 할당 | (A) 랜덤 (B) 포트 0(OS 할당) (C) net.createServer 테스트 | C: 바인드 테스트 | 충돌 보장 제거, 5300-5399 범위 내 |
| Vite publicDir | (A) CLI flag (미지원) (B) 환경변수 + config | **B: env 변수** | Vite CLI에 `--publicDir` 없음. `VITE_PUBLIC_DIR` env로 전달 |
| run-id 생성 | (A) Math.random (B) crypto.randomUUID | **B: crypto** | 충분한 엔트로피, 동시 실행 시 충돌 방지 |
| dev 호환 | (A) dev도 _work 사용 (B) dev는 public 유지 | B: dev는 public 유지 | 기존 워크플로우 보존, HMR 호환 |
| 정리 전략 | (A) 즉시 삭제 (B) TTL 기반 (C) 성공 시 삭제 | C: 성공 시 삭제 | 실패 시 디버깅 가능 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | 포트 충돌 (동시 실행 시 같은 포트) | `net.createServer` 바인드 테스트 + 최대 5회 재시도 | Medium |
| E2 | 파이프라인 중간 실패 (Ctrl+C) | `_work/` 잔존. SIGINT/SIGTERM 핸들러로 Vite 프로세스 종료 보장. 수동 삭제 안내 | Medium |
| E3 | 디스크 공간 부족 | 에러 메시지 + `_work/` 정리 시도 (최대 3회) | Medium |
| E4 | --work-dir 없이 export-layered 실행 | `public/` 사용 (하위 호환) | Low |
| E5 | dev 모드에서 public/scene.json 없음 | 기존과 동일 에러 메시지 | Low |
| E6 | 동일 `--title`로 2개 동시 실행 | run-id가 다르므로 archive 디렉토리 충돌 없음. `{date}_{title}-{run-id}/` 형식 | High |
| E7 | 이전 실행의 stale `_work/` 존재 | 새 실행 시작 시 해당 archive의 `_work/` 감지 → 경고 로그 + 무시 (새 _work/ 생성) | Low |
| E8 | Vite 프로세스 종료 지연 | `kill(SIGTERM)` → 2초 대기 → `kill(SIGKILL)` 강제 종료 | Medium |

## 6. Security & Permissions

### 6.1 Authentication
N/A

### 6.2 Authorization
N/A

### 6.3 Data Protection
- `_work/` 디렉토리는 `out/` 하위에 위치하며, `out/`이 이미 `.gitignore`에 포함
- 임시 파일에 민감 데이터 없음 (이미지 + JSON config만)
- run-id는 `crypto.randomUUID()` 사용 — 예측 불가, 충돌 없음

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 병렬 2개 실행 총 시간 | < 순차 2개의 1.2배 | 수동 타이머 |
| 단일 실행 오버헤드 | < 3초 추가 | .work 생성/삭제 시간 |
| 포트 할당 재시도 | < 2회 평균 | 로그 |

### 7.1 Monitoring & Alerting
N/A — CLI 도구, 로그 출력으로 충분

## 8. Testing Strategy

### 8.1 Unit Tests
- `getRandomPort()`: 범위 내 포트 반환 확인
- `createWorkDir()`: 고유 디렉토리 생성 확인
- `cleanupWorkDir()`: 디렉토리 삭제 확인
- Vite `publicDir` 설정이 work-dir을 정확히 가리키는지

### 8.2 Integration Tests
- `pipeline-pro.ts --work-dir` 실행 시 해당 디렉토리에 레이어 생성 확인
- `export-layered.ts --work-dir` 실행 시 해당 디렉토리에서 scene.json 로드 확인

### 8.3 Edge Case Tests
- 동시 2개 실행 시 서로 다른 포트 사용 확인
- 실패 시 .work/ 잔존 확인 (삭제 안 됨)
- --work-dir 미지정 시 public/ 폴백 확인

## 9. Rollout Plan

### 9.1 Migration Strategy
1. `.work/` 인프라 코드 추가
2. `pipeline-pro.ts`에 `--work-dir` 옵션 추가 (기본값 `public/`)
3. `export-layered.ts`에 `--work-dir` + 동적 포트 추가
4. `publish.ts`에서 `.work/` 자동 생성/전달/정리
5. `pipeline.ts`에서 `--work-dir` 전달
6. 레거시 하드코딩 정리
7. `.gitignore`에 `.work/` 추가

### 9.2 Feature Flag
N/A — `--work-dir` 미지정 시 기존 동작 유지가 사실상 feature flag

### 9.3 Rollback Plan
`--work-dir` 제거하고 기존 `public/` 경로 복원 — 모든 변경이 additive

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| Vite `--publicDir` CLI flag 지원 | Vite | 미확인 | Vite config 파일 동적 생성으로 대체 |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Vite가 CLI로 publicDir 변경을 지원하지 않음 | **확정** | Medium | **환경변수 `VITE_PUBLIC_DIR`로 해결 (vite.config.ts 수정)** |
| Puppeteer + Vite 포트 경합 | Low | Medium | `net.createServer` 바인드 테스트 + 5회 재시도 |
| Vite 시작 오버헤드 (매 실행마다 새 프로세스) | Medium | Low | 측정 후 허용 범위 확인. 향후 Vite 제거 가능 (스코프 외) |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| 병렬 실행 가능 여부 | 불가 | 2+ 동시 가능 | 수동 테스트 |
| 단일 실행 정상 동작 | 정상 | 정상 유지 | 자동 테스트 |
| 레거시 코드 제거 | public/ 하드코딩 5곳+ | 0 (export/pipeline) | grep 확인 |

## 12. Open Questions

- [x] OQ-1: Vite의 `publicDir`를 CLI에서 동적으로 변경할 수 있는가? → **CLI 미지원. 환경변수 `VITE_PUBLIC_DIR` + vite.config.ts 수정으로 해결**
- [x] OQ-2: `research/pipeline-runner.ts`도 마이그레이션 대상인가? → **NG2로 제외. 동일 문제 있지만 별도 스코프**
- [x] OQ-3: `.work/` 위치를 프로젝트 루트 vs archive 내 중 어디? → **archive 내 `_work/` 선택. `out/`이 이미 gitignored, 생명주기 동일**
