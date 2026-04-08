---
name: layered-pipeline
description: >
  Layered psychedelic video pipeline — 이미지 1장으로 사이키델릭 루프 영상 생성.
  Use when user says "파이프라인 돌려", "영상 만들어", "layered pipeline", "generate video",
  or provides an image file and wants a psychedelic loop video.
  Triggers: /layered-pipeline, /lp, image path + "영상", "비디오", "render", "pipeline"
---

# Layered Pipeline

이미지 1장 → Replicate AI 처리 → palette 추출 → scene.json → 프레임캡처 → mp4 출력.

## Usage

```
/layered-pipeline /path/to/image.png
/layered-pipeline /path/to/image.png classic
```

## Color Modes

| Mode | Usage | Description |
|------|-------|-------------|
| **palette** (default) | `image.png` | 원본 이미지의 dominant hue만 사용. 원본 톤 유지 |
| **classic** | `image.png classic` | 무지개 전체 스펙트럼 hue 회전. 기존 방식 |

## Workflow

### 1. Validate input

```bash
# Verify image exists and is PNG/JPG
file "$IMAGE_PATH"
```

If not PNG, convert:
```bash
npx tsx -e "import sharp from 'sharp'; sharp('$IMAGE_PATH').png().toFile('input.png').then(() => console.log('converted'))"
```

### 2. Run pro pipeline (Replicate API — requires REPLICATE_API_TOKEN in .env)

```bash
npx tsx scripts/pipeline-pro.ts "$IMAGE_PATH" --duration 20 --fps 30
# or with classic mode:
npx tsx scripts/pipeline-pro.ts "$IMAGE_PATH" classic --duration 20 --fps 30
```

Steps executed internally:
1. `bria/remove-background` — foreground extraction
2. `Real-ESRGAN 2x` — foreground upscale
3. `flux-fill-pro` — background inpainting
4. `Real-ESRGAN 2x` — background upscale
5. `depth-anything-v2` — depth map
6. `extractPalette()` — dominant hue extraction per layer
7. Write `scene.json` with layers + palette

### 3. Preview (optional)

```bash
npx vite --port 5173
# Open http://localhost:5173/?mode=layered
```

### 4. Export video

```bash
npx tsx scripts/export-layered.ts --title "$TITLE" --fps 30
```

Output: `out/layered-{title}-{timestamp}.mp4`

### 5. Or run all-in-one

```bash
npx tsx scripts/pipeline.ts "$IMAGE_PATH" --title "$TITLE" --fps 30 --no-preview
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--duration N` | 20 | Loop duration in seconds (1-300) |
| `--fps N` | 30 | Frames per second (1-120) |
| `--title NAME` | filename | Output video title |
| `--prores` | off | ProRes output instead of H.264 |
| `--keep-frames` | off | Keep captured PNG frames |
| `--no-preview` | off | Skip interactive preview step |
| `classic` (2nd arg) | palette | 두 번째 인자로 `classic` 전달 시 무지개 전체 |
| `--production` | off | Enforce version pins |

## Prerequisites

- `REPLICATE_API_TOKEN` in `.env`
- `ffmpeg` installed
- `npx`, `node >=18`

## Error handling

- Missing `.env` or token → prompt user to set `REPLICATE_API_TOKEN`
- Missing `ffmpeg` → `brew install ffmpeg`
- Replicate API failure → auto-retry (built into `withRetry`)