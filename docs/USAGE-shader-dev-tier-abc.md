# Shader-Dev Tier A+B+C 사용 가이드

> **브랜치**: `experiment/shader-dev-maximal` (34 commits ahead of main)
> **완료 일자**: 2026-04-20
> **관련 문서**: `docs/prd/PRD-shader-dev-tier-abc.md`, `docs/shader-dev-manual.md`, `docs/tickets/shader-dev-tier-abc/COMPLETION-REPORT.md`

---

## 📋 목차
1. [한눈에 보기 — 이번에 추가된 것](#1-한눈에-보기)
2. [사용법 A — 브라우저에서 바로 보기](#2-사용법-a)
3. [사용법 B — mp4 영상 렌더링](#3-사용법-b)
4. [사용법 C — 새로운 효과 레이어드 모드에 적용](#4-사용법-c)
5. [사용법 D — 조합 프리셋 만들기](#5-사용법-d)
6. [사용법 E — 신규 스케치 모드 사용](#6-사용법-e)
7. [개발자용 — CLI 스크립트 레퍼런스](#7-cli-스크립트)
8. [파라미터 레퍼런스](#8-파라미터-레퍼런스)
9. [트러블슈팅](#9-트러블슈팅)
10. [알려진 이슈 + Post-Merge Follow-ups](#10-알려진-이슈)

---

## 1. 한눈에 보기

### 이번에 추가된 것 (13 기법 + 인프라)

```
┌─────────────────────────────────────────────────────────────┐
│ Tier A — layered 모드 post-FX 확장 (기존 씬에 + 효과 추가) │
│   • multipassFeedback — 피드백 루프 (warp+decay+hue-shift)  │
│   • lensDistortion    — 렌즈 왜곡 (barrel/chromatic/DoF)    │
│   • post-processing   — bloom/tone-map 체인 정돈            │
├─────────────────────────────────────────────────────────────┤
│ Tier B — 독립 스케치 3개 (이미지 없이 영상 생성)            │
│   • ?sketch=volumetric   — 라이마칭 구름/안개              │
│   • ?sketch=cellular     — Gray-Scott 반응-확산 미로 패턴   │
│   • ?sketch=particles    — 65k GPU 파티클 curl flow field   │
├─────────────────────────────────────────────────────────────┤
│ Tier C — 프랙탈 케이브 1개 (7 기법 번들)                    │
│   • ?sketch=fractal-cave — 무한 SDF 3D 씬 (Phong+AO+shadow) │
├─────────────────────────────────────────────────────────────┤
│ 인프라                                                       │
│   • scripts/shader-compile-check.ts — 셰이더 컴파일 검증     │
│   • scripts/fbo-float-spike.ts      — GPU 부동소수 텍스처    │
│   • scripts/pixel-regression.ts     — Tier A 백워드 호환     │
│   • scripts/gallery-render.ts       — 스케치/프리셋 렌더     │
│   • scripts/lib/headless-browser.ts — 공용 퍼펫티어 헬퍼     │
│   • scripts/lib/ssim.ts             — 이미지 비교 SSIM       │
└─────────────────────────────────────────────────────────────┘
```

### 활용률
- **shader-dev 스킬**: 31/31 적용 가능한 기법 (100%)
- **Tier 1 포함 총 구현**: 13 (Tier 1) + 3 (Tier A) + 3 (Tier B) + 7 (Tier C 번들) = **26개 신규 셰이더 기법**

---

## 2. 사용법 A — 브라우저에서 바로 보기

### 2.1 Dev 서버 실행

```bash
cd /Users/isaac/WebstormProjects/video-art
npm run pipeline:preview
# → http://localhost:5299
```

### 2.2 URL로 모드 전환

| 목적 | URL |
|------|-----|
| **기본 layered** (scene.json) | `http://localhost:5299/?mode=layered` |
| **특정 프리셋** | `http://localhost:5299/?mode=layered&scene=/presets/solo/T5-iq-palette.json` |
| **Tier B: 볼류메트릭** | `http://localhost:5299/?sketch=volumetric` |
| **Tier B: 셀룰러 (반응-확산)** | `http://localhost:5299/?sketch=cellular` |
| **Tier B: 파티클** | `http://localhost:5299/?sketch=particles` |
| **Tier C: 프랙탈 케이브** | `http://localhost:5299/?sketch=fractal-cave` |
| 기존 psychedelic 스케치 | `http://localhost:5299/?sketch=psychedelic` |

### 2.3 브라우저 내 녹화 (webm)
- **R** 키 → 녹화 시작
- **R** 키 → 녹화 중지 → webm 파일 다운로드

### 2.4 갤러리 페이지 (이미 렌더링된 mp4 한번에 보기)
```
http://localhost:5299/presets/solo/gallery.html
```
→ 13개 Tier 1 solo 프리뷰 iframe 그리드

---

## 3. 사용법 B — mp4 영상 렌더링

### 3.1 빠른 프리뷰 (720×1280, 5초 × 30fps = 17개 mp4 자동 렌더)

```bash
npx tsx scripts/gallery-render.ts
# 또는 스케치만:
npx tsx scripts/gallery-render.ts --sketches-only
```

**출력**: `out/shader-gallery/` 아래에:
- `T1-domain-warp.mp4` ~ `T13-baseline.mp4` (13개 Tier 1 solo)
- `sketch-cellular.mp4`, `sketch-volumetric.mp4`, `sketch-particles.mp4`, `sketch-fractal-cave.mp4` (4개 스케치)

### 3.2 실전 프로덕션 렌더 (1080×1920, 20초 풀 해상도)

```bash
# scene.json을 원하는 프리셋으로 먼저 교체 (백업 잊지 말 것)
cp public/scene.json public/scene.json.backup
cp public/presets/shader-dev-mandala-flow.json public/scene.json

# 풀 export (1080×1920, 20초, CRF 15 고품질)
npx tsx scripts/export-layered.ts --title "my-mandala-render"
# → out/archive/my-mandala-render-{timestamp}/my-mandala-render.mp4

# 복원
cp public/scene.json.backup public/scene.json
```

### 3.3 단일 프리셋/스케치만 빠르게 렌더

`scripts/gallery-render.ts` 수정 or 단독 스크립트 작성. 예:

```ts
// quick-render.ts
import { startViteServer, waitForVite, launchHeadlessBrowser, runInPuppeteerPage } from "./scripts/lib/headless-browser.js";
// ... 원하는 sketch/scene 1개만 렌더
```

---

## 4. 사용법 C — Tier A 효과를 레이어드 모드에 적용

기존 `scene.json`에 **2줄만 추가**하면 Tier A 효과 켜짐.

### 4.1 multipassFeedback (재귀 피드백 트레일)

**scene.json `effects` 블록에 추가**:
```json
{
  "effects": {
    "bloom": { "...": "..." },
    "multipassFeedback": {
      "strength": 0.7,
      "warp": 0.3,
      "decay": 0.92,
      "hueShift": 0.02
    }
  }
}
```

**파라미터 의미**:
| 키 | 범위 | 기본값 | 의미 |
|----|------|-------|------|
| `strength` | 0..0.95 | 0 (off) | 이전 프레임을 현재 프레임에 더하는 비율 |
| `warp` | 0..1 | 0.2 | 이전 프레임을 회오리 왜곡하는 강도 |
| `decay` | 0..1 | 0.9 | 이전 프레임의 감쇠율 (1=감쇠 없음) |
| `hueShift` | 0..1 | 0 | 이전 프레임의 색조 이동 |

**추천 값**:
- 부드러운 트레일: `strength: 0.5, warp: 0.1, decay: 0.95`
- 극심한 환각: `strength: 0.9, warp: 0.5, decay: 0.95, hueShift: 0.03`

### 4.2 lensDistortion (렌즈 왜곡)

```json
{
  "effects": {
    "lensDistortion": {
      "barrel": 0.2,
      "chromatic": 1.5,
      "dof": 0.3,
      "vignetteRadius": 0.9
    }
  }
}
```

| 키 | 범위 | 기본값 | 의미 |
|----|------|-------|------|
| `barrel` | -0.5..0.5 | 0 | 양수=pincushion(오목), 음수=barrel(볼록) |
| `chromatic` | 0..2 | 0 | RGB 채널 분리 (렌즈 수차) |
| `dof` | 0..1 | 0 | 반경 거리 기반 블러 |
| `vignetteRadius` | 0.5..1 | 1 (off) | 1 미만이면 비네팅 적용 |

---

## 5. 사용법 D — 조합 프리셋 만들기

### 5.1 제공된 조합 프리셋 3개

이미 `public/presets/`에 준비됨:

```bash
# Mandala Flow: polar twist + domain warp + IQ palette + rotation + bloom
http://localhost:5299/?mode=layered&scene=/presets/shader-dev-mandala-flow.json

# Sacred Geometry: SDF star + Julia + voronoi + rotate + kaleidoscope
http://localhost:5299/?mode=layered&scene=/presets/shader-dev-sacred-geometry.json

# Psychedelic Fractal: Julia deep + Worley veins + domain warp + pixelChaos
http://localhost:5299/?mode=layered&scene=/presets/shader-dev-psychedelic-fractal.json
```

### 5.2 13 솔로 프리셋 (단일 기법만 켜짐)

`public/presets/solo/T1-*.json ~ T13-*.json` — 각 프리셋은 한 기법만 극대화 → 효과 학습용.

### 5.3 수동으로 새 프리셋 만들기

1. 기존 프리셋 복사: `cp public/presets/solo/T13-baseline.json public/presets/my-combo.json`
2. `layers[].animation` 블록에 원하는 기법 uniform 추가:
   ```json
   "animation": {
     "domainWarp": 2.0,       // T1
     "polarTwist": 3.0,       // T3
     "paletteAmount": 0.6,    // T5
     "juliaAmount": 0.3       // T8
   }
   ```
3. `effects` 블록에 Tier A 효과 추가 (위 4.1-4.2 참고)
4. 브라우저에서 확인: `?mode=layered&scene=/presets/my-combo.json`

### 5.4 스키마 검증
모든 프리셋은 자동 검증됨:
```bash
npx vitest run src/lib/presets.test.ts
# → 16/16 PASS (여러분이 추가한 JSON도 자동 포함)
```

---

## 6. 사용법 E — 신규 스케치 모드

레이어드 모드(이미지 입력 필요)와 달리 **이미지 없이 절차적 생성**.

### 6.1 Volumetric (구름/안개)

**URL**: `http://localhost:5299/?sketch=volumetric`
**특징**:
- 64-step ray march + 3D fbm density field
- 애니메이션된 구름/안개 볼류메트릭 렌더
- 60fps 타겟
- 파라미터 튜닝은 `src/shaders/sketches/volumetric.frag` 직접 수정 (uniform 없음)

### 6.2 Cellular (반응-확산 미로)

**URL**: `http://localhost:5299/?sketch=cellular`
**특징**:
- Gray-Scott Reaction-Diffusion (Pearson 1993)
- "maze" regime (f=0.055, k=0.062) → 얼룩말 미로 패턴
- FBO ping-pong (256×256 float texture)
- 60fps × 20 sim step = 1200 step/sec

**다른 패턴 시도** (`src/sketches/cellular.ts` 상단 수정):
```ts
// Spots regime (점무늬)
uFeed: { value: 0.030 },
uKill: { value: 0.062 },

// Coral regime (산호)
uFeed: { value: 0.0545 },
uKill: { value: 0.062 },

// Mitosis regime (세포분열, 느림)
uFeed: { value: 0.0367 },
uKill: { value: 0.0649 },
```

### 6.3 Particles (GPU 파티클 플로우)

**URL**: `http://localhost:5299/?sketch=particles`
**특징**:
- 65,536 파티클 (256×256 position FBO)
- Curl-of-3D-fbm velocity field (divergence-free)
- Additive blending + soft alpha
- 60fps 타겟

### 6.4 Fractal Cave (Tier C 번들)

**URL**: `http://localhost:5299/?sketch=fractal-cave`
**특징**:
- Ray-marched SDF 3D 씬 (MAX_STEPS=128)
- opRep 무한 반복 공간
- smoothUnion/Subtract/Intersect CSG
- 애니메이션된 구체+박스+토러스 morphing
- Phong lighting + soft shadow + ambient occlusion
- 사이키델릭 rim fresnel
- 30fps 타겟 (오프라인 렌더 허용)

---

## 7. CLI 스크립트 레퍼런스

### 7.1 `npm run check:shaders`
모든 모드를 headless Chrome으로 로드 → 셰이더 컴파일 에러 캡처.
```bash
$ npm run check:shaders
shader-compile-check: testing 7 modes
  ✓ layered-default
  ✓ layered-baseline
  ✓ sketch-psychedelic
  ✓ sketch-cellular
  ✓ sketch-volumetric
  ✓ sketch-particles
  ✓ sketch-fractal-cave
Summary: 7/7 PASS, 0 FAIL, 0 SKIP
```
**언제 사용**: 셰이더 수정 후 반드시 실행. 컴파일 실패 조기 검출.

### 7.2 `npm run spike:fbo`
Puppeteer/ANGLE에서 `RGBA32F` float texture 지원 검증.
```bash
$ npm run spike:fbo
# 출력: { floatSupported: true, precisionError: 3.24e-8, ... }
# 결과 로그: docs/tickets/shader-dev-tier-abc/T0-b-spike-result.md
```
**언제 사용**: GPU/드라이버 변경 후 또는 particles/cellular 스케치 이상 시.

### 7.3 `npm run regress:pixel`
프리셋 시각적 일관성 검증 (SSIM ≥ 0.995 기본).
```bash
npm run regress:pixel -- --preset solo/T13-baseline
npm run regress:pixel -- --preset shader-dev-mandala-flow --threshold 0.99
```
**언제 사용**: Tier A effect 튜닝 후 기존 프리셋에 회귀가 없는지 확인.

### 7.4 `npx tsx scripts/gallery-render.ts`
17개 mp4 배치 렌더 (720×1280, 5초).
```bash
# 모든 mp4 재렌더 (~2분)
npx tsx scripts/gallery-render.ts

# 스케치 4개만
npx tsx scripts/gallery-render.ts --sketches-only
```

### 7.5 `npm run export:layered`
실전 고품질 렌더 (1080×1920, 20초, CRF 15).
```bash
# public/scene.json을 원하는 프리셋으로 먼저 교체
npx tsx scripts/export-layered.ts --title "my-render"
# → out/archive/my-render-{timestamp}/my-render.mp4
```

### 7.6 기타 (기존부터 있던 스크립트)
- `npm run pipeline` — 이미지 입력 → 레이어 분리 (Replicate API 필요)
- `npm run pipeline:pro` — 2-layer bria + flux-fill-pro 파이프라인
- `npm run analyze:track` — 오디오 트랙 FFT 분석
- `npm run acid` — AI 이미지 재해석

---

## 8. 파라미터 레퍼런스

### 8.1 Tier 1 layer.frag uniforms (`layers[].animation.*`)

| 기법 | 키 | 범위 | 기본 |
|------|----|------|------|
| T1 domain-warping | `domainWarp` | 0..3 | 0 |
| T2 domain-repetition | `tileRepeat` | 0..20 | 0 |
| T3 polar-uv twist | `polarTwist` | -10..10 | 0 |
| T4 voronoi | `voronoiScale`, `voronoiAmount` | 0..50, 0..2 | 8, 0 |
| T5 IQ palette | `paletteAmount`, `paletteA/B/C/D` | 0..1, vec3×4 | 0, IQ defaults |
| T6 2D pattern | `patternType`, `patternScale`, `patternAmount` | 0..3, 0..200, 0..1 | 0 |
| T7 SDF-2D | `sdfType`, `sdfScale`, `sdfAmount` | 0..3, 0..20, 0..1 | 0 |
| T8 Julia | `juliaAmount`, `juliaC` | 0..1, vec2 | 0, [-0.7, 0.27015] |
| T9 rotate | `rotateSpeed`, `scalePulse` | -5..5, 0..0.5 | 0, 0 |
| T10 AA | (내장 fwidth) | — | — |
| T11 bicubic | `bicubicFilter` | bool | false |
| T12 Worley | `worleyScale`, `worleyAmount` | 0..50, 0..1 | 8, 0 |

### 8.2 Tier A effect uniforms (`effects.*`)

```json
{
  "multipassFeedback": {
    "strength": 0..0.95,  "warp": 0..1,  "decay": 0..1,  "hueShift": 0..1
  },
  "lensDistortion": {
    "barrel": -0.5..0.5,  "chromatic": 0..2,  "dof": 0..1,  "vignetteRadius": 0.5..1
  }
}
```

### 8.3 기존 효과 (Tier 0 — 변경 없음)
```json
{
  "bloom":               { "strength": 0+, "radius": 0+, "threshold": 0..1 },
  "chromaticAberration": { "offset": 0+, "modulationOffset": 0..1 },
  "trails":              { "strength": 0..0.5 },
  "kaleidoscope":        { "segments": 0..12, "blend": 0..1 },
  "godRays":             { ... 8 fields ... },
  "aura":                { "intensity": 0..2, "radius": 0..0.2, ... },
  "mandala":             { "opacity": 0..1, "segments": 3..24, ... },
  "filmGrade":           { "grain": 0..0.3, "vignetteIntensity": 0..1, ... }
}
```

---

## 9. 트러블슈팅

### 9.1 검은 화면만 나옴
1. **브라우저 콘솔 확인** (F12) — `'useProgram: program not valid'` → 셰이더 컴파일 에러
2. `npm run check:shaders` 실행 → 어느 모드가 실패하는지 확인
3. 최근 셰이더 변경 되돌리기 (`git diff src/shaders/`)

### 9.2 셰이더 컴파일 실패
- 함수 선언 순서 확인 (declared before use)
- GLSL 1.0 문법 사용 (`varying`, `texture2D`, `gl_FragColor`) — 현재 프로젝트가 WebGL1 호환 모드
- 에러 메시지를 `scripts/shader-compile-check.ts`의 `ERROR_PATTERNS`와 대조

### 9.3 particles/cellular 검은 화면
1. `npm run spike:fbo` → `floatSupported: true` 확인
2. `false`면 GPU 드라이버 문제. `HalfFloatType`으로 fallback 코드 수정 필요
3. main.ts에서 `window.__renderer` 주입 확인 (line 363)

### 9.4 렌더링 매우 느림
- Fractal Cave는 ray-march 128-step이라 느림 (정상, 30fps 타겟)
- Volumetric도 64-step
- 해상도 낮추기: `sketch-configs.ts`에서 width/height 조정
- 또는 MAX_STEPS 감축: 셰이더 소스 직접 수정

### 9.5 기존 프리셋 시각 변경됨
- Tier A는 기본값 `strength=0, barrel=0` → 변화 없어야 함
- `npm run regress:pixel -- --preset {name}` 실행 → SSIM 확인
- SSIM < 0.99면 Tier A 관련 코드 수정 검토

### 9.6 gallery-render.ts 실패
- 포트 5299 사용 중: `lsof -ti:5299 | xargs kill -9`
- Vite timeout: 30초 내 응답 없으면 `waitForVite` 타임아웃. 수동으로 `npm run pipeline:preview` 먼저 성공하는지 확인

### 9.7 mp4 파일 크기 이상
- 정상: 500KB ~ 5MB (5초 720×1280 @ 30fps)
- 검정 출력: ~50KB 이하 → 셰이더 문제. check:shaders 실행
- cellular.mp4 42KB → 이전 버전 버그. 이번 수정으로 975KB 정상

---

## 10. 알려진 이슈 + Post-Merge Follow-ups

### 알려진 이슈
**없음** (이번 세션에서 T-B1 cellular 시각 튜닝까지 해결 완료).

### 권장 Post-Merge Follow-ups (non-blocking)

Boomer Production Audit에서 식별된 acceptable tech debt:

1. **Preset validation 강화** (30분, 방어적)
   - `src/lib/presets.test.ts`에 edge case 추가 (빈 animation, 누락 필드 등)

2. **GPU memory 경고** (15분, 관찰성)
   - `effect-composer.ts`의 `new THREE.WebGLRenderTarget` 실패 시 `console.warn`
   - 4K + 모든 효과 동시 시 low-end GPU OOM 대비

3. **Renderer race hardening** (20분, 견고성)
   - cellular.ts / particles.ts 의 `getRenderer()`에 `domElement.parentNode` 체크 추가

4. **Pass Factory 리팩터** (deferred, 언제든)
   - `effect-composer.ts` 627 LOC — Pass Factory 패턴 도입 시 관리 용이
   - 3+ 신규 effect 추가 예정 시 고려

### 무관한 pre-existing 실패 테스트 3개
`scripts/export-layered.test.ts`에:
- `default ffmpeg args use CRF 15 and veryslow`
- `uses yuv444p as default pix_fmt`
- `CRF range validation 0-51`

→ 이전 세션의 uncommitted `scripts/pipeline-pro.ts` 관련. **이번 PRD 스코프 무관**. 별도 세션에서 해결 필요.

---

## 11. 다음 단계 옵션

### A. 브랜치 머지 (추천)
```bash
git checkout main
git merge --no-ff experiment/shader-dev-maximal
# 또는 GitHub PR
gh pr create --base main --head experiment/shader-dev-maximal --title "feat: shader-dev Tier A+B+C (100% coverage, 31 techniques)"
```

### B. 추가 기능 (이전 제안)
1. **오디오 연동** — `analyze-track.ts` FFT → shader uniforms (가장 큰 임팩트)
2. **UI 컨트롤** — `lil-gui` 실시간 파라미터 슬라이더
3. **AI 재해석 확장** — minimax-multimodal-toolkit 연계

### C. Polish
- Post-merge follow-ups 1-4 처리
- 3 pre-existing export-layered 실패 테스트 수정

### D. 신규 프리셋/변형
- Cellular: spots/coral/mitosis regime 프리셋 3개
- Fractal-cave: 팔레트 다양화 (현재 purple 고정)
- Volumetric: aurora/nebula 테마 변형

---

## 🔖 레퍼런스

- **PRD**: `docs/prd/PRD-shader-dev-tier-abc.md` (v0.3 Approved)
- **완료 보고서**: `docs/tickets/shader-dev-tier-abc/COMPLETION-REPORT.md`
- **기법 매뉴얼**: `docs/shader-dev-manual.md`
- **티켓 상태**: `docs/tickets/shader-dev-tier-abc/STATUS.md`
- **shader-dev 스킬 원본**: `.claude/skills/shader-dev/`

---

**질문/이슈 시**: 이 문서 섹션 + 해당 `docs/tickets/shader-dev-tier-abc/T*.md` 티켓 참조.
