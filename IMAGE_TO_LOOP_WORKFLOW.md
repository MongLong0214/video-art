# 이미지 → 사이키델릭 루프 워크플로우 (에이전트 이식용)

> **목적**: Isaac이 이미지 1장을 던지면 → 20초 seamless 사이키델릭 루프 mp4를 뽑는 전체 작업 방식.
> 이 문서 하나로 **어떤 에이전트든 Isaac과 동일하게** 작업할 수 있게 만든 자립형 플레이북.
> 기술 심화(파이프라인 내부/톤프리셋/로컬폴백)는 [`LAYERED_PIPELINE_PLAYBOOK.md`], 소스별 튜닝 로그는 [`PER_IMAGE_TUNING_GUIDE.md`] 참조.
> 표준: 소스 대개 1632×2912(9:16), duration 20s, fps 30.

---

## 0. 절대 원칙 (먼저 읽어라)

1. **레시피는 소스 타입별로 다르다 — 만능 설정은 없다.** 한 소스에서 최고인 설정이 다른 소스에선 최악이 된다. 이게 이 작업의 제1법칙. 매번 §2 의사결정 트리로 타입부터 분류하라.
2. **이미지 핑계 금지.** "이 소스는 파이프라인에 안 맞아"는 답이 아니다. 소스 타입에 맞는 레시피를 찾아 반드시 결과를 낸다.
3. **AI 영상 생성 금지.** Replicate Kling/wan/seedance/hailuo 등 img2video 전부 Isaac이 거부함. **GLSL 파이프라인만** 쓴다.
4. **과처리 금지, 애매하면 보존(preserve).** 가르시(네온 아수라장)/머디/어두움 = 즉시 거부당함. 소스가 이미 예쁘면 색을 갈아엎지 말고 애니메이션만 입혀라.
5. **결과로 증명.** 프레임 추출해서 직접 보고, 솔직하게(트레이드오프 포함) 제시하고, Isaac이 결과물로 판단하게 한다. 설명 길게 말고 간결히.
6. **Isaac이 "이게 최애다"라고 한 레시피는 새 소스에 기본으로 적용하라.** 네 판단으로 멋대로 다른 레시피(예: 혼자 "이건 보존이 맞아")로 바꾸지 마라 — 실제로 별로일 때만 바꾼다. (세션에서 이걸로 여러 번 혼남.)

---

## 1. 전체 절차 (한눈에)

```
1) 이미지 받기       → sips 썸네일 → Read로 눈으로 확인
2) 소스 타입 분류    → §2 의사결정 트리 (제일 중요한 단계)
3) 단일레이어 vs 분해 → §3
4) 레시피 선택       → §4 레시피 라이브러리에서 타입에 맞는 것 복사
5) scene.json 작성   → 해상도 = 소스 실제 dims (★자주 실수)
6) 렌더             → export-layered.ts
7) 프레임 리뷰       → §6 (빠른흐름=서브초 샘플)
8) 이상하면 진단     → §5 실패 카탈로그로 원인→수정
9) 승인되면 오디오    → §7
```

---

## 2. ⭐ 소스 타입 → 레시피 의사결정 트리 (핵심)

이미지를 보고 아래에서 하나로 분류한다:

