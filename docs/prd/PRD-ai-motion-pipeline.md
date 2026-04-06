# PRD: AI Motion Video Pipeline

**Version**: 0.3
**Author**: Isaac (via Claude)
**Date**: 2026-04-06
**Status**: Approved
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background

현재 layered pipeline은 정적 이미지를 AI로 2-layer 분해(bria + flux-fill-pro + ESRGAN + depth-anything-v2)한 뒤, GLSL 셰이더(`layer.frag`)에서 HSV hue rotation + hueKey로 색상만 변조하여 사이키델릭 루프 영상을 생성한다.

색상 애니메이션은 수학적으로 완벽하지만, **구조적 모션(바람, 호흡, 물결 등)이 전혀 없다.** Parallax는 미미한 UV offset 수준. 결과물은 "움직이는 그림"이 아니라 "색이 바뀌는 그림"에 가깝다.

### 1.2 Problem Definition

정적 이미지 기반 layered pipeline에 **AI 생성 자연 모션**을 추가하되, 기존 hueKey 색상 시스템의 정확도를 100% 유지해야 한다.

### 1.3 Impact of Not Solving

- 작품 품질이 2025-2026 AI video art 수준에 미치지 못함
- Instagram Reels에서 engagement 하락 (정적 색변조 vs 실제 움직임)
- 기존 depth map, layer 분리 인프라가 충분히 활용되지 않음

## 2. Goals & Non-Goals

### 2.1 Goals

- [ ] G1: 기존 layered pipeline 출력에 AI 기반 자연 모션(바람, 호흡, 물결) 추가
- [ ] G2: 원본 픽셀 색상 100% 보존 (optical flow transfer로 원본 픽셀을 물리적 이동)
- [ ] G3: hueKey 시스템이 설계 의도 그대로 동작 (AI 색 드리프트 영향 0%)
- [ ] G4: 완벽한 seamless loop (ping-pong 기반, 수학적 보장)
- [ ] G5: 단일 CLI 커맨드로 end-to-end 실행 (`npm run publish` 확장)
- [ ] G6: 프로토타입/프로덕션 듀얼 모드 (Wan 2.2 Fast / Veo 3.1 Standard)

### 2.2 Non-Goals

- NG1: 실시간 브라우저 렌더링에서 AI 비디오 재생 (오프라인 export 전용)
- NG2: 오디오 리액티브 모션 (별도 기능으로 분리)
- NG3: 3개 이상 레이어 동시 i2v (현재 2-layer 아키텍처 유지)
- NG4: 4K 출력 (1080p 유지, 추후 Real-ESRGAN Video로 확장 가능)
- NG5: depth-conditioned ControlNet (Replicate에 호스팅된 모델 없음, 추후 과제)

## 3. User Stories & Acceptance Criteria

### US-1: AI 모션 비디오 생성

**As a** 비디오 아티스트, **I want** 입력 이미지 1장에서 자연 모션이 포함된 사이키델릭 루프 영상을 생성, **so that** 정적 색변조보다 몰입감 높은 작품을 만들 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: `npm run publish input.png -- --title my-art --motion` 실행 시 AI 모션이 포함된 mp4 출력
- [ ] AC-1.2: 출력 ��상에서 배경(layer-0)과 전경(layer-1)이 각각 독립적인 미세 모션을 가짐. 검증: 각 레이어 프레임 간 SSIM < 0.995 (모션 존재 증명) + 레이어 간 flow vector 상관계수 < 0.5 (독립 모션 증명)
- [ ] AC-1.3: 출력 영상의 첫 프레임과 마지막 프레임이 동일 (seamless loop)
- [ ] AC-1.4: 모션이 적용된 영상에서 hueKey 색상 애니메이션이 원래와 동일하게 동작

### US-2: 모션 강도 제어

**As a** 비디오 아티스트, **I want** 모션 강도를 제어, **so that** 이미지 특성에 맞는 적절한 수준의 움직임을 적용할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: `--motion-intensity` 플래그로 low/medium/high 선택 가능
- [ ] AC-2.2: 모션 강도별 flow magnitude 범위 — low: avg 2-5px, medium: avg 5-15px, high: avg 15-30px. i2v 프롬프트 + flow field scaling으로 제어
- [ ] AC-2.3: 모션 강도에 관계없이 loop seam이 보이지 않음

