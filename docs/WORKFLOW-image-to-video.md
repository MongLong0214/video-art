# 이미지 → 영상 워크플로우 (실전 가이드)

> 이미지 1장을 9:16 사이키델릭 루프 영상으로 변환하는 완전한 단계별 가이드.
> 현재 구현된 모든 기능 (Tier 1 + Tier A + Tier B + Tier C) 활용.

---

## 📋 5분 요약 (TL;DR)

```bash
# 1. 이미지를 레이어로 분리 (~2-3분, Replicate API 필요)
npx tsx scripts/pipeline-pro.ts my-image.png --duration 20

# 2. 브라우저 미리보기
npm run pipeline:preview
# → http://localhost:5299/?mode=layered

# 3. 프리셋 골라서 적용 (아래 섹션 3 참고)
cp public/presets/shader-dev-mandala-flow.json public/scene.json

# 4. 풀 해상도 mp4 렌더 (~1-2분, 1080×1920 20초)
npm run export:layered -- --title "my-render"
# → out/archive/my-render-{timestamp}/my-render.mp4
```

---

## 🎬 전체 파이프라인 구조

```
이미지 입력 (.png)
      ↓
[pipeline-pro]  Replicate API
  ├─ bria/remove-background      → 전경 알파 매팅
  ├─ flux-fill-pro               → 배경 inpaint
  └─ depth-anything-v2            → depth map
      ↓
public/layers/ (layer-0.png, layer-1.png, layer-2.png, depth.png)
public/scene.json (초기 파라미터)
      ↓
[브라우저 미리보기 + 프리셋 튜닝]
  npm run pipeline:preview
  프리셋 적용 or scene.json 직접 편집
      ↓
[export-layered]  Puppeteer + ffmpeg
  1080×1920 9:16, 20초, 30fps, CRF 15 (고품질)
      ↓
out/archive/{title}-{timestamp}/
  {title}.mp4  ← 최종 영상
  scene.json   ← 렌더 시점 설정 스냅샷
  layers/      ← 레이어 스냅샷
```

---

## 1. 이미지 준비

### 1.1 권장 입력 형식
- **포맷**: PNG, JPG (PNG 권장 — 알파 채널 지원)
- **해상도**: **세로 9:16** (예: 1080×1920, 1632×2912) 원본 비율 유지
  - 1632×2912 정도가 최적 (pipeline-pro가 해상도별 최적화)
- **피사체**: 명확한 전경/배경 분리 가능한 이미지
  - 사이키델릭: 사람/생물/만다라 등 상징적 이미지 최적
- **파일 위치**: 프로젝트 루트 또는 절대 경로

### 1.2 Replicate API 준비 (최초 1회)
```bash
# .env 파일에 API 키 추가
echo "REPLICATE_API_TOKEN=r8_..." >> .env
```

---

## 2. 이미지 → 레이어 분리

### 2.1 기본 실행 (20초 영상용)
```bash
npx tsx scripts/pipeline-pro.ts my-image.png
# 또는
npm run pipeline:pro -- my-image.png
```

### 2.2 옵션 플래그
```bash
# 영상 길이 (초, 1-300)
npx tsx scripts/pipeline-pro.ts my-image.png --duration 15

# fps (기본 30)
npx tsx scripts/pipeline-pro.ts my-image.png --fps 60

# 프로덕션 모드 (upscale 포함)
npx tsx scripts/pipeline-pro.ts my-image.png --production

# 작업 디렉토리 (기본 out/pro-pipeline/)
npx tsx scripts/pipeline-pro.ts my-image.png --work-dir /tmp/my-work
```

### 2.3 소요 시간 + 산출물
- **시간**: ~2-3분 (Replicate API 호출 3개)
- **산출물**:
  - `public/layers/layer-0.png` (배경 inpaint)
  - `public/layers/layer-1.png` (전경 알파 매팅)
  - `public/layers/layer-2.png` (선택적 중간)
  - `public/layers/depth.png` (depth map)
  - `public/scene.json` (기본 파라미터 포함)

---

## 3. 프리셋 선택 + 튜닝

### 3.1 바로 사용 가능한 3 조합 프리셋 (추천)

```bash
# Mandala Flow — polar twist + domain warp + IQ palette + rotation
cp public/presets/shader-dev-mandala-flow.json public/scene.json

# Sacred Geometry — SDF star + Julia + voronoi + kaleidoscope
cp public/presets/shader-dev-sacred-geometry.json public/scene.json

# Psychedelic Fractal — Julia + Worley veins + 깊은 domain warp
cp public/presets/shader-dev-psychedelic-fractal.json public/scene.json
```

### 3.2 13 단일 기법 프리셋 (학습/실험용)

