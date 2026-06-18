---
name: layered-pipeline
description: >
  Layered psychedelic video pipeline — 이미지 1장으로 사이키델릭 루프 영상 생성.
  Use when user says "파이프라인 돌려", "영상 만들어", "layered pipeline", "generate video",
  or provides an image file and wants a psychedelic loop video.
  Triggers: /layered-pipeline, /lp, image path + "영상", "비디오", "render", "pipeline"
---

# Layered Pipeline

이미지 1장 → Replicate AI 레이어 분해 → 소스별 레시피로 scene.json → 프레임캡처 → mp4 출력.

## ⚠️ MANDATORY — 자가발전 루프 (매 이미지 작업마다 예외 없이)

**이미지 작업(렌더 시도) 1건을 끝낼 때마다 반드시 `PER_IMAGE_TUNING_GUIDE.md`(repo 루트)를 업데이트한다.**
이 단계를 건너뛰면 작업 미완료로 간주한다.

1. **§9 작업 로그에 1행 추가**: 날짜 · 소스파일 · 소스타입(§2 분류) · 사용 레시피/핵심 파라미터 · 결과판정(★최고/good/별로/muddy) · 효과 있던 조정 + 새 교훈.
2. **일반화 가능한 패턴이면 본문 반영**: §2 타입표 / §3 노브 안전범위 / §5 레시피에 추가·수정.
3. 렌더가 **실패하거나 사용자가 거부해도** 기록한다 ("무엇이 왜 안 됐는지"도 학습 데이터다).
4. 작업 시작 전에는 **§2·§5를 먼저 읽고** 소스 분류 → 시작 레시피를 정한다 (과거 로그를 활용).

> 목적: 작업할수록 가이드가 성장하는 자가발전 루프. 매 작업 = 가이드 최소 1행 성장.

## Usage

```
/layered-pipeline /path/to/image.png
```

## 레시피는 소스별로 다르다 (핵심 — 고정 모드 없음)

색 설정은 단일 모드가 아니라 **소스 성격에 따라 다른 패밀리를 쓴다.** 작업 전 반드시
`PER_IMAGE_TUNING_GUIDE.md`(repo 루트)를 읽고:
1. **§2 소스 분류** (다크볼드 / 컬러풀 / 밝은바디 / 무드 / 완성아트 / 창백·잔디테일)
2. **§5 레시피 패밀리 선택**: A clean · B prism · C enterprise · D bright-punch · E elegant · F preserve
3. **마스터 노브 = `hueKey×hueSpeed`** (§3): 컬러풀→낮게(≤6), 다크볼드→높게(>50).

> ⚠️ named 톤 프리셋(prism-sunset/commercial/elegant)은 컬러풀 소스에 **과조리(진흙)**된다. 맹신 말고 가이드 §5 값으로 scene.json을 오버라이드하라.

## Workflow

### 1. Validate input

```bash
file "$IMAGE_PATH"   # PNG/JPG 확인
```
PNG 아니면 변환:
```bash
npx tsx -e "import sharp from 'sharp'; sharp('$IMAGE_PATH').png().toFile('input.png').then(()=>console.log('ok'))"
```

### 2. 레이어 생성 (Replicate — `REPLICATE_API_TOKEN` in .env)

```bash
npx tsx scripts/pipeline-pro.ts "$IMAGE_PATH" --work-dir <workDir> --duration 20 --fps 30
```
내부: ① bria 매트 → ② (소스<타겟일 때만) ESRGAN 업스케일 → ③ flux-fill 배경 인페인트 → ④ 휘도분리 layer-0(bg)/1(어두움)/2(밝음) → ⑤ tone preset로 scene.json.
- **저크레딧(<$5)**: Replicate가 "분당 6요청·burst 1"로 쓰로틀(429). 여러 장은 **순차 실행**(병렬 금지).
- depth 단계 없음(parallax=0이라 무용). 레이어는 1회 생성 후 **재사용**(파라미터 반복은 크레딧 0).

### 3. 레시피 적용 (scene.json 오버라이드)

가이드 §5에서 고른 패밀리 값으로 `<workDir>/scene.json`의 색 파라미터(satInjectionMul·saturationBoost·hueKey·hueSpeed·colorCycle·effects) 수정. 핵심 요소를 살리려면 §4 요소분리(색마스크 4번째 레이어).

### 4. Export

```bash
npx tsx scripts/export-layered.ts --title "$TITLE" --work-dir <workDir> --fps 30
```
판정은 풀렌더 대신 프레임으로 빠르게: `ffmpeg -ss 5 -i out.mp4 -frames:v 1 frame.png` → 확인 → 파라미터 조정 반복.

### 5. (선택) 오디오 합치기

```bash
ffmpeg -i v.mp4 -ss <start> -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest out-audio.mp4
```

### 6. ⚠️ MANDATORY — 가이드 업데이트 (작업 종료 조건)

렌더 결과 확인 후 **반드시** `PER_IMAGE_TUNING_GUIDE.md` §9 로그에 1행 추가 + 새 패턴이면 본문 반영.
(상단 MANDATORY 규칙 참조.) 이 단계를 안 하면 작업이 끝난 게 아니다.

## Options (pipeline-pro / export-layered)

| Flag | Default | Description |
|------|---------|-------------|
| `--work-dir <dir>` | public/ | 격리 작업폴더 (병렬·재사용·아카이브) |
| `--tone <name>` | prism-sunset | preset 톤. ⚠️ 컬러풀엔 과조리 — §5 오버라이드 권장 |
| `--duration N` | 20 | 루프 길이 (1-300) |
| `--fps N` | 30 | 프레임레이트 (1-120) |
| `--title NAME` | filename | 출력 제목 |
| `--prores` | off | ProRes 마스터 (20초≈4.5GB, 보통 H.264로 충분) |
| `--keep-frames` | off | 캡처 PNG 보존 |

## Prerequisites

- `REPLICATE_API_TOKEN` in `.env`
- `ffmpeg` installed · `npx`, `node >=18`

## Error handling

- Token 없음 → `REPLICATE_API_TOKEN` 설정 요청
- 크레딧 부족(402)/쓰로틀(429) → 크레딧 확인 + **순차 실행**
- `ffmpeg` 없음 → `brew install ffmpeg`
- Replicate 실패 → `withRetry` 자동 재시도