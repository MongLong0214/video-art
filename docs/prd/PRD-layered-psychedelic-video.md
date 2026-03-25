# PRD: Layered Psychedelic Video Generator

**Status**: Approved
**Version**: 0.3
**Size**: L
**Date**: 2026-03-25

---

## 1. Overview

원본 이미지 1장을 입력하면 AI 레이어 분해 → 후처리 → 프로그래밍적 애니메이션 → 영상 출력까지 자동화하는 파이프라인.
매번 다른 이미지를 넣지만 동일한 사이키델릭 톤앤매너의 무한 루프 영상을 생성한다.

### Target Output Spec
- 해상도: 1080x1080 (YouTube Shorts/Instagram 호환)
- FPS: 30
- 길이: 20초 (seamless infinite loop)
- 코덱: H.264 mp4 (YouTube 업로드 품질)
- 비트레이트: 10-20 Mbps

### Input Spec
- 포맷: PNG, JPG, WEBP
- 최대 해상도: 4096x4096 (초과 시 자동 리사이즈)
- 최대 파일 크기: 20MB
- 색공간: sRGB (CMYK 자동 변환)
- 수동 레이어 입력 지원: `layers/` 폴더에 직접 RGBA PNG를 넣으면 Step 1 건너뜀

---

## 2. User Stories

| # | Story | Priority |
|---|-------|----------|
| US1 | 사용자가 PNG/JPG 이미지를 넣으면 Replicate API로 RGBA 레이어가 자동 분해된다 | P0 |
| US1b | 사용자가 수동으로 레이어 PNG를 넣으면 API 없이 파이프라인 진행 | P1 |
| US2 | 분해된 레이어가 후처리된다 (알파 정리, 노이즈 제거, 구멍 메우기, 순서 정리) | P0 |
| US3 | 후처리된 레이어 결과를 사용자가 검수할 수 있다 (브라우저 미리보기) | P0 |
| US4 | 레이어별 사이키델릭 애니메이션이 자동 적용된다 (색순환, 웨이브, 글로우, 반짝임, 패럴랙스) | P0 |
| US5 | 애니메이션이 20초 기준 seamless loop으로 동작한다 | P0 |
| US6 | 브라우저에서 실시간 미리보기로 검수할 수 있다 | P0 |
| US7 | 최종 영상이 YouTube 업로드 품질의 mp4로 출력된다 | P0 |
| US8 | 전체 파이프라인이 CLI 명령어로 자동화된다 | P1 |

---

## 3. Architecture

### 3.1 파이프라인 흐름

```
[원본 이미지 (PNG/JPG)]
        │
        ▼
┌─────────────────────┐
│ Step 1: Layer Split  │  Replicate API (qwen/qwen-image-layered)
│ - 4~6 RGBA layers   │  Node.js (src/lib/image-layered.ts)
│ - 또는 수동 layers/  │  (수동 입력 시 건너뜀)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Step 2: Post-Process │  Node.js (sharp)
│ - Alpha edge cleanup │  src/lib/postprocess.ts
│ - Noise removal      │
│ - Hole filling       │  (alpha dilate — 콘텐츠 복원 아님)
│ - Layer ordering     │
│ - scene.json 자동생성│
└─────────┬───────────┘
          │
          ▼
    [사용자 검수 #1]     브라우저 레이어 미리보기
          │
          ▼
┌─────────────────────┐
│ Step 3: Animate      │  Three.js + GLSL Shaders
│ - Multi-plane stack  │  src/sketches/layered-psychedelic.ts
│ - Per-layer shaders  │  src/shaders/layer.frag
│ - Global postprocess │  postprocessing (npm)
│ - Sparkle (procedural)│
│ - Seamless loop (20s)│
└─────────┬───────────┘
          │
          ▼
    [사용자 검수 #2]     브라우저 실시간 미리보기 (30fps)
          │
          ▼
┌─────────────────────┐
│ Step 4: Export       │  Frame-by-frame PNG capture
│ - Clock deterministic│  → ffmpeg → H.264 mp4
│ - Puppeteer headless  │  1080x1080, 30fps, 10-20 Mbps
│ - gl.readPixels/frame│
│ - 600 frames (20s)   │
└─────────────────────┘
          │
          ▼
    [output/{name}-{timestamp}.mp4]
```

### 3.2 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 레이어 분해 | Replicate API (`qwen/qwen-image-layered`) | 환경변수 `REPLICATE_API_TOKEN` |
| 후처리 | Node.js + `sharp` | Python 제거, 단일 런타임 |
| 씬 정의 | scene.json (자동 생성 + 프리셋 오버라이드) | |
| 렌더링 | Three.js Multi-plane stack | 레이어별 PlaneGeometry + ShaderMaterial |
| 포스트프로세싱 | `postprocessing` npm 패키지 (v6.39+) | Bloom, ChromaticAberration. three 0.172 비호환 시 Three.js built-in EffectComposer 폴백 |
| 파티클/반짝임 | Fragment shader procedural | 별도 geometry 불필요 |
| 영상 출력 | Puppeteer headless + Frame-by-frame PNG → ffmpeg → mp4 | 무손실 경로 |
| CLI | Node.js scripts | |