### US-3: 모델 선택 (프로토타입 vs 프로덕션)

**As a** 비디오 아티스트, **I want** 빠르고 저렴한 프로토타입 모드와 최고 품질 프로덕션 모드를 선택, **so that** 반복 테스트와 최종 출력을 효율적으로 분리할 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: 기본값 = `wan-2.2` (프로토타입, ~$1.44/작품: $0.09/sec × 8초 × 2레이어)
- [ ] AC-3.2: `--motion-model veo-3.1` 플래그로 프로덕션 모드 (~$6.40/작품)
- [ ] AC-3.3: 두 모드 모두 동일한 후처리 파이프라인(optical flow + warp + shader) 경유

### US-4: 기존 파이프라인 호환

**As a** 비디오 아티스트, **I want** `--motion` 없이 기존 동작이 100% 유지, **so that** 기존 워크플로우가 깨지지 않는다.

**Acceptance Criteria:**
- [ ] AC-4.1: `npm run publish input.png -- --title my-art` (motion 플래그 없음) = 기존과 동일한 출력
- [ ] AC-4.2: scene.json v1 호환성 유지 (신규 필드는 optional)
- [ ] AC-4.3: 기존 테스트 143개 전부 통과

## 4. Technical Design

### 4.1 Architecture Overview

```
[기존 Pipeline — 변경 없음]
  input.png → bria → ESRGAN → flux-fill → ESRGAN → depth-anything-v2
  → layer-0.png (배경), layer-1.png (전경), depth.png
  → scene.json 생성

[NEW: AI Motion Pipeline — --motion 플래그 시 추가 실행]
  ┌─────────────────────────────────────────────────────────┐
  │ Step M1: Per-Layer i2v (Replicate API)                  │
  │   layer-0.png (RGB) → Veo 3.1 / Wan 2.2                │
  │     prompt: "subtle wind, gentle movement, static shot" │
  │   layer-1.png (RGBA → 검정배경 composite → RGB)         │
  │     prompt: "subtle breathing, slight sway"             │
  │   → bg-motion-ref.mp4, fg-motion-ref.mp4                │
  │   정책: 두 레이어 모두 성공해야 motion 적용 (all-or-nothing) │
  │   실패 시: motion 없이 기존 파이프라인 폴백 + 경고      │
  ├─────────────────────────────────────────────────────────┤
  │ Step M2: Frame Extraction + Duration 정규화             │
  │   ffmpeg → bg-ref-frames/, fg-ref-frames/ (PNG seq)     │
  │   모델별 출력 길이 차이 → target 8초 정규화:            │
  │     짧으면: FILM interpolation 보간                     │
  │     길면: trim to 8초                                   │
  │   양 레이어 프레임 수 동기화 (같은 frameCount 보장)     │
  ├─────────────────────────────────────────────────────────┤
  │ Step M3: Optical Flow Extraction (Local Python RAFT)    │
  │   연속 프레임 쌍 → dense flow fields (.npy)             │
  │   CPU fallback 지원 (느리지만 GPU 없이 동작)            │
  ├─────────────────────────────────────────────────────────┤
  │ Step M4: Original Pixel Warping                         │
  │   layer-0.png + bg-flow-fields → bg-warped-frames/      │
  │   layer-1.png + fg-flow-fields → fg-warped-frames/      │
  │   backward warp (bilinear interpolation)                │
  │   전경 alpha 처리: RGB만 warp → 원본 정적 alpha 재적용  │
  │   디스클루전: AI ref 프레임에서 Oklab L-ab 블렌딩 폴백  │
  ├─────────────────────────────────────────────────────────┤
  │ Step M5: Ping-Pong Loop                                 │
  │   N프레임 → 역순 결합 → 2N프레임 완벽 루프             │
  │   접합점 3프레임 코사인 블렌딩                          │
  ├─────────────────────────────────────────────────────────┤
  │ Step M6: scene.json 업데이트                            │
  │   duration = 16 (ping-pong 후)                          │
  │   animation periods 재계산: getValidPeriods(16)=[1,2,4,8,16] │
  │   layers[].motion = { enabled, framesDir, frameCount }  │
  └─────────────────────────────────────────────────────────┘

[기존 렌더링 — 확장]
  Three.js: 프레임 시퀀스 텍스처 로더 (§4.5 상세 설계 참조)
  layer.frag: 변경 없음 (uTexture에 프레임별 텍스처 바인딩)
  EffectComposer: bloom + CA (변경 없음)
  Puppeteer 캡처 → ffmpeg → 최종 mp4
```