`public/presets/solo/T1-T13-*.json` — 각 기법만 극대화:

| 프리셋 | 효과 | 추천 용도 |
|--------|------|----------|
| T1-domain-warp | 유기적 소용돌이 | 꿈/환각 씬 |
| T3-polar-twist | 스파이럴/만다라 | 신성/의식 씬 |
| T5-iq-palette | 무한 팔레트 색상 | 색상 시그니처 |
| T7-sdf-star | 별 모양 오버레이 | 사이키델릭 디테일 |
| T8-julia | 프랙탈 무늬 | 수학적 미 |
| T12-worley | 혈관/세포 네트워크 | 생물학적 |

```bash
# 예: 사이키델릭 프랙탈 스타일
cp public/presets/solo/T8-julia.json public/scene.json
```

### 3.3 ⚡ 조합 만들기 (수동 편집)

`public/scene.json` 직접 편집:

```json
{
  "layers": [
    {
      "id": "layer-1",
      "animation": {
        "colorCycle": { "speed": 2, "period": 20, "phaseOffset": 0 },

        "//": "=== Tier 1 기법 조합 ===",
        "domainWarp": 1.8,
        "polarTwist": 2.0,
        "paletteAmount": 0.5,
        "juliaAmount": 0.3,
        "juliaC": [-0.7, 0.27015],
        "worleyAmount": 0.4,

        "//": "=== 기존 파라미터 ===",
        "saturationBoost": 2.2,
        "luminanceKey": 0.6
      }
    }
  ],
  "effects": {
    "bloom": { "strength": 0.45 },

    "_": "=== Tier A 효과 ===",
    "multipassFeedback": {
      "strength": 0.7,
      "warp": 0.3,
      "decay": 0.92,
      "hueShift": 0.02
    },
    "lensDistortion": {
      "barrel": 0.15,
      "chromatic": 1.2,
      "dof": 0.2,
      "vignetteRadius": 0.92
    }
  }
}
```

**파라미터 레퍼런스**: `docs/USAGE-shader-dev-tier-abc.md` 섹션 8 참조.

---

## 4. 브라우저 미리보기

```bash
npm run pipeline:preview
```

### 4.1 확인 URL
```
기본 씬            http://localhost:5299/?mode=layered
특정 프리셋        http://localhost:5299/?mode=layered&scene=/presets/solo/T5-iq-palette.json
전체 프리뷰 갤러리  http://localhost:5299/presets/solo/gallery.html
```

### 4.2 브라우저 녹화 (빠른 테스트)
- **R 키** → webm 녹화 시작
- **R 키** → 중지 + webm 다운로드
- 품질/해상도는 브라우저 기본. 실전 영상은 export-layered 사용

### 4.3 튜닝 팁
- scene.json 수정 후 **브라우저 새로고침** → 즉시 반영
- uniform 값 1개씩만 바꿔가며 효과 학습
- 기본 감도 권장:
  - `domainWarp`: 1.0 (약) / 2.0 (중) / 2.5 (강)
  - `polarTwist`: 1.5 (부드러움) / 3.0 (중) / 5.0 (소용돌이)
  - `paletteAmount`: 0.3 (자연) / 0.6 (변형) / 0.9 (완전 대체)
  - `multipassFeedback.strength`: 0.4 (잔상) / 0.7 (강한 트레일) / 0.9 (카오스)

---

## 5. 풀 해상도 mp4 렌더

### 5.1 실전 프로덕션 렌더
```bash
# 1080×1920, 20초, 30fps, CRF 15 (고품질, Reels/Shorts용)
npm run export:layered -- --title "my-video"
```

### 5.2 옵션
```bash
# fps 변경
npx tsx scripts/export-layered.ts --title "60fps-version" --fps 60

# ProRes 4444 (무손실, 후편집용 .mov, 큰 파일)
npx tsx scripts/export-layered.ts --title "archive" --prores

# 프레임 유지 (디버깅)
npx tsx scripts/export-layered.ts --title "debug" --keep-frames

# 특정 워크디렉토리 사용
npx tsx scripts/export-layered.ts --title "v2" --work-dir /tmp/my-work
```

### 5.3 산출물
```
out/archive/my-video-{YYYYMMDD-HHMMSS}/
├── my-video.mp4       ← 최종 영상
├── scene.json         ← 렌더 시점 설정 스냅샷 (재현성)
└── layers/            ← 사용된 레이어 스냅샷
    ├── layer-0.png
    ├── layer-1.png
    ├── layer-2.png
    └── depth.png
```

### 5.4 소요 시간
- **기본**: 600 frames (20s × 30fps) × 80ms/frame + ffmpeg slow preset
- **~1.5-3분** @ 1080×1920
- ProRes는 2-3배 느리지만 무손실