### 3.3 멀티 레이어 렌더링 전략

**Multi-plane stack + Global EffectComposer:**

```
Scene
├── PlaneGeometry (z=0) — layer-0 (background)  ← ShaderMaterial + layer texture
├── PlaneGeometry (z=1) — layer-1 (subject)      ← ShaderMaterial + layer texture
├── PlaneGeometry (z=2) — layer-2 (detail)        ← ShaderMaterial + layer texture
├── PlaneGeometry (z=3) — layer-3 (foreground)    ← ShaderMaterial + layer texture
└── (sparkle overlay — procedural in final pass)

Camera: OrthographicCamera

Per-layer ShaderMaterial:
  - uTexture: layer PNG
  - uTime: normalized loop time
  - uColorCycle: { speed, hueRange }
  - uWave: { amplitude, frequency }
  - uGlow: { intensity, pulse }
  - uParallax: { depth, autoOffset }

Global EffectComposer (postprocessing npm):
  - BloomEffect (strength, radius, threshold)
  - ChromaticAberrationEffect (offset)
  - Sparkle (custom Effect — procedural fragment)
```

기존 `Sketch` 인터페이스(`scene`, `camera`, `update`, `resize`, `dispose`)와 호환.
기존 `createPsychedelic` 스케치는 별도 유지 — 새 `createLayeredPsychedelic` 스케치 추가.

### 3.4 영상 출력 전략: Frame-by-frame Capture

```
1. Vite dev 서버 자동 기동 (백그라운드)
2. Puppeteer headless Chrome으로 페이지 로드
3. Recording mode: Clock.startRecording() → dt = 1/30s 고정
4. 매 프레임: renderer.render() → gl.readPixels() → PNG buffer → 디스크 저장
5. 600 프레임 (20s × 30fps) 순차 저장: output/frames/frame-0001.png
6. ffmpeg -framerate 30 -i frame-%04d.png -c:v libx264 -pix_fmt yuv420p -b:v 15M output.mp4
7. 프레임 폴더 자동 정리 (--keep-frames 플래그로 보존 가능)
```

WebM 이중 압축 없이 PNG → H.264 직행. 기존 `Clock`의 deterministic mode 활용.

### 3.5 scene.json 스키마

```json
{
  "version": 1,
  "source": "input.png",
  "resolution": [1080, 1080],
  "duration": 20,
  "fps": 30,
  "layers": [
    {
      "id": "background",
      "file": "layers/layer-0.png",
      "zIndex": 0,
      "opacity": 1.0,
      "blendMode": "normal",
      "position": [0, 0],
      "scale": 1.0,
      "anchor": [0.5, 0.5],
      "bounds": { "x": 0, "y": 0, "width": 1080, "height": 1080 },
      "animation": {
        "colorCycle": { "speed": 0.3, "hueRange": 360, "period": 20 },
        "wave": { "amplitude": 5, "frequency": 0.5, "period": 10 },
        "parallax": { "depth": 0.0 },
        "glow": { "intensity": 0.0, "pulse": 0.0, "period": 5 }
      }
    }
  ],
  "effects": {
    "bloom": { "strength": 0.6, "radius": 0.4, "threshold": 0.7 },
    "chromaticAberration": { "offset": 1.5 },
    "sparkle": { "count": 80, "sizeMin": 2, "sizeMax": 6, "speed": 1.0 }
  }
}
```

**단위 규약**: position/bounds는 픽셀(px). scale은 배율. period는 초(s). 모든 period는 20의 약수.
**자동 생성**: Step 2에서 레이어 분석 후 자동 생성. 사용자는 scene.json을 수동 편집하여 오버라이드 가능.

### 3.6 API 키 관리

- 환경변수: `REPLICATE_API_TOKEN` (`.env` 파일)
- `.env`는 `.gitignore`에 포함
- 코드에 비밀값 하드코딩 금지
- 키 미설정 시 명확한 에러 메시지 출력

### 3.7 CLI 인터페이스

```bash
npm run pipeline <input.png>          # 전체 파이프라인 (Step 1→4)
npm run pipeline:layers <input.png>   # Step 1+2만 (레이어 분해 + 후처리)
npm run pipeline:preview              # Step 3 (브라우저 미리보기, vite dev)
npm run pipeline:export               # Step 4 (프레임 캡처 → mp4)
```

---

## 4. Animation Effects (참조 영상 기반)

| 효과 | 설명 | 적용 대상 | Period |
|------|------|----------|--------|
| **Color Cycling** | HSL hue를 시간에 따라 회전. 레이어별 속도/범위 차등 | 모든 레이어 | 20s |
| **Wave Distortion** | UV를 sin/cos로 미세 왜곡. 물결/숨쉬기 효과 | 배경 + 주요 오브젝트 | 10s |
| **Glow/Bloom** | 밝은 영역에 후광. `postprocessing` BloomEffect | 글로벌 | - (정적) |
| **Sparkle** | procedural fragment shader 반짝임 | 글로벌 오버레이 | 4s |
| **Parallax** | 레이어 z-depth에 따라 자동 미세 이동 | 레이어별 | 20s |
| **Chromatic Aberration** | RGB 채널 미세 오프셋 | 글로벌 | - (정적) |