### 4.1.1 Duration / Period 호환성 (P0 Fix)

motion 모드에서 `scene.json.duration`은 **16** (8초 i2v × ping-pong = 16초).

`getValidPeriods(16)` = `[1, 2, 4, 8, 16]`.

**pipeline-pro.ts의 period 선택 로직 변경:**
- 기존: `DURATION=20` → periods `[1,2,4,5,10,20]` 에서 선택
- motion: `DURATION=16` → periods `[1,2,4,8,16]` 에서 선택
- colorCycle, glow 등 period 값을 duration 기반으로 동적 계산 (기존 로직 재활용)

`sceneSchema.superRefine`은 **변경 없음** — duration 값이 16으로 바뀌면 자동으로 `getValidPeriods(16)` 기준으로 검증. 기존 scene.json(duration=20)은 motion 미사용이므로 영향 없음.

### 4.1.2 Python Integration (P1 Fix)

**호출 방식:** `child_process.execFile` (shell: false — injection 방지)

```typescript
// scripts/lib/python-bridge.ts (신규)
import { execFile } from "node:child_process";

interface PythonResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runPython(script: string, args: string[]): Promise<PythonResult> {
  // 모든 경로를 path.resolve + path.normalize로 정규화
  const normalizedArgs = args.map(a => path.normalize(path.resolve(a)));
  return new Promise((resolve, reject) => {
    execFile("python3", [script, ...normalizedArgs], { 
      maxBuffer: 50 * 1024 * 1024,  // 50MB
      timeout: 600_000,              // 10분
    }, (error, stdout, stderr) => {
      if (error) reject(new Error(`Python failed: ${stderr}\n${error.message}`));
      else resolve({ stdout, stderr, exitCode: 0 });
    });
  });
}
```

**I/O 인터페이스:**
- 입력: CLI argv로 디렉토리 경로 전달 (경로만, 사용자 텍스트 미포함)
- 출력: warped PNG 파일을 지정 디렉토리에 생성 + stdout으로 JSON 메타데이터
- 에러: stderr 파싱 + exit code 체크. 비정상 종료 시 motion 폴백

**Python 존재 검증:**
```typescript
// scripts/lib/check-deps.ts에 추가
async function checkPython(): Promise<boolean> {
  try {
    await execFile("python3", ["--version"]);
    await execFile("python3", ["-c", "import torchvision"]);
    return true;
  } catch {
    return false;
  }
}
```

### 4.1.3 전경 Alpha 처리 (P1 Fix)

**i2v 입력 전처리:**
- `layer-1.png` (RGBA) → 검정 배경 alpha composite → RGB PNG 생성
- `sharp(layer1).flatten({ background: { r: 0, g: 0, b: 0 } })` 사용
- 검정 배경 선택 이유: 전경 경계에서 flow가 배경으로 누출되어도 검정은 hue 정보 없음 → hueKey에 영향 최소

**워핑 후 alpha 복원:**
- backward warp은 RGB 3채널만 처리
- 원본 `layer-1.png`의 alpha 채널을 별도 추출 → 모든 warped 프레임에 동일하게 적용
- 미세 모션 전제이므로 per-frame alpha 변화 불필요 (정적 alpha mask)
- 디스클루전 영역의 alpha: 0 유지 (투명 처리 — 배경 레이어가 보임)

### 4.1.4 Three.js 프레임 시퀀스 텍스처 로더 (P0 Fix)

**변경 대상 파일:** `src/sketches/layered-psychedelic.ts`, `src/main.ts`

**텍스처 풀 설계:**

