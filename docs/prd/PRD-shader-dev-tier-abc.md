# PRD: shader-dev Tier A + B + C — 100% Technique Coverage

**Version**: 0.3
**Author**: Isaac (via Claude Opus 4.7)
**Date**: 2026-04-20
**Status**: Approved (Phase 2 convergence: Round 1 HAS ISSUE → Round 2 PROCEED_WITH_CAUTION with ticket-scoped resolutions)
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background
`video-art`는 이미지 한 장을 사이키델릭 루프 영상(9:16, Reels)으로 변환하는 Vite + Three.js 파이프라인. Tier 1 (13/36 shader-dev 기법) 이미 구현 완료 (`experiment/shader-dev-maximal` 브랜치). 사용자가 shader-dev 스킬을 "100% 활용"하길 원함 — 사이키델릭 주제에 맞는 **프로젝트 적합 31개 기법 전체 구현**.

### 1.2 Problem Definition
현 파이프라인은 2D 레이어 기반 post-FX까지만 커버. 실시간 피드백 루프, GPU 시뮬레이션, 3D SDF 씬이 없어 표현 상한이 제한됨. shader-dev Tier A+B+C를 추가해 사이키델릭 영상 파이프라인의 **기법 coverage를 Tier 1의 36% → 86%로 확장**.

### 1.3 Impact of Not Solving
- Reels 시그니처 비주얼(피드백 트레일, 유기 생물 패턴, 3D 프랙탈 동굴) 없이 현재의 2D 셰이더 스택에 정체
- shader-dev 스킬 자원의 64% 미사용 — 향후 사이키델릭 변주 한계 도달 시 다시 설치/학습 비용 발생
- 경쟁 비주얼 아티스트 대비 프레임워크 상 차별성 부족

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: Tier A (3 기법) — 현 post-FX 체인에 multipass-buffer, camera-effects, post-processing 통합. **실시간 60fps 유지**
- [ ] G2: Tier B (3 기법) — cellular-automata, volumetric-rendering, particle-system 각 **신규 스케치**로 구현. 독립 mode로 로드 가능
- [ ] G3: Tier C (7 기법 번들) — ray-marching + sdf-3d + sdf-tricks + lighting-model + normal-estimation + shadow-techniques + ambient-occlusion (+ csg-boolean-operations 선택). **신규 스케치 `fractal-cave`** 1개로 번들 구현
- [ ] G4: 각 기법마다 **Vitest 단위 테스트** 최소 2개 (uniform 선언 + 핵심 공식/함수 존재)
- [ ] G5: 각 신규 스케치마다 **scene preset + 5초 gallery 프리뷰 mp4**
- [ ] G6: 빌드 3종 (tsc / vite build / vitest) + `out/shader-gallery/` 프리뷰 PASS로 전체 완료 증빙
- [ ] G7: `experiment/shader-dev-maximal` 단일 브랜치에서 다세션 진행, 원자적 커밋. 세션 재개 가능

### 2.2 Non-Goals
- NG1: **Tier D 기법** (atmospheric-scattering, terrain, water, voxel, sound-synthesis, fluid-simulation, path-tracing-gi, analytic-ray-tracing, procedural-noise 확장, texture-mapping-advanced) — 주제 미스매치 또는 효용 대비 비용 과다
- NG2: **main 브랜치 머지** — 이 PRD 범위는 브랜치 내 완료까지만. 머지/릴리스는 별도 결정
- NG3: **WebGPU 마이그레이션** — WebGL2 유지
- NG4: **audio 연동 기법** (sound-synthesis) — 현재 파이프라인은 analyze-track 통합이 별개 트랙
- NG5: **Next.js 마이그레이션 / React 도입** — Vite + vanilla Three.js 유지
- NG6: **소스 이미지 재생성** — 현 `public/layers/*` 유지

## 3. User Stories & Acceptance Criteria

### US-1: Layered Psychedelic 모드 강화 (Tier A)
**As an** Isaac, **I want** 현 layered-psychedelic 출력에 피드백 트레일 + 렌즈 왜곡 + 개선된 bloom 체인을 추가, **so that** 기존 16개 프리셋이 즉시 더 풍부하게 보임.

