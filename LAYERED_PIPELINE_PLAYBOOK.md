# Layered Psychedelic Pipeline — Playbook & Knowledge

> 이미지 1장 → AI 레이어 분리 → GLSL 사이키델릭 셰이딩 → 20초 seamless 루프 mp4.
> 이 문서는 운영 지식 + 세션 학습을 담아 새 컨텍스트/다른 머신에서도 동일 조건으로 작업하기 위한 것.
> 해상도 표준 1632×2912 (9:16), duration 20s, fps 30.

---

## 1. 2단계 파이프라인

### Stage A — `scripts/pipeline-pro.ts` (Replicate API, 유료 + 크레딧 필요)
이미지 → 레이어 PNG + `public/scene.json` 생성. 내부 단계:
1. `bria/remove-background` — 전경 추출 (alpha matte)
2. `Real-ESRGAN 2x` — 전경 업스케일
3. `flux-fill-pro` — 배경 인페인팅 (전경 제거 영역 채움)
4. `Real-ESRGAN 2x` — 배경 업스케일
5. `depth-anything-v2` — 뎁스맵 (현재 렌더엔 미사용; parallax/haze 0이면 불필요)
6. `extractPalette()` — 레이어별 dominant hue (로컬)
7. tone preset로 `scene.json` 작성

실행: `npx tsx scripts/pipeline-pro.ts "<img>" --tone prism-sunset --duration 20 --fps 30`
필수: `.env`의 `REPLICATE_API_TOKEN` + Replicate 크레딧. **402 Payment Required = 크레딧 소진** → §7 로컬 폴백 사용.

### Stage B — `scripts/export-layered.ts` (로컬, 무료)
`public/`(또는 `--work-dir`)의 scene.json + layers를 헤드리스 Three.js로 600프레임 렌더 → ffmpeg mp4.
실행: `npx tsx scripts/export-layered.ts --title "<name>" --fps 30`
출력: `out/layered/<date>_<title>-<hash>/<title>.mp4` (+ layers/scene.json 스냅샷). `out/`은 gitignore.

CLI 플래그: `--title` `--fps` `--duration` `--work-dir <dir>` `--prores` `--keep-frames`
**`--work-dir` 핵심**: workDir 지정 시 `findAvailablePort()`로 동적 포트 사용 → **병렬 렌더 가능**(각자 work-dir+포트). public/ 안 건드림. workDir엔 `scene.json` + `layers/`(layer-0/1/2.png) 필요(depth/layer-2 심볼릭/복사 ok).

---

## 2. 레이어 구조 (휘도 분리)

- **layer-0** `background-plate` — 인페인팅된 배경 (전경 제거됨), 약간 blur. meanDepth 50.
- **layer-1** `subject` — 전경 중 **lum < 160** (어두운 실루엣/형상). meanDepth 180.
- **layer-2** `light-rays` — 전경 중 **lum ≥ 160** (밝은 하이라이트/에너지). meanDepth 120.

`LUM_THRESHOLD = 160`, `lum = 0.299*R + 0.587*G + 0.114*B` (Rec.601). pipeline-pro.ts:204-225.
합성: zIndex 0→1→2, normal blend (alpha over).

---

## 3. Tone Presets (`scripts/lib/scene-presets.ts`)

`--tone` 값 3개. `DEFAULT_TONE = "prism-sunset"`.

| Tone | 성격 | layer-1 핵심 | 이펙트 핵심 |
|------|------|-------------|------------|
| **prism-sunset** (기본) | 삼원색(0/120/240) + 따뜻한 비네트 + 강한 CA 프리즘 | sat 4.8, hueKey 4.2, hueSpeed 21, satInjMul 1.22 | bloom 0.92, CA 0.26/0.07, godRays 1.05, aura 1.0, vignette 0.14 warm(R0.16/G0.05/B0.04), contrast 1.025, sCurve 0.08 |
| **commercial** | 엔터프라이즈 비비드 (가장 밝/화려) | sat 5.4, hueKey 5.4, hueSpeed 20 | bloom 1.0, godRays 1.1, vignette 0.05, contrast 1.005 |
| **elegant** | 절제·무드 (채도 낮음) | sat 2.6, hueKey 2.5, hueSpeed 16 | bloom 0.55, godRays 0.55, vignette 0.15 |

배경(layer-0)/light-rays(layer-2)도 각 preset에 값 있음. prism-sunset: L0 sat 4.2/hueKey 3.6/hueSpeed 19, L2 sat 3.6/hueKey 3.2/hueSpeed 16.

---

## 4. scene.json 셰이더 튜닝 노브 (`src/shaders/layer.frag`)