---

## 6. 빠른 변형 실험 (Gallery 배치 렌더)

### 6.1 모든 프리셋 + 스케치 한번에
```bash
# 21개 mp4 자동 렌더 (~3분, 720×1280 5초 프리뷰 품질)
npx tsx scripts/gallery-render.ts

# 출력
ls out/shader-gallery/
# T1-domain-warp.mp4 ... T13-baseline.mp4   (13 Tier 1 solo)
# cellular.mp4 volumetric.mp4 particles.mp4 fractal-cave.mp4  (4 sketches)
# baseline-pre-A.mp4 baseline-post-A.mp4 mandala-pre-A.mp4 mandala-post-A.mp4  (4 Tier A demo)
```

### 6.2 서브셋만 렌더
```bash
# 스케치만 (cellular/volumetric/particles/fractal-cave)
npx tsx scripts/gallery-render.ts --sketches-only

# Tier A before/after 데모만
npx tsx scripts/gallery-render.ts --tier-a-demo

# Tier A 데모 제외 (13 layered + 4 sketch만)
npx tsx scripts/gallery-render.ts --no-demo
```

---

## 7. 자주 쓰는 실전 시나리오

### 7.1 Reels 포스팅용 최종 영상 (가장 흔함)
```bash
# 1. 이미지 → 레이어
npx tsx scripts/pipeline-pro.ts my-image.png --duration 15

# 2. 프리셋 적용
cp public/presets/shader-dev-mandala-flow.json public/scene.json

# 3. 미리보기 → 만족 시 렌더
npm run pipeline:preview  # 만족하면 Ctrl+C
npm run export:layered -- --title "my-reel"

# 결과: out/archive/my-reel-*/my-reel.mp4 (1080×1920, 15초)
```

### 7.2 여러 변형 비교 후 선택
```bash
# 1. 이미지 분리
npx tsx scripts/pipeline-pro.ts my-image.png

# 2. 갤러리 배치 렌더 (13 Tier 1 프리셋 한번에)
npx tsx scripts/gallery-render.ts

# 3. out/shader-gallery/ 전체 검토 후 맘에 드는 것 선정

# 4. 해당 프리셋으로 풀 해상도 렌더
cp public/presets/solo/T8-julia.json public/scene.json
npm run export:layered -- --title "julia-final"
```

### 7.3 스케치 모드 (이미지 불필요)
이미지 없이 순수 절차적 영상 생성:

```bash
# 1. 브라우저에서 마음에 드는 스케치 확인
npm run pipeline:preview
# → http://localhost:5299/?sketch=fractal-cave
# → http://localhost:5299/?sketch=volumetric
# → http://localhost:5299/?sketch=cellular
# → http://localhost:5299/?sketch=particles

# 2. 갤러리 렌더
npx tsx scripts/gallery-render.ts --sketches-only
# → out/shader-gallery/{cellular,volumetric,particles,fractal-cave}.mp4

# ⚠️ 주의: cellular + particles는 루프 비동기
# — frame[0] ≠ frame[last]. Reels 루프용은 ffmpeg ping-pong 처리
ffmpeg -i cellular.mp4 -filter_complex "[0]reverse[r];[0][r]concat=n=2:v=1[v]" -map "[v]" cellular-pingpong.mp4
```

### 7.4 조합 프리셋 만들어 여러 이미지에 재사용
```bash
# 1. 한 번 수동 튜닝
cp public/presets/shader-dev-mandala-flow.json public/scene.json
# 브라우저에서 scene.json 편집 + 새로고침 반복 → 마음에 드는 조합

# 2. 프리셋으로 저장
cp public/scene.json public/presets/my-custom-style.json

# 3. 다른 이미지에 재사용
npx tsx scripts/pipeline-pro.ts image2.png
cp public/presets/my-custom-style.json public/scene.json
npm run export:layered -- --title "image2-same-style"
```

---

## 8. 문제 해결

### 8.1 pipeline-pro 실패
```
Input not found: ...
```
→ 이미지 경로 확인. 상대 경로는 프로젝트 루트 기준.

```
Replicate API error
```
→ `.env`에 `REPLICATE_API_TOKEN` 확인. 요금제 확인.

### 8.2 브라우저 검은 화면
```bash
# 셰이더 컴파일 확인
npm run check:shaders
```
7/7 PASS 아니면 브라우저 콘솔 (F12) 에러 확인.

### 8.3 렌더 매우 느림
- `--fps 15` or `--fps 24`로 감축
- `ffmpeg -preset fast` 변경 (export-layered.ts 내부 편집 필요)