```typescript
// src/lib/frame-texture-pool.ts (신규)
class FrameTexturePool {
  private cache: Map<number, THREE.Texture> = new Map();
  private readonly windowSize = 10;  // ±5 프레임 = 최대 11 텍스처
  private readonly frameCount: number;
  private readonly framesDir: string;

  // GPU 메모리 예산: 1080×1080 RGBA = ~4.7MB/texture × 11 = ~52MB
  
  getTexture(frameIndex: number): THREE.Texture {
    // 1. 캐시 히트 → 즉시 반환
    // 2. 캐시 미스 → 로드 + 윈도우 밖 텍스처 dispose
    // 3. 프리로드: frameIndex+1 ~ frameIndex+5 백그라운드 로드
  }

  dispose(): void {
    // 전체 캐시 정리
  }
}
```

**layered-psychedelic.ts 변경:**

```typescript
// 기존: loadTexture() → 단일 텍스처
// 변경: motion 필드 존재 시 FrameTexturePool 사용

const textureSource = layer.motion?.enabled
  ? new FrameTexturePool(layer.motion.framesDir, layer.motion.frameCount)
  : await loadTexture(textureLoader, `/${layer.file}`);

// update() 변경:
update(time: number) {
  const normalizedTime = (time % loopDuration) / loopDuration;
  for (const { material, textureSource } of layerMeshes) {
    material.uniforms.uTime.value = normalizedTime;
    
    if (textureSource instanceof FrameTexturePool) {
      // 프레임 인덱스 계산: clamp로 OOB 방지
      const frameIndex = Math.min(
        Math.floor(normalizedTime * textureSource.frameCount),
        textureSource.frameCount - 1
      );
      material.uniforms.uTexture.value = textureSource.getTexture(frameIndex);
    }
  }
}
```

**Puppeteer 캡처 호환 — 동기/비동기 해결 전략:**

`__captureFrame()`은 동기 함수이고 `THREE.TextureLoader.load()`는 비동기. 이 경쟁 조건을 **캡처 모드 사전 로드**로 해결:

```
캡처 모드 (Puppeteer):
  __startCapture(fps) 호출 시:
    1. 전체 프레임을 순차 await 로드 → GPU 업로드 완료까지 대기
    2. 모든 텍스처를 Map<frameIndex, THREE.Texture>에 보관
    3. 이후 __captureFrame()에서 Map.get(frameIndex) → 동기 반환
    4. 메모리: 384프레임 × ~4.7MB = ~1.8GB (캡처 모드는 임시)
    5. 캡처 완료 후 전체 dispose

프리뷰 모드 (브라우저 실시간):
    슬라이딩 윈도우 ±5프레임 캐싱 (52MB)
    캐시 미스 시 이전 프레임 유지 (시각적 영향 미미)
```

**결정: 캡처 모드와 프리뷰 모드에서 다른 전략 사용.** 캡처 모드는 프레임 정확도 최우선(메모리 1.8GB 허용), 프리뷰 모드는 메모리 효율 최우선(프레임 드롭 허용).

**`LayerMesh` 인터페이스 확장:**

```typescript
interface LayerMesh {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  config: LayerConfig;
  textureSource: THREE.Texture | FrameTexturePool;  // 신규
}
```

**export-layered.ts 변경:**
- `__startCapture(fps)` 내에서 `FrameTexturePool.preloadAll()` await 호출
- `__captureFrame()`은 동기 유지 (Map.get으로 텍스처 접근)

**정적 모드와의 분기:**
- `layer.motion` 필드가 없으면 (undefined/null) → 기존 코드 경로 100% 동일
- `FrameTexturePool`은 motion 모드에서만 인스턴스화

### 4.2 Data Model Changes

**scene-schema.ts 확장 (하위 호환):**

```typescript
const layerSchema = z.object({
  // 기존 필드 전부 유지
  id: z.string(),
  file: z.string(), // PNG 경로 (원본 이미지, 항상 존재)
  zIndex: z.number().int().min(0),
  opacity: z.number().min(0).max(1).default(1),
  blending: blendModeSchema,
  role: layerRoleSchema.optional(),
  meanDepth: z.number().min(0).max(255).optional(),
  animation: animationSchema.default({...}),

  // 신규 필드 (optional — 하위 호환)
  motion: z.object({
    enabled: z.boolean(),
    framesDir: z.string(),           // "layers/bg-frames/"
    frameCount: z.number().int().positive(),
    fps: z.number().positive(),       // 프레임 시퀀스 FPS
    model: z.string().optional(),     // 생성에 사용된 모델 기록
    intensity: z.enum(["low", "medium", "high"]).default("medium"),
  }).optional(),
});
```