### Color Palette (24색)

| 그룹 | 색상 |
|------|------|
| 딥 섀도우/배경 | `#0E2329`, `#403E70`, `#65341B` |
| 웜 베이스/건축/피부톤 | `#CA7D6E`, `#D8AE9C`, `#A36E23`, `#DF8E2B` |
| 쿨 글로우/하늘/광선 | `#186785`, `#179ADA`, `#6DCEE5` |
| 몽환 보라 | `#6459C0`, `#B091EA`, `#968CA3` |
| 그린/라임 발광 | `#20861A`, `#42C82F`, `#6FDE7C`, `#C5D556` |
| 강한 포인트 | `#C034BB`, `#BD1E17`, `#2EB495`, `#E4E5E2` |
| 중간톤 | `#974A67`, `#6B886B`, `#A8DDB2` |

이 팔레트는 색순환 시 hue shift 범위와 글로우 색상 선택에 사용.
Sparkle 파티클 색상도 이 팔레트에서 랜덤 샘플링.

### Seamless Loop 전략
- 모든 주기적 애니메이션의 period를 20초의 약수로 설정 (1, 2, 4, 5, 10, 20초)
- `time = (elapsed % LOOP_DURATION) / LOOP_DURATION` 로 정규화
- 파티클: deterministic hash(seed + particleIndex) 기반, 각 파티클의 lifetime이 period의 약수
- 모든 trigonometric 함수는 `sin(2π × time / period)` 형태로 자동 연속
- AC 검증: 프레임 0 vs 프레임 599의 pixel diff 자동 측정

---

## 5. Acceptance Criteria

| # | AC | 검증 방법 |
|---|-----|----------|
| AC1 | PNG/JPG 입력(최대 4096x4096, 20MB) 시 4개 이상 RGBA 레이어 분해 | 레이어 파일 개수 + 알파 채널 존재 확인 |
| AC2 | 후처리 후 레이어 가장자리에 1px 이상 노이즈 없음 | sharp 기반 검증 스크립트 |
| AC3 | scene.json이 스키마 v1으로 자동 생성됨 | Zod schema validation |
| AC4 | 브라우저에서 30fps 이상으로 실시간 렌더링 (Chrome, M1+ Mac) | performance.now() delta 측정 |
| AC5 | 20초 지점에서 프레임 0과 시각적으로 동일 | pixel RMSE < 2.0 (0-255 스케일) |
| AC6 | 색순환, 웨이브, 글로우, 반짝임, 패럴랙스 5가지 효과 모두 적용 | 셰이더 uniform 활성 + 프레임 캡처 시각 비교 |
| AC7 | 출력 mp4가 1080x1080, 30fps, H.264, 10Mbps+ | ffprobe 자동 검증 |
| AC8 | CLI 1회 실행으로 입력→출력 완료 | E2E 스크립트 |
| AC9 | Replicate API 실패 시 의미 있는 에러 메시지 + graceful 종료 | 에러 핸들링 테스트 |
| AC10 | API 토큰이 소스코드에 없고 .env로 관리됨 | grep 검증 |

---

## 6. Out of Scope

- 오디오/음악 동기화
- 실시간 사용자 인터랙션 (마우스 제외)
- 여러 이미지 배치 처리 (1장씩 처리)
- 모바일 최적화
- 레이어 수동 편집 UI

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Replicate API 레이어 품질 불균일 | 이미지마다 분해 품질 다름 | 후처리 + 사용자 검수 게이트 + 수동 레이어 입력 폴백 |
| Replicate 모델 deprecated | 파이프라인 차단 | 수동 레이어 입력 경로(US1b)로 폴백 |
| Replicate 크레딧 소진 | API 호출 실패 | ~$0.03/회, 에러 시 명확한 메시지 + 수동 폴백 안내 |
| 복잡한 이미지의 레이어 분리 실패 | 의미 없는 레이어 생성 | num_layers 조정 + 재분해 옵션 |
| Frame-by-frame 캡처 속도 | 600프레임 캡처 시 수분 소요 | 프로그레스 바 표시, 백그라운드 처리 |
| GLSL 셰이더 호환성 | 브라우저/GPU별 차이 | WebGL2 기준, Chrome 타겟 |
| ffmpeg 미설치 | 영상 출력 불가 | 파이프라인 시작 시 `which ffmpeg` 체크 |

---

## 8. Dependencies

| 의존성 | 버전 | 용도 |
|--------|------|------|
| replicate (npm) | ^1.4.0 | 레이어 분해 API |
| three | ^0.172.0 | 3D 렌더링 (기존) |
| postprocessing (npm) | ^6.x | Bloom, ChromaticAberration |
| sharp (npm) | ^0.33.x | 이미지 후처리 (Python 대체) |
| ffmpeg (system) | >=5.0 | PNG→mp4 변환 |