### 8.4 영상 품질 낮음
- 기본은 CRF 15 (고품질). 더 낮추려면 export-layered.ts에서 `--crf` 값 수정
- ProRes 무손실 원하면 `--prores` 플래그

### 8.5 scene.json 검증 실패
```bash
# 스키마 통과 확인
npx vitest run src/lib/presets.test.ts
```
또는 period 검증 실패 시 → period가 duration의 약수인지 확인 (20 duration → period 1/2/4/5/10/20만 유효).

### 8.6 Tier A 효과 안 보임
기본값이 전부 0 (backward-compat). scene.json effects 블록에 명시해야 적용됨:
```json
"effects": {
  "multipassFeedback": { "strength": 0.7, "warp": 0.3 }
}
```

---

## 9. 파라미터 추천 조합

### 9.1 "Dream" (부드러운 꿈 씬)
```json
{
  "layers": [{ "animation": {
    "domainWarp": 1.2, "polarTwist": 1.5,
    "paletteAmount": 0.4, "saturationBoost": 1.8
  } }],
  "effects": {
    "multipassFeedback": { "strength": 0.5, "warp": 0.2, "decay": 0.95 },
    "bloom": { "strength": 0.5, "threshold": 0.6 }
  }
}
```

### 9.2 "Sacred" (신성/만다라)
```json
{
  "layers": [{ "animation": {
    "polarTwist": 3.5, "rotateSpeed": 0.15,
    "sdfType": 2, "sdfAmount": 0.5,
    "paletteAmount": 0.6
  } }],
  "effects": {
    "kaleidoscope": { "segments": 8, "blend": 0.4 },
    "mandala": { "opacity": 0.15 },
    "godRays": { "intensity": 0.6 }
  }
}
```

### 9.3 "Chaos" (강렬한 환각)
```json
{
  "layers": [{ "animation": {
    "domainWarp": 2.5, "juliaAmount": 0.5,
    "worleyAmount": 0.4, "pixelChaos": 0.7
  } }],
  "effects": {
    "multipassFeedback": { "strength": 0.85, "warp": 0.4, "hueShift": 0.03 },
    "lensDistortion": { "barrel": 0.2, "chromatic": 1.8 },
    "trails": { "strength": 0.3 }
  }
}
```

### 9.4 "Reels 시그니처" (프로덕션 기본)
`public/presets/shader-dev-mandala-flow.json` 그대로 사용.

---

## 10. 전체 명령어 치트시트

```bash
# === 메인 워크플로우 ===
npm run pipeline:pro -- image.png          # 이미지 → 레이어 (Replicate)
npm run pipeline:preview                   # dev 서버 (미리보기)
npm run export:layered -- --title "name"   # 풀 해상도 mp4

# === 검증/디버깅 ===
npm run check:shaders                      # 셰이더 컴파일 검증 (7 mode)
npm run spike:fbo                          # GPU float texture 검증
npm run regress:pixel -- --preset NAME     # 백워드 호환 검증

# === 배치 렌더 ===
npx tsx scripts/gallery-render.ts                    # 21개 전부
npx tsx scripts/gallery-render.ts --sketches-only    # 4 스케치만
npx tsx scripts/gallery-render.ts --tier-a-demo      # 4 Tier A 데모만
npx tsx scripts/gallery-render.ts --no-demo          # 17개 (데모 제외)

# === 스케치 모드 URL ===
# http://localhost:5299/?sketch=fractal-cave
# http://localhost:5299/?sketch=cellular
# http://localhost:5299/?sketch=volumetric
# http://localhost:5299/?sketch=particles

# === 프리셋 URL ===
# http://localhost:5299/?mode=layered&scene=/presets/shader-dev-mandala-flow.json
# http://localhost:5299/?mode=layered&scene=/presets/solo/T8-julia.json
# http://localhost:5299/presets/solo/gallery.html   ← 전체 iframe 그리드

# === 기타 ===
npm run analyze:track                      # 오디오 FFT 분석
npm run acid                              # AI 이미지 재해석
```

---

## 11. 관련 문서

- **상세 사용법**: `docs/USAGE-shader-dev-tier-abc.md` (512 lines, 파라미터 표)
- **기법 매뉴얼**: `docs/shader-dev-manual.md` (31 기법 레퍼런스)
- **PRD**: `docs/prd/PRD-shader-dev-tier-abc.md`
- **완료 보고서**: `docs/tickets/shader-dev-tier-abc/COMPLETION-REPORT.md`

---

**팁**: 처음 3-5번은 프리셋 그대로 쓰고 결과만 확인 → 파라미터 감각 잡은 후 수동 편집/조합으로 넘어가는 것 추천.
