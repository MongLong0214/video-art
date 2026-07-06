---
name: layered-pipeline
description: >
  Layered psychedelic video pipeline — 이미지 1장으로 사이키델릭 루프 영상 생성.
  Use when user says "파이프라인 돌려", "영상 만들어", "layered pipeline", "generate video",
  or provides an image file and wants a psychedelic loop video.
  Triggers: /layered-pipeline, /lp, image path + "영상", "비디오", "render", "pipeline"
---

# Layered Pipeline

이미지 1장 → 소스별 레시피로 scene.json → 프레임캡처 → mp4 출력.

## ⭐ START HERE — `IMAGE_TO_LOOP_WORKFLOW.md` (repo 루트)

전체 작업 방식(의사결정 트리 · 소스타입별 검증 레시피 · 실패 카탈로그 · 행동 규칙)은 **`IMAGE_TO_LOOP_WORKFLOW.md`가 정본**이다. 이미지를 받으면 그 문서 §2 의사결정 트리로 타입 분류 → §4 레시피 복사 → 렌더 → §6 리뷰. 이 SKILL은 실행 명령/게이트 보조.

> **2026-07 방향 정정 (Isaac 지시로 이전 문서 일부 폐기):**
> - **"이미지 핑계·게이트 차단 금지"** — 아래 소스 게이트로 렌더를 *막지* 마라. 부적합해 보여도 소스 타입에 맞는 레시피(특히 preserve)로 반드시 결과를 낸다. 게이트는 "차단"이 아니라 "타입 판별"용으로만.
> - **단일레이어가 기본값** — 3레이어 분해는 bria 매트가 피사체를 어둡게 깎는다. 완성 비비드 아트는 원본 통짜 단일레이어로. 분해는 rainbuddha2 느린-디졸브 룩 전용.
> - **빠른 색흐름이 주력 방향** (colorCycle 14~22). 옛 PLAYBOOK의 "colorCycle이 유일 모션 / 기하모션 금지"는 유효하나, 색흐름 속도는 이제 적극적으로 올린다.
> - AI img2video 전면 금지(Isaac 거부). GLSL만.

## ⚠️ MANDATORY — 자가발전 폐회로 (읽기-게이트 → 작업 → 쓰기, 예외 없이)

> 로그는 **쓰기만** 한다. 루프는 **읽어서 행동을 막거나 바꾼다.** 둘 다 강제다.

### A. 작업 전 — 읽기 게이트 (렌더/크레딧 쓰기 전 필수, 건너뛰면 위반)
1. `PER_IMAGE_TUNING_GUIDE.md` **§2 + §9 로그를 먼저 읽는다.**
2. **소스를 §2 ❌ 기준에 대조해 점수 매긴다**: ①회색/석상 hero ②큰 매끈 창백면(하늘·흰옷·피부) ③전체 mid-dark 휘도 ④busy 잔디테일/스페클 ⑤무채색 ⑥블루 지배 배경 ⑦단일 portrait(딥블랙 아님) ⑧**이미 완성된 비비드 사이키델릭 스틸**(전면 무지개/오일슬릭). **⚠️ 반증(2026-06-23, rainbuddha #13·#14)**: ⑧ **단독은 차단 사유 아님** — 목표가 *개선*이 아니라 ***애니메이션(움직이는 루프)***이면 **그레인 없는 매끈-흐름 소스**는 "리페인트 말고 애니메이션"(paletteAmount↓0.25·hueKey↓1.2·느린 디졸브·satInj0·bloom/CA)으로 깨끗하게 살아남. **진짜 차단 사유는 ⑧이 아니라 ④(그레인/스페클 전면)**. shroom·rbface가 망한 것도 ⑧이 아니라 그레인+aggressive 리컬러 탓. **⑧+④ 동반일 때만 차단, ⑧ 단독이면 animate 시도.**
3. **❌ 2개 이상이면 렌더하지 말고 즉시 사용자에게 보고** — 왜 부적합한지 + (있으면) 유일한 우회로(palette 휘도리매핑·요소분리)만 제시하고 **사용자 확인을 받은 뒤** 진행. (eyestack에서 4번 헛렌더한 비용 = 이 게이트로 0이 됐어야 함.)
4. 통과하면 §2/§5로 **소스 타입 → 시작 레시피**를 정한다 (유사 소스 §9 선례 활용).

### B. 작업 후 — 쓰기 (렌더 1건 끝날 때마다, 실패·거부 포함)
5. **§9 로그 1행**: 날짜 · 소스 · 타입 · 레시피/핵심값 · 판정(★/good/별로/muddy/❌) · 교훈. **신뢰도 태그 필수**: `[n=1 가설]` vs `[n≥3 법칙]`.
6. **승격 규칙**: 본문(§2/§3/§5)에 "법칙"으로 올리려면 **서로 다른 소스 3건+에서 재확인(n≥3)**돼야 한다. n=1은 §9에 "가설"로만 둔다 (과일반화 금지 — G를 portrait 1장으로 §5 승격했다가 배치에서 반박된 사례).
7. **반증 우선**: 기존 본문 법칙과 어긋나는 결과가 나오면 **그 법칙 옆에 반증 1줄을 즉시 단다**(삭제 말고 단서 추가). 자가교정이 루프의 핵심.
8. **증류**: §9-3 행이 같은 소스로 5개+ 쌓이면 → 1개 결론 행으로 접고 나머지는 삭제(append-only 노이즈 방지).

> 목적: 매 작업이 가이드를 키우고(쓰기) **동시에 다음 작업의 삽질을 막는다(읽기 게이트).** 게이트 없는 루프 = 그냥 로그.

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

### 0. 소스 게이트 (MANDATORY — 레이어 생성/크레딧 전)

위 **A. 읽기 게이트** 실행: §2 ❌ 기준 대조 → ❌ 2개 이상이면 렌더 중단하고 사용자에게 보고·확인. 통과 시에만 1번으로.

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