| 소스 타입 | 특징 | → 레시피 | 레이어 |
|-----------|------|----------|--------|
| **흐르는 컬러풀/비비드** | 이미 화려한 무지개, 흐르는 마블/리퀴드, 홀로그램 눈-잎사귀, 이리데센트 | **A-dev2 (빠른흐름)** 또는 **B-fast** | 단일 |
| **어둡거나 블루지배 + 구조 있음** | 짙은 블루/틸, 어두운데 형태 뚜렷 | **B-fast** (valueLift가 밝혀줌) | 단일 |
| **우아한 파스텔/홀로그램** | 섬세한 색 조화(파스텔 부처, 홀로그램 얼굴), 부드러운 그라데이션 | **preserve (animate-don't-repaint)** | 단일 |
| **부처/인물 조각상** | 오렌지-레인보우 부처, 석상, 골드/블루 조각 | **rainbuddha2 (느린 디졸브)** — 안 되면 preserve+웜 | 3레이어 분해 |
| **블랙 톤 지배** | 화면 대부분 검정 | 원칙적 제외. 굳이면 valueLift 세게 | 단일 |

**타입 판별 힌트:**
- 소스가 **이미 완성된 사이키델릭 아트**(대부분의 경우) → hue를 풀스펙트럼으로 돌리면 우아함이 깨진다. 보존 우위로 가라.
- 소스에 **흐르는 색선/마블 텍스처**가 있으면 → colorCycle로 그 색을 "흐르게" 하는 게 잘 먹힌다.
- **골드/블루 지배 조각상** → hue회전이 반드시 **그린데드존**으로 빠진다. hueKey 낮추거나 웜 팔레트로 그린 차단.
- **파스텔/의도된 색 조화** → 조금만 recolor해도 싸구려 네온이 된다. paletteAmount 극도로 낮게.

---

## 3. 단일레이어 vs 3레이어 분해

### 단일레이어 (기본값)
원본 PNG를 통짜로 `layers/layer-0.png`에 복사. **매트 어둡힘 없음 → 밝기·디테일 보존.** 완성된 비비드 아트는 거의 다 이걸로.
```bash
mkdir -p /tmp/WORK/layers
cp "SOURCE.PNG" /tmp/WORK/layers/layer-0.png
# scene.json은 layers:[{id:"layer-0", file:"layers/layer-0.png", ...}] 단일
```

### 3레이어 분해 (rainbuddha2 스타일 전용)
`pipeline-pro.ts`가 bg/subject/light-rays로 분리 → 레이어별 **다른 colorCycle 속도**로 층층이 디졸브(rainbuddha2의 시네마틱 감의 원천).
```bash
npx tsx scripts/pipeline-pro.ts "SOURCE.PNG" --work-dir /tmp/WORK --duration 20 --fps 30
```
⚠️ **함정: bria 매트가 피사체(subject)를 어둡게 깎는다.** 밝은 소스를 분해하면 피사체가 칙칙해짐. 그래서 밝기가 중요하면 단일레이어. 분해는 rainbuddha2 느린-디졸브 룩이 필요할 때만.

---

## 4. ⭐ 레시피 라이브러리 (검증된 것, 그대로 복사)

모두 `scene.json`의 레이어 `animation` + `effects`. 각 레시피는 Isaac이 승인한 실제 값.

### A) `peacock-b-fast` — 빠른흐름 + 밝힘 (어둡/블루/컬러풀 소스). **Isaac 최애.**
단일레이어.
```jsonc
animation: {
  colorCycle:{speed:14, period:20, phaseOffset:0},   // 빠른 흐름
  saturationBoost:1.8, valueLift:0.22,               // ★valueLift가 어두운 소스 밝힘
  luminanceKey:0.45, hueKey:1.3, hueSpeed:2.5, satInjectionMul:0,
  paletteAmount:0.42, paletteValueFloor:0.32, paletteSatFloor:0.6,
  breath:{amplitude:0.006, frequency:1, period:20}
}
effects: {
  bloom:{strength:0.7, radius:0.55, threshold:0.5},
  chromaticAberration:{offset:0.3, modulationOffset:0.06},
  multipassFeedback:{strength:0.3, warp:0.04, decay:0.93, hueShift:0.02, zoom:1.0, rotate:0},
  filmGrade:{grain:0, contrast:1.03, sCurve:0.06, vignetteIntensity:0}
}
```

### B) `peacock-a-dev2` — 빠른흐름 + 스월 (이미 밝은 컬러풀 소스).
단일레이어. B-fast보다 빠르고(cycle 20) 휘감김(스월)이 강함.
```jsonc
animation: {
  colorCycle:{speed:20, period:20, phaseOffset:0},
  saturationBoost:1.6, valueLift:0, luminanceKey:0.45,
  hueKey:1.6, hueSpeed:2.5, satInjectionMul:0,
  paletteAmount:0.34, paletteValueFloor:0.28, paletteSatFloor:0.62,
  breath:{amplitude:0.006, frequency:1, period:20}
}
effects: {
  bloom:{strength:0.82, radius:0.55, threshold:0.48},
  chromaticAberration:{offset:0.34, modulationOffset:0.07},
  multipassFeedback:{strength:0.42, warp:0.11, decay:0.93, hueShift:0.03, zoom:1.0, rotate:0.016},
  filmGrade:{grain:0, contrast:1.04, sCurve:0.06, vignetteIntensity:0}
}
```

### C) `rainbuddha2` — 느린 디졸브 (부처/인물, 시네마틱). **3레이어 분해 필수.**
레이어별로 colorCycle 속도/위상만 다르고 나머지는 공통.
```jsonc
// 공통(모든 레이어): saturationBoost:1.6, hueKey:1.2, hueSpeed:2.6, satInjectionMul:0,
//                    paletteAmount:0.25, paletteValueFloor:0.15, paletteSatFloor:0, bicubicFilter:true, valueLift:0
layer-0(bg):      colorCycle:{speed:6, period:20, phaseOffset:0},   luminanceKey:0.48, lumExponent:0.9,  glow:0
layer-1(subject): colorCycle:{speed:8, period:20, phaseOffset:120}, luminanceKey:0.55, lumExponent:0.84, glow:{intensity:0.1}
layer-2(rays):    colorCycle:{speed:4, period:20, phaseOffset:240}, luminanceKey:0.3,  lumExponent:0.82, glow:0
effects: {
  bloom:{strength:0.6, radius:0.8, threshold:0.55},
  chromaticAberration:{offset:1.0, modulationOffset:0.15},   // ★강한 CA = 홀로그램 엣지
  multipassFeedback:{strength:0, ...},                       // rb2는 피드백 안 씀
  filmGrade:{grain:0, vignetteIntensity:0.14, vignetteRadius:1.08,
             vignetteTintR:0.16, vignetteTintG:0.05, vignetteTintB:0.04, contrast:1.025, sCurve:0.08}  // 웜 비네트
}
```

### D) `preserve` (animate-don't-repaint) — 우아한 파스텔/완성 비비드.
단일레이어. **색을 거의 안 건드리고** 모션만 입힌다. 색회전이 소스를 망치는 소스에.
```jsonc
animation: {
  colorCycle:{speed:0, period:20, phaseOffset:0},   // 0 = 색 안 돌림 (또는 아주 느리게 2~6)
  saturationBoost:1.05, valueLift:0, luminanceKey:0,
  hueKey:0, hueSpeed:1, satInjectionMul:0,
  paletteAmount:0.0~0.12, paletteValueFloor:0.15, paletteSatFloor:0.1,
  glow:{intensity:0.05, pulse:0.4, period:4}, glowPulseFloor:0.3,   // 글로우 맥동
  breath:{amplitude:0.012, frequency:1, period:20}                 // 숨쉬기
}
effects: {
  bloom:{strength:0.45, radius:0.5, threshold:0.6},
  chromaticAberration:{offset:0.14, modulationOffset:0.04},
  multipassFeedback:{strength:0.38, warp:0.07, decay:0.95, hueShift:0.02, zoom:1.0, rotate:0.008}  // 흐르는 트레일
}
```
**모션 원천**: colorCycle이 아니라 feedback 트레일 + breath + glow 맥동. 색흐름은 없지만 최대 밝기·충실도.

---

## 5. ⭐ 실패 카탈로그 (증상 → 원인 → 수정)

| 증상 | 원인 | 수정 |
|------|------|------|
| 우아한 파스텔이 싸구려 네온 아수라장 | 과도한 recolor (satBoost/hueKey/palAmt 높음) | **preserve**로 (satBoost≈1.05, hueKey≤0.3, palAmt≤0.12) |
| 골드/블루 조각상이 **머디 그린**으로 뭉갬 | hue회전이 **그린데드존** 통과 | hueKey↓(0.4~0.7) + 웜/no-green 팔레트, 또는 preserve |
| **피사체가 어둡다** | 3레이어 분해 매트가 subject 깎음 | **단일레이어 원본**으로 |
| 전체 어두운 톤 / 네이비로 가라앉음 | 팔레트 다크위상 (+ ACES 톤매핑) | valueLift↑ + paletteValueFloor↑(0.25~0.3) |
| **무지개 스페클 노이즈**(자글자글) | busy 텍스처에 hueKey 너무 높음 | hueKey↓ (1.0~1.5). 텍스처 밀도의 역수로 |
| "탁한 밝음"(밝은데 칙칙) | value만 올리고 채도 안 올림 | paletteSatFloor↑ (0.5~0.6) |
| 빠른 색흐름이 **정적/워시아웃** | feedback 너무 강함 → 시간축 색 평균화 | feedback strength↓ (≤0.42) |
| **여러 버전이 다 똑같아 보임** | (a)레버가 미묘 (b)정수초에 프레임 샘플 | (a)각 레버 극단으로 (b)**서브초 샘플**(§6) |
| 매끈한 컬러풀 면에 무지개 픽셀 클럼프 | satInjectionMul 강제 주입 | **satInjectionMul=0** (컬러풀 소스 필수) |
| 배경(연한 단색)이 색순환 중 그린 뜸 | 매끈 배경이 hue회전으로 그린 통과 | 배경 hueKey↓ / no-green 팔레트 / 배경 colorCycle 정지 |

---

## 6. 프레임 리뷰 (확인 방법)

```bash
OUT="out/layered/DATE_TITLE-HASH/TITLE.mp4"
ffmpeg -y -ss <sec> -i "$OUT" -frames:v 1 -vf "scale=180:-1" /tmp/f.png   # 그 다음 Read /tmp/f.png
```
- **빠른 흐름(cycle 14~22)** → **서브초 간격**으로 샘플: t=6.0/6.2/6.4/6.6/6.8. ★정수초(6,7,8)로 뽑으면 speed≈period일 때 **같은 위상**이 걸려 "안 변한다"고 착각한다 (세션에서 실제로 헤맴).
- **느린 디졸브/보존** → 루프 전반: t=3/10/17.
- 모션 차이(스월/줌/펄스)는 **스틸로 안 보인다** — 재생해야 함. 스틸로 판단 강요 말 것.

---

## 7. 오디오 합성

```bash
ffmpeg -y -i VIDEO.mp4 -ss START_SEC -i "AUDIO.wav" \
  -map 0:v:0 -map 1:a:0 -t 20 -c:v copy -c:a aac -b:a 320k \
  -af "afade=t=out:st=19.5:d=0.5" OUT.mp4
```
- `-ss START_SEC`(오디오 -i 앞) = 곡의 그 지점부터 사용. `-t 20` = 영상 길이. `-c:v copy` = 영상 무손실. 끝 0.5s 페이드아웃.

---

## 8. 마스터 노브 치트시트 (`src/shaders/layer.frag` / `scene-schema.ts`)

| 노브 | 역할 | 값 감각 |
|------|------|---------|
| `colorCycle.speed` | **유일한 시간축 색흐름 레버.** | 14~22 빠름, 4~8 느린디졸브, 0 정지. **seamless: (duration/period)*speed = 정수** |
| `colorCycle.period` | 루프 주기 (duration의 약수) | 20 표준 |
| `hueSpeed` | **공간** hue 분산 (이름과 달리 시간 아님) | 2.5 표준 |
| `hueKey` | 공간 hue 분산 강도 | 낮게(0.3~1.3): busy텍스처/그린회피. 높으면(>3) 무지개 스페클 |
| `paletteAmount` | 리컬러(팔레트) 강도 | 0=소스색 보존, 0.1~0.25 보존우위, 0.4+ 리컬러지배 |
| `valueLift` | 어두운 픽셀만 들어올림 | 어두운 소스 0.2~0.22, 밝은 소스 0 |
| `paletteValueFloor` | 팔레트 밝기 하한 (다크위상 방지) | 0.15~0.32 |
| `paletteSatFloor` | 팔레트 채도 하한 (머디/올리브 제거) | 0=자연, 0.5~0.6 강제비비드 |
| `saturationBoost` | 채도 부스트 | 컬러풀 소스 ≤1.9(클럼프가드), 어두운소스 1.8 |
| `satInjectionMul` | 저채도 영역 색 주입 | **컬러풀 소스=0** (안 그러면 클럼프) |
| `multipassFeedback` | 모션/스월/트레일 | strength 0.3~0.42. 과하면 빠른흐름 워시아웃 |
| `paletteA/B/C/D` | IQ 코사인 팔레트 무드 | 무드 바꿀 때. 웜: D≈[0,0.12,0.27] |
| ⚠️ `breath/scalePulse/rotateSpeed/폴라` | 기하 모션 | 미세하게만. 과하면 "저급" 거부 |

렌더 실행:
```bash
npx tsx scripts/export-layered.ts --title "NAME" --work-dir /tmp/WORK --fps 30
# 옵션: --tonemap none (ACES 끄기, 채도 강한 소스 보존용) / --prores / --duration
```

---

## 9. 여러 버전 뽑을 때

- Isaac이 "여러 버전"을 요청하면 **각 버전을 확실히 다르게** 만들어라. 미묘한 차이는 "다 똑같다"고 거부당한다.
- 버전 축 예시: **밝기(valueLift)** / **채도(satBoost+satFloor)** / **속도(colorCycle)** / **무드(팔레트 A~D)** / **preserve↔flow**.
- 렌더는 여러 개 순차/백그라운드로. 각자 `--work-dir` 다르면 동적 포트로 병렬 가능.
- 각 버전 프레임 뽑아서 표로 정리해 제시. 솔직한 트레이드오프 포함.

---

## 10. 알려진 승인작 (레퍼런스)

| 이름 | 소스 타입 | 레시피 | 반응 |
|------|-----------|--------|------|
| `peacock-b-fast` | 블루 눈-잎사귀 | B-fast(§4A) | "젤 맘에들어" (최애) |
| `peacock-a-dev2` | 레인보우 피콕 눈-잎사귀 | A-dev2(§4B) | "이 방향 맞다" |
| `rainbuddha2-clean` | 오렌지 레인보우 부처 | rainbuddha2(§4C) | "아주 맘에들어" (Lightyears 음악) |

**교훈**: ①② 눈-잎사귀 = 빠른흐름 단일레이어. ③ 부처 = 느린디졸브 3레이어. **소스 타입이 레시피를 결정한다.**

---

## 11. 환경/함정 체크리스트

- `.env`의 `REPLICATE_API_TOKEN` + 크레딧 필요(분해 시). **402/429 = 크레딧/스로틀** → 순차 실행 + 재시도, 또는 단일레이어로 회피.
- **scene.json `resolution`은 소스 실제 dims와 일치**해야 함. (틀리면 왜곡/크롭 — 세션에서 1120×1920 오타로 실수함. `sips -g pixelWidth -g pixelHeight`로 확인.)
- 임시 tsx 스크립트가 repo 모듈(`scene-presets`/`sharp` 등) import하면 **repo 트리 안**에 둬야 resolve됨 (`/tmp`에선 MODULE_NOT_FOUND).
- 출력: `out/layered/<date>_<title>-<hash>/<title>.mp4` (+ layers/scene.json 스냅샷). `out/`은 gitignore.
- 렌더는 헤드리스 크롬+WebGL, ~1080폭으로 다운스케일 출력됨. 600프레임 ~2-3분.

---

## 12. 톤 (Isaac 미학)

- **밝고 쨍한(vivid) 것** 선호. "어두운 톤" 극혐. 단 "탁한 밝음"(칙칙하게 밝은 것)도 거부 → 밝기+채도 둘 다.
- **살아있어야** 함(정적 거부) — 단 스트로브/기하 모션 저급으로 거부. 색흐름 or 은은한 트레일/숨쉬기로 생동감.
- 과처리·가르시·머디·그린 전부 거부. 애매하면 보존.
- 간결하게 소통. 결과물 먼저.