**Acceptance Criteria:**
- [ ] AC-1.1: Given 16개 기존 프리셋(solo + killer), when `pipeline:preview` → 브라우저 렌더, then **셰이더 컴파일 에러 0건** (WebGL console)
- [ ] AC-1.2: Given scene.json `effects.multipassFeedback.strength > 0`, when 렌더, then **이전 프레임의 흔적이 투명도 감쇠하며 잔상** 표시
- [ ] AC-1.3: Given `effects.lensDistortion.barrel > 0`, when 렌더, then **화면 중심에서 바깥으로 왜곡** 확인 (barrel/pincushion)
- [ ] AC-1.4: 추가된 Tier A uniform 3종은 모두 기본값 0 → **기존 프리셋 시각적 회귀 없음**

### US-2: 신규 스케치 모드 3종 (Tier B)
**As an** Isaac, **I want** cellular-automata / volumetric-rendering / particle-system을 각 독립 스케치로 실행, **so that** 이미지 없이도 순수 절차적 사이키델릭 루프를 생성.

**Acceptance Criteria:**
- [ ] AC-2.1: `http://localhost:5299/?sketch=cellular` → **reaction-diffusion** (Gray-Scott) 루프가 브라우저에서 60fps 재생. **scene.json 로드 시도 X** (main.ts `IS_LAYERED` 분기로만 scene fetch)
- [ ] AC-2.2: `http://localhost:5299/?sketch=volumetric` → **3D 안개/구름** 볼류메트릭 레이마치 렌더
- [ ] AC-2.3: `http://localhost:5299/?sketch=particles` → GPU 파티클 100k+ **플로우 필드** 애니메이션
- [ ] AC-2.4: 각 스케치 shader 파일 경로 `src/shaders/sketches/{cellular,volumetric,particles}.frag` 존재
- [ ] AC-2.5: `src/lib/sketch-registry.ts`에 3개 신규 sketch 등록 (tone mapping, postProcessing 설정 포함)
- [ ] AC-2.6: 각 스케치 최소 1개 Vitest 테스트 (shader 파일 파싱 + 핵심 uniform 존재)

### US-3: Fractal Cave 스케치 (Tier C 번들)
**As an** Isaac, **I want** ray-marching으로 SDF 3D 동굴/터널/프랙탈 씬을 하나의 스케치 `fractal-cave`로 구현, **so that** 시그니처 "사이키델릭 동굴" 영상을 이미지 없이 생성 가능.

**Acceptance Criteria:**
- [ ] AC-3.1: `http://localhost:5299/?sketch=fractal-cave` → **ray-marched SDF 씬** 60fps 렌더
- [ ] AC-3.2: 씬에 최소 3개 SDF primitive (sphere/box/torus/menger-fractal 중) + **smooth union (sdf-tricks)** 적용
- [ ] AC-3.3: **Phong/PBR 라이팅** + **soft shadow** + **AO** 적용 확인 (셰이더 소스에 해당 함수 존재)
- [ ] AC-3.4: **normal-estimation** (gradient of SDF) 사용 확인
- [ ] AC-3.5: csg-boolean (union/intersection/subtraction) 연산 사용 — 선택적으로 animated morphing
- [ ] AC-3.6: `src/shaders/sketches/fractal-cave.frag` 단일 파일 (≤600줄) + Vitest 테스트
- [ ] AC-3.7: 파일 구조 — 아래 5 섹션 JSDoc 헤더 블록 포함:
  ```glsl
  // ======================================================
  // Fractal Cave — Tier C Bundle
  // Maps: ray-marching, sdf-3d, sdf-tricks, csg-boolean-operations,
  //       normal-estimation, lighting-model, shadow-techniques, ambient-occlusion
  // ======================================================

  // [SECTION 1] SDF Primitives & CSG Boolean Ops
  float sdSphere(...) { ... }
  float sdBox(...) { ... }
  float sdTorus(...) { ... }
  float smoothUnion(...) { ... }     // sdf-tricks + csg
  float smoothSubtract(...) { ... }  // csg
  float smoothIntersect(...) { ... } // csg

  // [SECTION 2] Scene Composition (animated morph)
  float sceneSDF(vec3 p) { ... }

  // [SECTION 3] Ray Marching + Normal Estimation
  float rayMarch(...) { ... }
  vec3 calcNormal(...) { ... }  // gradient estimation

  // [SECTION 4] Lighting (Phong + soft shadow + AO)
  float softShadow(...) { ... }  // shadow-techniques
  float calcAO(...) { ... }      // ambient-occlusion
  vec3 lighting(vec3 p, vec3 n, vec3 rd) { ... }  // lighting-model

  // [SECTION 5] Main
  void main() { ... }
  ```