**file 필드 regex: 변경 없음** (PNG only 유지). motion 프레임도 전부 PNG 시퀀스. jpg 허용 불필요.

### 4.3 API Design (CLI)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--motion` | boolean | false | AI 모션 파이프라인 활성화 |
| `--motion-model` | string | `wan-2.2` | i2v 모델 선택: `wan-2.2`, `veo-3.1`, `seedance` |
| `--motion-intensity` | string | `medium` | 모션 강도: `low`, `medium`, `high` |
| `--skip-flow` | boolean | false | optical flow 건너뛰기 (AI 영상 직접 사용, 디버그 전용). **주의: hueKey 색상 보존 미보장** |

> `--motion-prompt-bg/fg` 수동 오버라이드는 MVP에서 제외 (YAGNI). 자동생성으로 시작, 필요시 추후 추가.

**CLI 파싱 위치:** `scripts/lib/pipeline-cli.ts`의 `PipelineCliArgs` 인터페이스에 `motion`, `motionModel`, `motionIntensity`, `skipFlow` 필드 추가. `publish.ts`가 파싱 → `pipeline-pro.ts`에 전달 → motion step 조건 실행.

**Replicate 모델 매핑:**

| CLI 값 | Replicate ID | 용도 |
|--------|-------------|------|
| `wan-2.2` | `wan-video/wan-2.2-i2v-fast` | 프로토타입 (~$1.44/작품: $0.09/sec × 8초 × 2레이어) |
| `veo-3.1` | `google/veo-3.1` | 프로덕션 최고 품질 (~$6.40/작품: $0.40/sec × 8초 × 2레이어) |
| `seedance` | `bytedance/seedance-1-pro` | 프로덕션 가성비 (~$0.52/작품: ~$0.26/5초 × 2레이어) |

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 모션 소스 | ① AI 영상 직접 사용 ② Dual-texture Oklab ③ Optical flow transfer | **③ Optical flow transfer** | 원본 픽셀 물리적 이동 → hueKey 100% 보존. 색 드리프트 완전 차단 |
| 루프 방식 | ① first+last frame ② Ping-pong ③ VACE inpainting ④ Segment chaining | **② Ping-pong** | 사이키델릭 유기적 모션에서 역재생이 자연스러움. 컬러 드리프트 회피. 구현 단순 |
| Flow 엔진 | ① Replicate RAFT ② 로컬 RAFT ③ ComfyUI RAFT | **② 로컬 Python RAFT** | Replicate에 RAFT 없음. torchvision 내장, 추가 의존성 최소 |
| 프레임 표현 | ① VideoTexture (HTML5) ② 프레임 시퀀스 PNG | **② 프레임 시퀀스** | 결정적 클럭과 완벽 동기화. Puppeteer 캡처에서 프레임 드롭 0 |
| 디스클루전 처리 | ① 무시 ② AI ref 폴백 ③ Inpainting | **② AI ref 프레임 Oklab 블렌딩** | 미세 모션이라 디스클루전 극소. 발생 시 AI 프레임에서 L만 차용 |
| 기본 duration | ① 20초 유지 ② 8초 (Veo native) ③ 10초 | **② 8초** (motion mode only) | Veo 3.1 네이티브 8초. Ping-pong → 16초. 소셜 미디어 최적 길이 |
| i2v 프롬프트 | ① 하드코딩 ② 사용자 입력 ③ 자동생성 | **③ 자동생성 + 오버라이드** | role(background-plate/subject)에 따라 기본 프롬프트 자동 생성 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | Replicate API 실패 (rate limit, timeout) | withRetry 3회 재시도. **All-or-nothing**: 한 레이어라도 실패 시 양쪽 모두 motion 비활성화 → 기존 파이프라인 폴백 + 경고 | P1 |
| E2 | RAFT GPU 없음 (CPU only) | CPU 모드 자동 감지. 속도 ~10x 느림 + 경고 메시지 | P2 |
| E3 | i2v 출력 해상도 ≠ 원본 해상도 | sharp로 원본 해상도에 맞춰 리사이즈 후 flow 추출 | P1 |
| E4 | Optical flow에서 대규모 디스클루전 | 디스클루전 마스크 비율 > 5% 시 경고. AI ref 프레임 Oklab 블렌딩 | P2 |
| E5 | Ping-pong 접합점 아티팩트 | 접합점 ±3프레임 코사인 블렌딩으로 완화 | P2 |
| E6 | 메모리 부족 (600+ 프레임 로드) | 슬라이딩 윈도우 ±5프레임 캐싱. 순차 접근 프리로드 | P1 |
| E7 | Python/RAFT 미설치 | 설치 안내 메시지 + `--skip-flow` 자동 활성화 (AI 영상 직접 사용). **경고: hueKey 색상 보존 미보장** | P1 |
| E8 | Veo 3.1 출력 비디오에 SynthID 워터마크 | 무시 (optical flow만 추출하므로 최종 픽셀에 영향 없음) | P3 |
| E9 | 전경 레이어가 투명 영역 포함 | i2v 전: RGBA→검정배경 RGB composite. warp 후: 원본 정적 alpha mask 재적용. 디스클루전 영역 alpha=0 (§4.1.3 참조) | P1 |
| E10 | --motion 없이 기존 실행 | 신규 코드 미실행. 기존 동작 100% 동일 | P0 |
| E11 | --duration과 --motion 동시 사용 | motion 모드에서 duration은 고정 16초 (8초 i2v × ping-pong). 사용자 --duration은 motion 모드에서 무시 + 경고 | P2 |
| E12 | i2v 모델별 출력 duration 차이 (Wan 5초 vs Veo 8초) | Step M2에서 target 8초로 정규화: 짧으면 FILM 보간, 길면 trim. 양 레이어 frameCount 동기화 | P1 |
| E13 | 중간 산출물(intermediate/) 이전 실행 잔재 | Step M1 시작 시 intermediate/ 디렉토리 삭제 후 재생성 | P2 |
| E14 | 접합점 블렌딩이 hueKey에 미치는 영향 | 미세 모션 + 코사인 블렌딩이므로 deltaE < 1 수준. 문제 발생 시 HSV 공간 블렌딩으로 전환 | P3 |