레이어별 `animation`:
- **colorCycle** `{speed, period, phaseOffset(deg)}` — 시간에 따른 hue 회전. `period`는 duration(20)의 약수. **seamless 루프 조건: (duration/period)*speed 가 정수**. 이게 유저가 허용하는 **유일한 모션**(색 변화).
- **saturationBoost** (0-10), **satInjectionMul** — 색 강도.
- **hueKey × hueSpeed = 공간적 hue 분산** ← 가장 중요한 노브.
  - 곱 >40 (예: 4.2×21=88) → 픽셀단위 무지개 노이즈 → subject가 **회색으로 평균화됨** (버섯/석상 회색 문제의 원인).
  - 곱 ~20-30 → 코히런트 색 영역 (painterly).
  - 곱 <10 → 모노톤.
- **valueLift** (0-1) — **어두운 픽셀만** 들어올림: `v = max(v, valueLift*(1-v))`. 어두운 subject/소스 밝히기. (HEAD에 존재, 동작함)
- **lumExponent, luminanceKey** — 휘도→hue 커플링.
- **rim** `{rimIntensity, rimHueShift, rimWidth}` — 실루엣 가장자리 Fresnel 무지개 글로우. `rimHueShift = k/20` 이어야 루프(0.05/0.1/0.15/0.2…). alpha로 새어나가니 rimIntensity ≤1.0 권장(≥1.2면 두꺼운 halo).
- **bicubicFilter** (bool) — 부드러운 텍스처 샘플링.
- **모션 노브 (breath.amplitude, polarTwist, scalePulse, rotateSpeed, glow.pulse, noiseSpeed)** — ⚠️ **유저가 거부함 ("움직임주지마" = 저급)**. 전부 0 유지. 기하학적 움직임 금지. colorCycle(색 변화)만 OK.
- noiseScale/Amount: noiseSpeed=0이면 정적(루프안전) — 큰 색영역 추가. domainWarp로 swirl. (단 유저는 노이즈블롭 "저급"이라 함, 주의)

## 4b. 이펙트 (`scene.json.effects`, `src/lib/effect-composer.ts`)
bloom, chromaticAberration(프리즘 프린지, *0.001 + radial → corner-weighted), godRays(센터에서 광선), aura(hue-shift 헤일로, hueSpeed*20=정수여야 루프), kaleidoscope(N-fold 미러, 0.5,0.5 중심=portrait에선 mid-torso, blend≤0.18), **mandala**(Flower-of-Life; ⚠️ **루프 트랩**: effect-composer.ts ringWave `sin(...-uTime*1.2)`가 하드코딩 비정수 → opacity>0이면 seam. 패치하려면 1.2→1.2566(=4*TAU/20)), lensDistortion(barrel+radial chromatic), filmGrade(grain/vignette/contrast/sCurve).
⚠️ **`filmGrade.exposure`(전역 밝기) + 레이어별 `layerGain`은 추가했다가 유저 요청으로 원복됨 — HEAD 코드엔 없음**. 밝기는 valueLift + filmGrade로만.

---

## 5. ⭐ 핵심 학습: subject 회색 문제 & 수정 ("prism-final" 튜닝)

**증상**: 버섯/석상 등 어둡거나 채도 낮은 subject가 prism 돌리면 회색/은색으로 나옴.
**원인**: stock prism layer-1의 hueKey 4.2 × hueSpeed 21 = 88 → 인접 픽셀이 전부 다른 hue → 눈에서 회색으로 평균화. (채도 문제 아님 — 측정하면 픽셀 채도는 높은데 hue 분산이 큼.)
**수정 (prism-final)**: layer-1 **hueKey 2.8, hueSpeed 9** (분산 25, 코히런트) **+ valueLift 0.22** (어두운 부분 들어올려 색 보이게). → 코히런트 비비드 색.

이게 검증된 "prism-final" 기본 톤. 새 이미지 prism 돌릴 때 pipeline-pro 후 layer-1에 이 패치 적용:
```js
const a=scene.layers.find(l=>l.id==="layer-1").animation;
a.hueKey=2.8; a.hueSpeed=9; a.valueLift=0.22;
```

---

## 6. 어두운 소스 처리 (dark source)

`feedback_avoid_dark_source` 메모리: 검정 톤 지배 이미지는 파이프라인 부적합 → 원칙적으로 소스 제외. 굳이 처리 시:
- **밝기 보정**: layer-1 valueLift ↑(0.4~0.5), layer-0 valueLift ↑(0.35), layer-2 0.15, filmGrade vignette↓(0.04)/contrast 1.0/sCurve 0.02.
- ⚠️ **트레이드오프**: 어둡고 질감 많은 소스(돌 석상 등)를 valueLift로 들어올리면 표면 텍스처가 **컬러 스페클(자글자글)로 증폭**됨. 유저가 싫어함.
  - 완화: 소스 레이어를 `sharp().median(7)` 디노이즈 (그래도 완전 제거는 안 됨).
  - 또는 밝기를 덜 올려 어둠 유지 (스페클이 어둠에 묻힘).