### US-4: 갤러리 시스템 확장
**As an** Isaac, **I want** Tier A 효과가 반영된 기존 프리셋 + Tier B/C 신규 스케치를 `out/shader-gallery/`에 mp4로 일괄 렌더, **so that** 모든 결과물을 한눈에 비교.

**Acceptance Criteria:**
- [ ] AC-4.1: `scripts/gallery-render.ts`가 신규 스케치 모드 지원 (`?sketch=` URL + layered 모드 모두) — **2단계 티켓**:
  - **4.1a**: layered 모드에서 Tier A uniforms 반영 재렌더 (기존 13개)
  - **4.1b**: sketch 모드 가젯 추가 (cellular/volumetric/particles/fractal-cave 4개 신규 렌더). scene.json 없이 duration/fps는 sketch-registry 기본값 참조
- [ ] AC-4.2: `out/shader-gallery/` **총 ≥20개 mp4** 구성:
  - 기존 13개 (Tier 1 solo 프리셋) — Tier A 적용 후 재렌더
  - Tier A before/after 비교 2쌍 = 4개 (pre-A baseline, post-A baseline, pre-A mandala, post-A mandala)
  - Tier B 신규 스케치 3개 (cellular, volumetric, particles)
  - Tier C 신규 스케치 1개 (fractal-cave)
- [ ] AC-4.3: 9:16 비율 (720×1280) 유지, 5초 duration

### US-5: 문서화 + 재현성
**As an** Isaac (또는 후임), **I want** 각 기법의 uniform/사용법이 문서화됨, **so that** 3개월 후 돌아와도 파라미터 튜닝 가능.

**Acceptance Criteria:**
- [ ] AC-5.1: `docs/shader-dev-manual.md` — Tier A+B+C 기법별 uniform 매트릭스 + scene.json 예시
- [ ] AC-5.2: 각 신규 스케치 파일 상단 JSDoc 블록 (기법 매핑 + 파라미터 설명)

## 4. Technical Design

### 4.1 Architecture Overview

```
[image] → pipeline-pro → layers + depth
               ↓
  ┌────────────────────────────────────────┐
  │ layered mode (existing + Tier A)      │
  │ layer.frag (Tier 1 done)              │
  │ ↓                                      │
  │ post chain: bloom → trails →          │
  │   [NEW] multipassFeedback →           │
  │   [NEW] lensDistortion →              │
  │   [NEW] improved post.frag            │
  └────────────────────────────────────────┘
               ↓
        output mp4

[sketch mode] — 독립 Three.js 씬 (Tier B + C)
  /?sketch=cellular    → cellular.frag       (Gray-Scott RD)
  /?sketch=volumetric  → volumetric.frag     (volume raymarch)
  /?sketch=particles   → particles.frag      (GPU particle + compute-via-tex)
  /?sketch=fractal-cave → fractal-cave.frag  (SDF raymarch + PBR + AO)
```

### 4.2 Data Model Changes
scene-schema.ts 확장 (Tier A):
```typescript
effects: {
  ...기존,
  multipassFeedback: { strength: 0..0.95, decay: 0..1, warp: 0..1 },
  lensDistortion: { barrel: -0.5..0.5, chromatic: 0..2, vignetteRadius: 0.5..1 },
  // post.frag 재설계는 기존 uniforms 내부 재배치 → 스키마 변경 없음
}
```

신규 스케치는 sceneSchema 대상 아님 (sketch-registry.ts + main.ts URL 파라미터로 로드).

### 4.3 API Design
N/A — HTTP API 없음. 모든 변경은 내부 셰이더 + 스크립트.