## 6. Security & Permissions

### 6.1 Authentication

- Replicate API: 기존 `REPLICATE_API_TOKEN` 환경변수 재활용
- 신규 환경변수 없음

### 6.2 Authorization

N/A — 로컬 CLI 도구. 사용자 역할 없음.

### 6.3 Data Protection

- 입력 이미지가 Replicate API로 전송됨 (기존과 동일)
- i2v 생성 비디오는 로컬에만 저장 (중간 산출물, 최종 아카이브에 포함)
- Optical flow 필드(.npy) + 중간 산출물: **export 완료 후 intermediate/ 디렉토리 자동 삭제**

### 6.4 Python Child Process 보안

- `child_process.execFile` 사용 (shell: false — command injection 방지)
- 모든 경로 인자를 `path.resolve() + path.normalize()`로 정규화
- Python 스크립트는 경로만 argv로 받음 (사용자 텍스트 미포함)
- maxBuffer/timeout 제한으로 리소스 고갈 방지

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 전체 파이프라인 시간 (Wan 2.2) | < 10분 | CLI 타임스탬프 |
| 전체 파이프라인 시간 (Veo 3.1) | < 15분 | CLI 타임스탬프 |
| RAFT flow 추출 (GPU, 8초 24fps) | < 30초 | CLI 타임스탬프 |
| RAFT flow 추출 (CPU, 8초 24fps) | < 5분 | CLI 타임스탬프 |
| 픽셀 워핑 (192프레임 × 2레이어) | < 60초 | CLI 타임스탬프 |
| 메모리 사용 (프레임 캐싱) | < 2GB | 프로세스 모니터링 |
| Puppeteer 캡처 속도 | ≥ 5fps | 프레임 카운터 |