- **밝기 사다리 예시 (buddha)**: nobright 0.33(어두운영역 59%) → mid 0.37(38%) → form 0.43(buddha영역 0.51, 형상 또렷) → bright 0.49(4%, 스페클 드러남). subject만 밝히려면 **layer-1 valueLift만** 올리고 layer-0는 낮게(배경 무드 유지).

---

## 7. ⭐ Replicate 없이 로컬 레이어 분리 (크레딧 소진 시 폴백)

bg제거/인페인트/뎁스 없이 **휘도 분리만 로컬(sharp)로**:
1. 소스 `sharp(src).resize(1632,2912,{kernel:"lanczos3"})` (필요 시 2x 업스케일).
2. `.median(7)` — 돌/질감 디노이즈.
3. raw 픽셀 루프: `lum = 0.299r+0.587g+0.114b`. lum≥160 → layer-2(밝음), 아니면 layer-1(어둠). **RGB는 양쪽 다 실제값 유지, alpha만 마스크(255/0)** (검정 bleed 방지).
4. layer-0 = 전체 이미지 blur(1.2) (베이스; 1+2가 거의 덮음).
5. scene.json은 기존 prism-final scene 재사용 + `source` 필드만 교체.
6. `export-layered --work-dir <wd>`.
주의: 임시 tsx 스크립트는 **프로젝트 트리 안**에 둬야 `sharp` 모듈 resolve됨 (/tmp에선 MODULE_NOT_FOUND).

---

## 8. 레이어 재사용 (re-tone, API 재호출 없이)
기존 렌더의 layers(아카이브 `out/.../layers/`에 스냅샷됨)를 work-dir에 복사/심볼릭 → scene.json만 수정(톤/밝기) → `export-layered --work-dir`. 여러 톤 병렬 가능(동적 포트).

## 9. 오디오 합성
```bash
ffmpeg -y -i video.mp4 -i "audio.wav" -map 0:v -map 1:a -shortest -c:v copy -c:a aac -b:a 320k out.mp4
# 시작 오프셋: 오디오 입력 앞에 -ss <초>. -shortest로 영상 길이(20s)에 맞춤.
```

## 10. 검증 지표 (프레임 측정)
- **밝기**: 평균 max(r,g,b). 균형 ~0.43-0.48, 어두운 무드 ~0.33-0.37.
- **dark%**: max<0.25 픽셀 비율 (깊이/대비).
- **hueConc**: 패치 내 hue를 단위벡터로 평균한 크기. 1=단색, 0=무지개회색. subject가 **>0.6이면 코히런트**(회색 아님).
- **speckle**: 인접 픽셀 abs-diff 평균. 단 비비드 컬러 디테일과 혼동되니 시각 확인 병행.
- **루프 seam**: frame599↔frame0 diff ≈ 인접프레임(예 300↔301) baseline 이면 seamless.

## 11. ⭐ 유저 미학 (Isaac)
- **절제·무드·드라마 > 최대치**. 어둡고 채도낮은 dramatic subject가 vivid 배경 위에 = figure-ground 분리. 고급으로 읽힘.
- **거부**: (a) 기하학적 모션(breath/zoom/twist/pulse)=저급, (b) 과채도 "everything colorful", (c) 균일하게 밝음(눈부심) 또는 균일하게 어두움, (d) 노이즈블롭/SDF/체커 등 싸구려 기믹, (e) 자글자글 스페클(특히 흰색 반짝).
- "더 밝게/극한 싸이키델릭" 요청해도 위 거부사항은 유지. 강도는 *세련된* 수단(프리즘 굴절, 코히런트 색, 깊이)으로.
- 톤 미세조정은 한 번에 최소 변경으로 (처리 쌓지 말 것 — 누적되면 "인위적"이라 거부).

## 12. 코드 상태 메모 (2026-06 기준)
- HEAD = `2432aca` "feat: add prism-sunset preset as default tone + cleanup".
- 이번 세션에 추가했던 `filmGrade.exposure` + per-layer `layerGain` + mandala ringWave 패치는 **유저 요청으로 원복**(`git stash`). HEAD 코드엔 없음. 밝기는 valueLift로.
- `valueLift`는 HEAD에 이미 있음(layer.frag + animationSchema) — 정상 동작.