다만 `URL param spec` 추가:
| Param | Values | Description |
|-------|--------|-------------|
| `?sketch` | psychedelic, cellular, volumetric, particles, fractal-cave | 스케치 모드 |
| `?mode` | layered | layered psychedelic mode (기존) |
| `?scene` | /scene.json, /presets/*/*.json | layered 모드 씬 파일 경로 |

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Multipass feedback 구현 | (a) three/examples SavePass (b) 수동 ping-pong WebGLRenderTarget (c) pmndrs postprocessing + 기존 `effect-composer.ts` 패턴 | **(c)** pmndrs + 기존 feedbackTarget 확장 | **현재 `src/lib/effect-composer.ts:427`이 이미 feedbackTarget (WebGLRenderTarget) + uPrevFrame sampler + blit quad 패턴으로 trails 구현 중**. 동일 feedbackTarget을 multipassFeedback ShaderPass가 공유. SavePass 도입 시 라이브러리 중복 |
| Cellular automata 방식 | (a) Gray-Scott RD (b) Conway's Life (c) Lenia | **(a) Gray-Scott** | 사이키델릭에 가장 적합한 유기적 패턴, 연속 값이라 부드러움 |
| Volumetric 방식 | (a) front-to-back raymarch (b) back-to-front (c) hybrid | **(a) front-to-back + early termination** | 표준 + 성능 |
| Particle 저장 | (a) CPU → texture upload (b) GPU floating-point texture ping-pong (c) Transform Feedback | **(b)** FBO ping-pong | WebGL2 float texture 지원. 100k 파티클 60fps 가능 |
| Fractal Cave 구성 | (a) 단일 거대 씬 (b) 여러 작은 씬 선택 | **(a) 단일 + 모핑** | 번들 테스트 단순 + Tier C 7기법 모두 한 파일에 실증 |
| 테스트 전략 | (a) 셰이더 소스 regex (b) headless GL 유닛 (c) snapshot 이미지 | **(a) + 선택적 (b)** | Tier 1에서 확립된 regex 패턴 유지. 렌더 검증은 gallery-render.ts 프리뷰로 대체 |
| 스케치 로딩 | (a) 파일별 정적 import (b) import.meta.glob (기존 패턴) | **(b) 기존 패턴 유지** | 기존 `main.ts`가 이미 `import.meta.glob` 사용 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | Tier A uniform 기본값(0) 상태 | 기존 프리셋과 픽셀 동일 (시각적 회귀 0) | P0 |
| E2 | 신규 스케치 모드 진입 시 scene.json 불필요 | `?sketch=`만으로 로드, scene fetch 시도 X | P0 |
| E3 | multipass feedback이 프레임 0에서 읽는 이전 프레임이 미초기화 | 첫 프레임은 검정/투명 초기값 → 점차 누적. 또는 `__startCapture`의 warmup 루프 활용 | P1 |
| E4 | cellular RD 불안정 파라미터 | feed/kill 기본값을 안정 영역(0.0367/0.0649)으로 고정. UI 튜닝은 Future | P2 |
| E5 | volumetric 고해상도 성능 저하 | step count 기본 64, stride 가변. 720x1280에서 60fps 검증 | P1 |
| E6 | particle FBO 지원 안 되는 GPU | Puppeteer ANGLE에서 float texture 지원 확인. Fallback: PointsMaterial 기반 CPU 대안 | P2 |
| E7 | fractal-cave 레이마치 거리 > MAX 탈출 | `MAX_STEPS=128`로 제한 + 배경색 fallback | P1 |
| E8 | 셰이더 컴파일 실패 (GLSL 오류) | 이미 T1 세션에서 발생 → 매 티켓 headless puppeteer로 컴파일 검증 스크립트 추가 | P0 |
| E9 | gallery-render.ts 스케치 모드 호환 | scene.json 불필요 경로 분기. capture API는 그대로 | P1 |
| E10 | loop-seam (5s 루프 끝 → 처음 이음매) | 각 스케치 uniform `uTime / uLoopDuration` → TAU 정규화로 연속. 위상 불연속 금지 | P1 |
| E11 | WebGL2 미지원 브라우저 | 프로젝트는 WebGL2 전제. 감지 → 명시적 에러 메시지 | P3 |
| E12 | 세션 재개 시 중간 티켓 상태 손실 | STATUS.md + git log로 재개 지점 파악 | P1 |

## 6. Security & Permissions

### 6.1 Authentication
N/A — 로컬 렌더링 파이프라인

### 6.2 Authorization
N/A

### 6.3 Data Protection
N/A — 생성되는 mp4는 로컬 `out/` 디렉토리. 외부 전송 없음.

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| Layered mode FPS (720x1280) | ≥60fps dev 서버 | DevTools FPS meter |
| Cellular sketch FPS (512x512 sim grid) | ≥60fps | 동상 |
| Volumetric sketch FPS (64-step march) | ≥45fps | 동상 |
| Particle count @ 60fps | ≥100,000 | 동상 |
| Fractal-cave FPS (128-step march) | ≥30fps (실시간) / 오프라인 렌더 OK | 동상 |
| Gallery render 시간 (전체) | ≤15분 (720x1280 × 20개 × 5초) | `time npx tsx scripts/gallery-render.ts` |
| 빌드 시간 | ≤3s (`vite build`) | `time` |
| Test suite | ≤30s | `time vitest run src/` |

### 7.1 Monitoring & Alerting
로컬 개발 툴 전용. 배포 후 모니터링은 N/A. Puppeteer 렌더 시 console.error 캡처로 런타임 에러 감지 (gallery-render.ts에서 이미 사용).

## 8. Testing Strategy

### 8.1 Unit Tests (Vitest)
- 각 기법 새 shader 블록/파일마다 shader 소스 regex 테스트:
  - 핵심 uniform 선언
  - 핵심 함수 존재 (`float raymarch(`, `vec3 calcNormal(`, `void main()` 등)
  - 공식 패턴 (`smoothMin`, `fwidth`, `ping-pong sample`, ...)
- 스키마 확장 테스트: 새 effect 필드가 sceneSchema 통과
- 프리셋 JSON → schema 검증 (기존 presets.test.ts 자동 포함)

### 8.2 Integration Tests — **Mandatory Gate**
- **Headless compile test** (**필수, optional 아님**): `scripts/shader-compile-check.ts`
  - Vite dev 서버 띄우고 Puppeteer로 각 모드 순차 로드
    - `?mode=layered&scene=/scene.json` (default)
    - `?mode=layered&scene=/presets/solo/T13-baseline.json` (minimal)
    - `?sketch=cellular`, `?sketch=volumetric`, `?sketch=particles`, `?sketch=fractal-cave` (신규 스케치들)
  - 각 페이지 로드 후 3초 안정화 → `page.on('console', 'pageerror')` 수집
  - 검출 패턴: `'program not valid'`, `'compile failed'`, `'no matching overloaded function'`, `'undeclared identifier'`
  - 1개라도 검출 시 non-zero exit + 에러 로그 출력
  - **각 Tier 완료 전 필수 실행**. `package.json` script: `"check:shaders": "tsx scripts/shader-compile-check.ts"`
  - Vitest에 넣지 않음 (Puppeteer spawn 비용 큼, CI/로컬 manual 게이트)
- **Backward-compat pixel snapshot** (필수): Tier A 적용 전/후 baseline + mandala 2개 프리셋 렌더 후 SSIM/diff 검증
  - `scripts/pixel-regression.ts` — Tier A uniform=0 상태로 렌더 → main branch와 pixel diff ≤ 0.5% 확인

### 8.3 Edge Case Tests
- E1: 기존 프리셋 모두 Tier A uniform=0 상태로 schema 검증 PASS
- E3: multipass feedback 초기화 — 첫 프레임 캡처 후 검정/초기 상태 확인
- E10: 루프 seam — 스케치 frame[0] vs frame[149] 픽셀 diff 확인 (선택적 snapshot)
- E7: fractal-cave MAX_STEPS 제한 확인 (shader regex)

## 9. Rollout Plan

### 9.1 Migration Strategy
- scene-schema 확장은 **backward-compatible** (기본값 0). 기존 프리셋 마이그레이션 불필요.
- `out/` 디렉토리 결과물 지속. 빌드 산출물 영향 없음.

### 9.2 Feature Flag
N/A — 내부 플래그 없음. 모든 효과는 uniform amount=0으로 OFF 가능.

### 9.3 Rollback Plan
브랜치 작업이므로 `git checkout main` 으로 전체 롤백. 티켓 단위 revert는 `git revert <sha>`.

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| Three.js r172 EffectComposer | (외부 라이브러리) | Stable | None |
| `three/examples/jsm/postprocessing/SavePass` | 동상 | Stable | multipass-buffer 구현 차단 |
| Puppeteer WebGL2 (ANGLE) | 로컬 | OK | gallery 렌더 차단 |
| WebGL2 float texture (RGBA32F) | 브라우저 | 지원 필요 | particle 구현 영향 (fallback plan E6) |
| Tier 1 완료 상태 | self | ✅ | 기반 전제 |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| R1: 다세션 컨텍스트 유실 | HIGH | MED | STATUS.md 자주 갱신, 커밋 세분화 |
| R2: 신규 스케치 셰이더 컴파일 오류 (Tier 1과 동일한 이슈) | MED | HIGH | **T0-infra 티켓**: `scripts/shader-compile-check.ts` — Puppeteer headless GL로 각 스케치 모드 로드 → console.error 캡처 → `'program not valid'` 검출 시 non-zero exit. 각 Tier 완료 전 실행. 구현 위치: 신규 스크립트 (Vitest와 별도, 실행 시간 크므로) |
| R3: FBO ping-pong 구현 복잡도 과소 평가 | MED | HIGH | Three.js `WebGLRenderTarget` + SavePass 공식 패턴 엄수. 커스텀 ping-pong 스스로 쓰지 않음 |
| R4: fractal-cave 7 기법 한 파일에 몰아 유지보수성 악화 | MED | MED | 파일 상단 JSDoc 섹션화, 기법별 블록 주석 |
| R5: Puppeteer ANGLE에서 WebGL2 float texture 미지원 | LOW | HIGH | 첫 particle 티켓에서 headless 렌더 성공 여부 early validate |
| R6: 60fps 성능 목표 미달 (특히 volumetric + raymarch) | MED | MED | 기본 step count 보수적으로 (64/128). Isaac 튜닝 권한 UI 제공은 out of scope |
| R7: 기존 Tier 1 프리셋의 시각적 회귀 | LOW | HIGH | Tier A uniform 기본값 0 강제. Vitest에 schema 검증으로 기본값 pin |
| R8: 브랜치에 너무 많은 미관련 uncommitted 파일 공존 | HIGH | LOW | 기존 uncommitted (pipeline-pro.ts, layer PNGs 등) 건드리지 않음. 신규만 커밋 |
| R9: fractal-cave.frag 파일 비대화 (7기법 집약) | MED | LOW | **상한 600줄**. 초과 시 `fractal-cave-sdf.glsl` / `fractal-cave-lighting.glsl` 분리 (vite-plugin-glsl 지원). 파일 상단 JSDoc 섹션 테이블 필수 |

### 10.3 Performance Validation Plan
1. **Baseline measurement** (Session 1 start): 현 `layered-psychedelic` 모드 @ 720×1280 FPS 측정 (DevTools Performance tab) — 기준점
2. **Tier A incremental**: 각 Tier A effect 추가 후 FPS 재측정. 55fps 이하 낙폭 시 파라미터 조정 (샘플 수 감축 등)
3. **Sketch performance targets**:
   - cellular: 60fps @ 512×512 RD grid, 720×1280 출력
   - volumetric: 45fps @ 64-step march, 720×1280
   - particles: 60fps @ 65,536 파티클 (256×256 position FBO)
   - fractal-cave: 30fps @ 128-step march (오프라인 렌더 허용)
4. **Fallback**: 타겟 미달 시 해당 스케치 JSDoc에 "requires RGBA32F + WebGL2" 명시 + 스텝/샘플 감축
5. **Measurement tool**: Chrome DevTools FPS meter (수동) + `scripts/perf-probe.ts` (자동 평균 FPS 측정, 선택)

### 10.4 FBO Float Texture Spike (Pre-Tier-B)
T0-infra-2 티켓으로 Tier B 시작 전 실행:
1. Puppeteer + ANGLE에서 `WebGLRenderTarget({ type: THREE.FloatType, format: THREE.RGBAFormat })` 할당
2. 벡터 값 write → 다시 read → 원본과 동일 여부 확인
3. 실패 시 대안: HalfFloatType 사용. 정밀도 부족 시 CPU position buffer 업로드 (속도 trade-off 감수)
4. 성공 시 particles/cellular에서 float FBO 사용 안전 확정

### 10.5 Session & State Management
- **STATUS.md 갱신 규칙**: 각 티켓 완료 시 구현 코드 + STATUS.md를 **같은 커밋**에 포함 (원자성)
- **커밋 메시지 prefix**: `feat(shader-{tier}): {T{N}} {summary}` 유지
- **세션 재개 프로토콜**: 새 세션 시작 시 (1) `git log --oneline experiment/shader-dev-maximal ^main` 확인 → (2) `docs/tickets/shader-dev-tier-abc/STATUS.md` 읽기 → (3) 마지막 Done 티켓 바로 다음부터 이어감
- **Tier 경계 커밋**: 각 Tier 완료 시 별도 완료 커밋 (`chore: Tier A complete`) — 롤백 지점 확보
- **Gallery HTML 로드 완화**: `<iframe loading="lazy">` 유지 (이미 적용) + Tier B/C 스케치는 iframe 대신 mp4 직접 로드 (20+ 동시 WebGL context 부담 회피)

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| shader-dev 기법 커버리지 (프로젝트 적합 31/36 대비) | 13/31 (42%) | 31/31 (100%) | 수동 체크리스트 |
| 신규 스케치 개수 | 0 | 4 (cellular, volumetric, particles, fractal-cave) | `ls src/shaders/sketches/` |
| 테스트 수 | 158 (현재) | ≥200 | `vitest run src/ --reporter=verbose` |
| 갤러리 mp4 파일 수 | 13 | ≥20 | `ls out/shader-gallery/*.mp4 \| wc -l` |
| 빌드 3종 PASS | ✅ | 유지 | CI 스크립트 |
| 60fps 달성 모드 수 (5모드 중) | 1 (layered) | 4 (layered + cellular + particles + volumetric) | DevTools FPS |
| PRD → 구현 AC 만족률 | N/A | 100% | Phase 6 guardian 검증 |

## 12. Open Questions

- [x] OQ-1: Tier C에 **csg-boolean-operations** 포함? — **결론 확정**: fractal-cave.frag 내부에 `smoothUnion / smoothSubtract / smoothIntersect` **함수 3종 모두 정의 + 최소 1개 이상 사용**. 이 3종 함수가 소스에 존재하면 "csg-boolean-operations 기법 활용 PASS"로 간주 (테스트 regex로 검증).
- [x] OQ-2: Tier A의 multipass-buffer를 기존 `trails` 효과와 **합칠지 / 별개 유지**? — **결론 확정**: **별개 ShaderPass 유지**, **동일 feedbackTarget 공유**. `trails`는 단순 `mix(current, prev, strength)` 유지. `multipassFeedback`은 `prevFrame`을 warp (radial/swirl) + hue-shift + decay로 샘플링한 후 current와 accumulate. Uniform 충돌 없음 (`uTrailStrength` vs `uFeedbackStrength/uFeedbackWarp/uFeedbackDecay`). **실제 코드 pass 순서** (effect-composer.ts 파일 순): `RenderPass → aura → godRays → mandala → bloom/chromaticAberration (EffectPass) → kaleidoscope → filmGrade → trails → lensDistortion → multipassFeedback`. trails/lensDistortion/multipassFeedback은 **체인 끝**에 위치하여 scene + 모든 screen-space FX의 누적 결과를 feedback loop로 받음. blit quad가 마지막에 feedbackTarget으로 복사.
- [ ] OQ-3: particle sketch의 파티클 수 UI로 노출? **Default: 고정 65,536 (256×256 FBO). 프리셋으로 파라미터 조정만.**
- [ ] OQ-4: fractal-cave에 PBR vs Phong? **Default: Phong 선택 (비용/간결성) + rim/fresnel 계열로 사이키델릭 톤 강조.**
- [ ] OQ-5: 세션 경계 분할 — 세션 1 (Tier A 완주), 세션 2 (Tier B 3개), 세션 3 (Tier C), 세션 4 (갤러리/문서/Phase 6-7). **Default: 이 분할 채택.**
- [ ] OQ-6: 갤러리에 Tier A 비교용 before/after 렌더 추가? **Default: YES — 기존 `solo/T13-baseline.json`을 `T13-baseline-pre-A.json` + `T13-baseline-post-A.json` 2버전으로 제공.**

---

<!-- 해당 없는 섹션은 "N/A" 로 표시 -->