### 7.1 Monitoring & Alerting

- 각 Step별 소요시간 + 비용 콘솔 출력
- Replicate API 호출 비용 누적 표시
- RAFT GPU/CPU 모드 감지 결과 표시
- 디스클루전 비율 경고 (> 5%)

## 8. Testing Strategy

### 8.1 Unit Tests

| 대상 | 테스트 내용 |
|------|-----------|
| scene-schema.ts | motion 필드 파싱/검증, 하위호환 (motion 없는 v1 scene.json) |
| CLI 파싱 | --motion, --motion-model, --motion-intensity 플래그 |
| 프롬프트 생성 | role → 프롬프트 매핑 (background-plate, subject 등) |
| 모델 매핑 | CLI 모델명 → Replicate ID 변환 |
| ping-pong 유틸 | 프레임 시퀀스 역순 결합 + 접합점 블렌딩 |
| 프레임 인덱싱 | normalizedTime → frameIndex 변환 정확도 |

### 8.2 Integration Tests

| 대상 | 테스트 내용 |
|------|-----------|
| Replicate i2v 호출 | mock API로 입출력 형식 검증 |
| RAFT flow 스크립트 | 2프레임 입력 → flow .npy 출력 형식/차원 검증 |
| Warp 스크립트 | 원본 이미지 + flow → warped 이미지 출력 검증 |
| 프레임 시퀀스 로더 | scene.json motion 필드 → 프레임 인덱싱 동작 |
| 셰이더 + 프레임 시퀀스 | 기존 layer.frag + FrameTexturePool 텍스처 바인딩 호환성 |
| scene-loader 하위호환 | motion 없는 v1 scene.json 파싱 정상 동작 |
| duration/period 호환 | motion mode duration=16에서 period 검증 통과 |
| 전체 파이프라인 | 소형 이미지(256×256) + mock API로 end-to-end |

### 8.3 Edge Case Tests

| 대상 | 테스트 내용 |
|------|-----------|
| E1 | Replicate 실패 시 폴백 동작 |
| E7 | Python/RAFT 미설치 시 에러 메시지 |
| E9 | 투명 전경 alpha 보존 |
| E10 | --motion 없이 기존 동작 불변 |

## 9. Rollout Plan

### 9.1 Migration Strategy

- scene.json v1 스키마 하위호환: `motion` 필드는 `.optional()`
- 기존 scene.json 파일 수정 불필요
- 기존 `npm run publish` 동작 무변경

### 9.2 Feature Flag

- `--motion` CLI 플래그가 feature flag 역할
- 기본값 false → 기존 동작 유지

### 9.3 Rollback Plan

- `--motion` 플래그 제거 시 기존 파이프라인으로 즉시 복귀
- scene.json의 `motion` 필드 무시 시 기존 렌더링 동작

## 10. Dependencies & Risks

### 10.1 Dependencies

| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| Replicate API (Veo 3.1) | Google/Replicate | Active | 모델 deprecation → 대체 모델로 전환 |
| Replicate API (Wan 2.2) | Wan-Video/Replicate | Active | 동일 |
| torchvision RAFT | PyTorch | Stable | 없음 (로컬 의존성) |
| Python 3.9+ | System | Required | RAFT 실행 불가 → --skip-flow 폴백 |
| sharp (이미지 리사이즈) | 기존 | Active | 없음 (이미 사용 중) |
| ffmpeg | System | Required | 프레임 추출/인코딩 불가 (기존 의존성) |

### 10.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Veo 3.1 API 비용 변동 | 중 | 중 | 멀티 모델 지원, 기본값 Wan 2.2 |
| RAFT CPU 모드 과도하게 느림 | 중 | 중 | 프레임 수 줄이기 (12fps → flow → 24fps FILM interpolation) |
| i2v 모델 구도 변형 | 중 | 높 | optical flow transfer가 원본 픽셀 사용하므로 구도 변형 무관 |
| 디스클루전 아티팩트 | 낮 | 중 | 미세 모션 강제 + Oklab 블렌딩 폴백 |
| Wan 2.7 안정성 (매우 신규) | 높 | 낮 | 기본값 Wan 2.2. 2.7은 추후 옵션 추가 |
| Python 의존성 충돌 | 낮 | 중 | 별도 requirements-motion.txt + venv 권장 |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| 모션 유무 | 0% 프레임에 구조적 모션 | 100% 프레임에 자연 모션 | 육안 검증 |
| 색상 충실도 | N/A (새 기능) | 원본 대비 deltaE < 1 (Oklab) | 원본 vs 워핑 프레임 비교 스크립트 |
| Loop seamlessness | 기존 100% (수학적) | 100% (ping-pong + 블렌딩) | 루프 포인트 SSIM ≥ 0.98 |
| 파이프라인 성공률 | N/A | ≥ 95% (API 실패 시 폴백 포함) | 10회 연속 실행 |
| 기존 테스트 통과 | 143/143 | 143/143 | vitest run |

## 12. Open Questions

- [x] OQ-1: RAFT가 Replicate에 있는가? → **없음. 로컬 Python으로 결정**
- [x] OQ-2: Veo 3.1 last_frame 지원? → **지원 확인 (`google/veo-3.1`)**
- [x] OQ-3: 기본 duration? → **motion mode: 8초 (Veo native) + ping-pong = 16초**
- [x] OQ-4: Wan 2.7 안정성 확인 후 옵션 추가 여부 → **MVP에서 제외, 추후 관찰 후 추가**

---

## Appendix A: 파이프라인 디렉토리 구조

```
out/layered/{date}_{title}-{hash}/
├── _work/
│   ├── scene.json                    # motion 필드 포함
│   ├── layers/
│   │   ├── layer-0.png               # 원본 배경 (기존)
│   │   ├── layer-1.png               # 원본 전경 (기존)
│   │   ├── bg-frames/                # NEW: 워핑된 배경 프레임 시퀀스
│   │   │   ├── frame_00001.png
│   │   │   └── ...
│   │   └── fg-frames/                # NEW: 워핑된 전경 프레임 시퀀스
│   │       ├── frame_00001.png
│   │       └── ...
│   └── intermediate/                 # NEW: 중간 산출물 (export 후 삭제)
│       ├── bg-motion-ref.mp4         # i2v 원본 비디오
│       ├── fg-motion-ref.mp4
│       ├── bg-ref-frames/            # i2v 프레임 추출
│       ├── fg-ref-frames/
│       ├── bg-flow/                  # optical flow .npy
│       └── fg-flow/
├── {title}.mp4                       # 고해상도 원본
├── {title}-instagram.mp4             # 1080x1920 다운스케일
└── scene.json                        # 아카이브 사본
```

## Appendix B: Replicate 모델 검증 결과 (2026-04-06)

| 모델 | Replicate ID | 상태 | 비용 |
|------|-------------|------|------|
| Veo 3.1 | `google/veo-3.1` | Active | ~$0.40/sec (standard) |
| Veo 3.1 Fast | `google/veo-3.1-fast` | Active | ~$0.10/sec |
| Wan 2.2 Fast | `wan-video/wan-2.2-i2v-fast` | Active | ~$0.09/sec (480p) |
| Wan 2.7 | `wan-video/wan-2.7-i2v` | Active (신규) | TBD |
| Seedance 1 Pro | `bytedance/seedance-1-pro` | Active | ~$0.26/5s |
| Kling v2.5 | `kwaivgi/kling-v2.5-turbo-pro` | Active | ~$0.22/sec |
| FILM | `google-research/frame-interpolation` | Active | ~$0.002/run |
| RAFT | **Replicate에 없음** | N/A | 로컬 Python |
| Real-ESRGAN Video | `lucataco/real-esrgan-video` | Active | ~$0.33/run |
| Wan VACE | `prunaai/vace-14b` | Active | ~$0.69/run |
| BRIA Video BG Remove | `bria/video-remove-background` | Active | TBD |

## Appendix C: Python 의존성 (신규)

```
# requirements-motion.txt
torch>=2.0.0
torchvision>=0.15.0
numpy>=1.24.0
opencv-python>=4.8.0
Pillow>=10.0.0
```

RAFT는 `torchvision.models.optical_flow.raft_large`로 접근 (별도 설치 불필요).
