# 이미지별 튜닝 가이드 — 레이어드 사이키델릭 파이프라인

> 2026-06-18 세션 학습 총정리. "왜 어떤 이미지는 잘 나오고 어떤 건 진흙이 되는가"와
> 소스별로 어떻게 다르게 접근해야 하는가.

---

## 0. 제1원칙 — 만능 레시피는 없다

출력 품질 = **소스 성격 × 파라미터**. 둘 중 하나만 봐선 안 됨.

**렌더러·의존성·Chrome·모델(bria/flux-fill)·Replicate·파이프라인은 범인이 아니다.**
검증법: 과거 잘 나온 결과(예: `2026-06-11_f21-img_9208-vivid2`)의 `layers/` + `scene.json`을
그대로 현재 환경에서 재렌더 → 원본처럼 깨끗하면 환경 정상. (이번 세션 실제로 그랬음.)
→ 결과가 나쁘면 **scene.json 색 파라미터 + 소스 궁합**을 의심하라. 그 외를 헤매지 마라.

---

## 1. 증상 → 원인 (빠른 진단)

| 증상 | 원인 | 처방 |
|------|------|------|
| 회색 진흙 + 픽셀 무지개 스페클 | 색 파라미터 과열 (satInjMul/satBoost/hueKey×speed↑) | 아래 안전범위로 낮춤 |
| subject가 검정 실루엣으로 죽음 | subject 레이어가 어둡고 valueLift 낮음 | 해당 레이어 `valueLift`↑ (단 과하면 떡짐) |
| 매끈한 면(물/하늘/피부)이 무지개 덩어리 | `satInjectionMul` 강제주입 | 컬러풀 소스는 `satInjectionMul=0` |
| 배경 작품이 뭉개짐 | Replicate 인페인팅이 배경 교체 | 풀소스 유지(로컬) 또는 subject가 가리면 무시 |
| 환경 의심될 때 | — | vivid2 아카이브 재렌더로 격리 |

---

## 2. 소스부터 분류하라 (튜닝 전 필수)

결과를 좌우하는 3축:

1. **명암/어둠**: 깊은 다크 + 굵은 형태  vs  밝음/파스텔/균일
2. **디테일 주파수**: 굵고 매끈한 형태  vs  잔디테일(머리카락 줄기·빛살·질감)
3. **기존 채도**: 이미 쨍한 컬러풀  vs  무채/탁함

### 소스 타입별 판정

| 타입 | 예시 | 추천 패밀리(§5) |
|------|------|------|
| **굵은형태 + 깊은다크 + 진한색** | hand-eye, buddha-eye, buddha-planet | **B prism** / **C enterprise**(더쨍). clean도 가능 |
| **밝고 컬러풀 + 형태 뚜렷** | lotus-buddha, IMG_9205 | **A clean** (+ 요소분리) |
| **밝은 바디 / 저대비 + 펀치 원함** | f19 bright-body | **D bright-punch** (K×S 6 + satB5↑ + vLift↑) |
| **무드 / 차분 / 절제** | hands-tree | **E elegant** |
| **이미 완성된 아트(거의 안 건드림)** | graffiti, preserve류 | **F preserve** (cc≈0) |
| **창백한 얼굴 / 잔디테일 빽빽 / 손-얼굴 busy portrait** | 7862, IMG_9213/9214, **eye2/3/4/5(전부 별로)** | ❌ 사실상 부적합. 잔디테일이 노이즈로 남아 만족 불가. 매끈한 형태 소스로 교체 |
| **흑백 / 무채색 (monochrome)** | bw-eye | ❌ **부적합 — 받지 않음** (사용자 정책). satBoost 무력(곱셈)+피부 잔디테일 스페클로 살리기 불가 |
| **블랙 지배** | — | 부적합. 제외 |

> 핵심: **prism(B/C) 색 파라미터는 컬러풀/잔디테일 소스를 무조건 망친다.** 다크-볼드 전용.
> 밝은 소스에 임팩트가 필요하면 prism이 아니라 **D(K×S만 낮추고 sat·vLift는 올림)**.

---

## 3. 노브 사전 (안전범위)

### 🔑 마스터 노브 = `hueKey × hueSpeed` (K×S, 공간 hue 분산)
**8개 승인 최종본 전수분석 결과: K×S가 모든 것을 결정한다. satBoost·satInj는 K×S가 만든 결과를 "증폭"할 뿐.**
- **K×S ≤ 6 (코히런트)**: 색이 영역단위로 뭉쳐 깨끗. → **satBoost·satInj 마음껏 올려도 안전.**
  - 증거: `bright-body` 최종본 = satB **5.4** + satInj **1.5** 인데도 깨끗 (K×S=6이라서).
- **K×S 20~40 (painterly/elegant)**: 중간. 채도 낮게(satB≤2.6) 동반해야 무드 있게 떨어짐.
- **K×S > 50 (prism 무지개)**: 픽셀단위 무지개 → **다크-볼드 소스에서만** 의도된 효과(스페클이 어둠에 묻힘). 컬러풀 소스엔 진흙. 다크 소스라도 subject는 회색-fix(K×S≈25)로 낮추면 더 좋음(mushroom 최종본).

> 즉 옛 규칙 "컬러풀 = satInj 0"의 **진짜 본질**: *"K×S가 높을 때만 satInj가 무지개 클럼프를 만든다."* K×S가 낮으면 satInj/satBoost는 펀치를 더해줄 뿐 해롭지 않다.

### 파괴적 노브 (단, 위 K×S 맥락에서만)
- `satInjectionMul`: K×S 높음 → **0~낮게**. K×S 낮음 → 1.5까지도 OK(펀치).
- `saturationBoost`: K×S 높음+컬러풀 → ≤1.9. K×S 낮으면 5+도 가능. 무채 소스는 자유.
- `hueKey × hueSpeed`: 위 마스터 노브 참조.

### 캐릭터 노브 (자유롭게 사용 가능)
- `chromaticAberration`(프리즘 느낌): 0.22~0.26
- `bloom.strength`: 0.8~0.92
- `colorCycle.speed`(색순환 속도): 10~24. **무손실 루프 조건: (duration/period)×speed = 정수**.
- `filmGrade.vignetteIntensity`: 컬러풀 → **0**(가장자리 어둡게 X). 다크 → warm tint OK.

### subject 가시성
- 레이어 `valueLift`: 어두운 픽셀만 들어올림. 0.08 기본 / 0.35 미세(거의 안 보임) / 0.6+ 강함(보통 과함). 0.3~0.5 사이 탐색.

### 셰이더 색칠 메커니즘 (layer.frag 확인)
`blend = smoothstep(satBlendLow, satBlendHigh, 원본채도)` 로 픽셀을 두 갈래로 처리:
- **저채도 픽셀(blend≈0)**: 채도 = `saturationBoost × satInjectionMul`(주입), hue = `colorCycle + 명암×luminanceKey`(luminance 기반).
- **고채도 픽셀(blend≈1)**: 채도 = 원본×boost, hue = 원본 hue 회전.
- ⚠️ **순수 무채(채도 0)는 satBoost가 곱셈이라 무력** → 색은 오직 `satInjectionMul`로만 들어감. 단 어두우면(`valueLift` 안 올리면) "채도 높아도 어두운=칙칙"하게 보임.
- `luminanceKey`↑ = 명암에 따라 hue가 깔림(매끈한 무지개). 단 **소스에 잔디테일/질감 있으면 그게 hue 스페클**로 변함 → median 디노이즈로도 한계.

### 색 트랜지션/모션 3종 (느낌별 선택)
1. **colorCycle** `{speed, period}`: 전체 화면 hue가 **균일하게 회전**(rainbow sweep). 무손실 루프=(duration/period)×speed 정수. speed↓=서서히, speed↑=빠름/급작.
2. **noise 물들기** `{noiseScale, noiseSpeed, noiseAmount}`: 흐르는 fbm이 hue에 더해져 **잉크 번지듯 공간적으로 색이 퍼짐**("물들듯이"). scale=번짐크기(2~3 넓게), speed=번짐속도, amount=강도(0.3~). ⚠️ 비주기→루프 seam(고속이면 가려짐). *eye2 사용자 채택 모션.*
3. **multipassFeedback** `{strength, warp, decay}`: 이전 프레임이 다음에 겹쳐 **디졸브/크로스페이드**. warp 0=공간왜곡 없이 순수 색 디졸브. strength/decay↑=더 길게 녹음.

---

## 4. 요소 분리 (핵심 요소를 살리고 싶을 때)

렌더러는 `config.layers` 배열을 N개 순회한다 (`layered-psychedelic.ts`). 4번째+ 레이어 OK.
단 `role`은 **스키마 enum만**: background-plate / background / midground / subject / detail / foreground-occluder / light-rays. (임의 문자열 "lotus" 등 금지)

- **색 마스크**(색이 뚜렷한 요소, 예 핑크 연꽃): RGB 임계 + 위치 + `blur` 페더.
  예 연꽃: `r>140 && r>=g+30 && (r-min(g,b))>45`, 하단 46%↓.
- **subject** = bria 전경 매트 **−** 요소 마스크들.
- **배경** = flux-fill 인페인트(Replicate) 또는 풀소스(로컬).
- ⚠️ sharp `.blur()`는 1ch raw를 **3ch로 반환** → 마스크 읽을 때 `resolveWithObject`의 `info.channels`로 `m[p*channels]` 인덱싱. PNG 라운드트립도 채널 바뀜.
- 분리 스크립트는 **이미지마다 마스크 기준이 달라 일회성으로 작성**한다 (소스 경로·색 임계·영역을 그 이미지에 맞춤). 위 lotus 예시 코드(`r>140 && r>=g+30 && (r-min)>45`, bottom 46%, blur 페더)를 템플릿 삼아 `npx tsx -e` 또는 임시 스크립트로 작성 후 폐기.

---

## 5. 검증된 레시피 패밀리 (오디오 합본 = 승인 최종본 8종 전수분석)

> 모든 값은 layer 0/1/2 순서. 승인본 archive를 베이스로 복사 후 오버라이드하면 가장 안전.

### A. clean 클럼프가드 vivid — **컬러풀/형태뚜렷 소스** ★역대최고(lotus)
```
satInjectionMul 0/0/0 · satBoost 1.7/1.9/1.6 · hueKey 1.6 × hueSpeed 2.5 (K×S=4)
colorCycle.speed 12/14/10 · CA 0.26 · bloom 0.92/thr0.3 · vignette 0
```
베이스: `2026-06-18_lotus-clean-1x-separated`. (필요시 요소분리 §4 추가)

### B. prism-final — **다크-볼드 소스 전용** (hand-eye, buddha-eye, mushroom)
```
satBoost 4.2/4.8/3.6 · satInjMul 0.92/1.22/0.76
hueKey×speed: L0 68 · L1 88(또는 회색-fix 2.8×9=25) · L2 51
colorCycle 21/24/18 · CA 0.26 · bloom 0.92/thr0.24 · godRays 1.05 · warm vignette 0.14
```
베이스: `2026-05-29_12d06870-jpg-hand-eye-prism` 또는 `2026-06-01_bc67de66-mushroom-head-prism`(subject 회색-fix+vLift0.22 버전).
⚠️ 컬러풀/파스텔/잔디테일 소스에 쓰면 100% 진흙.

### C. enterprise — **가장 화려/강한 다크 소스** (buddha-planet)
```
satBoost 4.4/5.4/3.8 · satInjMul 0.95/1.4/0.85 · hueKey×speed 79/108/53
colorCycle 19/22/16 · CA 0.18 · bloom 1.0/thr0.2 · godRays 1.1 · aura 1.05 · vignette 0.05
```
베이스: `2026-05-15_buddha-planet-...-enterprise`. B보다 더 쨍함. 다크 소스 한정.

### D. bright-body punch — **밝은 바디/저대비 소스인데 펀치 원할 때** (f19-bright-body)
```
satBoost 5/5.4/4 · satInjMul 0.92/1.5/0.76 · hueKey 1.5 × hueSpeed 4 (K×S=6!)
valueLift 0.24/0.68/0.1 (subject 강하게 밝힘) · colorCycle 21/24/18 · CA 0.16 · bloom 1.0
```
베이스: `2026-06-09_f19-17635c8c-bright-body`. **핵심: 강한 sat/inject지만 K×S를 6으로 낮춰 코히런트 유지 + subject valueLift 대폭.** 밝은데 임팩트 필요할 때.

### E. elegant — **무드/절제** (hands-tree-elegant)
```
satBoost 2.4/2.6/1.95 · satInjMul 0.54/0.56/0.36 · hueKey×speed 33/40/24
colorCycle 18/17/14 · CA 0.08 · bloom 0.55/thr0.4 · godRays 0.55 · vignette 0.15
```
베이스: `2026-05-29_d01372e4-hands-tree-elegant`. 차분한 소스.

### F. preserve / minimal — **이미 완성된 아트(거의 안 건드림)** (graffiti, preserve-2x)
```
satBoost 1.0~1.1 · satInjMul 0 · hueKey×speed 0~2 · colorCycle 0~4(거의 정지)
CA 0.035~0.1 · bloom 0.22~0.45 · godRays 0.12~0.25 · vignette 0.02~0.04
```
베이스: `2026-06-09_graffiti-buddha-eye-source-vivid`(cc=0 사실상 정지) 또는 `2026-06-10_fd8d6c39-preserve-2x`. 소스가 이미 완벽할 때 미세한 숨결만.

### 패밀리 선택 빠른표
| 소스 | 추천 패밀리 |
|------|------|
| 컬러풀 + 형태뚜렷 | **A** (clean) |
| 깊은다크 + 굵은형태 | **B**(prism) / **C**(enterprise=더쨍) |
| 밝은바디 + 펀치원함 | **D** (bright-body, K×S낮게+vLift↑) |
| 무드/차분 | **E** (elegant) |
| 이미 완성된 아트 | **F** (preserve) |
| 창백얼굴/잔디테일 | A 시도하되 기대 낮춤(난해) |

---

## 6. 실전 워크플로우 (이미지 1장 튜닝)

1. **레이어 1회 생성** (Replicate `pipeline-pro` 또는 로컬). 이후 파라미터 반복은 **레이어 재사용 = 크레딧 0**.
2. **소스 분류** (§2) → 시작 레시피 선택 (§5).
3. **반복 튜닝**: `scene.json` 값 수정 → `export-layered --work-dir` 재렌더 → 5초 프레임 추출(`ffmpeg -ss 5 ... -frames:v 1`)로 판정. (풀 렌더 대신 프레임만 보고 빠르게 수렴.)
4. 핵심 요소가 죽으면 → **요소 분리**(§4) 추가.
5. subject 안 보이면 → 해당 레이어 `valueLift` 미세 조정.
6. 확정 → 풀 렌더 → 오디오 합치기: `ffmpeg -i v.mp4 -ss <start> -i a.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest out.mp4`.

---

## 7. 함정 (세션에서 실제로 당한 것들)

- **렌더러/모델 탓하지 마라** — vivid2 재렌더로 먼저 격리. (이번에 모델교체·분리·Replicate 복원으로 한참 헤맴 = 다 헛수고였음. 범인은 파라미터였음.)
- **저크레딧(<$5)에서 Replicate 병렬 금지** — "분당 6요청 burst 1" 쓰로틀(429). **순차 실행.**
- **depth 단계는 무의미**(parallax=0이라 depth.png 안 읽힘) + 가끔 45분 행. 멈추면 죽이고 중간산출물(`01-foreground`, `03-background-upscaled`)로 합성.
- **named 프리셋(prism-sunset/commercial/elegant) 믿지 마라** — 컬러풀 소스엔 과조리(satInjMul/satBoost/hueKey×speed 과다). 옛 좋은 영상들은 프리셋이 아니라 손튜닝 값이었음.
- **ProRes 마스터 = 20초에 4.5GB+**. H.264 ~20Mbps(≈50MB)면 충분.
- node_modules 날아가면 `npm install` (package-lock 있음), puppeteer Chrome은 `npx puppeteer browsers install chrome`.
- **노이즈/지글거림 = 소스 잔디테일 × (luminanceKey + noiseAmount)**. 완화는 그 둘을 낮추기. ⚠️**median 디노이즈는 역효과**(소스를 뭉개 색이 더 chaotic). 근본은 잔디테일 적은 소스 선택.
- **domainWarp·과한 noiseAmount(>0.6)=overshoot** → 패턴이 소용돌이/노이즈로 풀려 형태 상실. 환각성은 luminanceKey로, warp 금지.
- **딥블랙 소스를 valueLift로 밝히지 마라** → 딥블랙 앵커 상실로 형태가 무지개 노이즈로 풀림. 어두운 채로가 형태/대비/non-muddy의 핵심.

---

## 8. 한 줄 요약

> 소스를 먼저 분류하고(§2), 타입에 맞는 레시피로 시작(§5), 레이어 재사용으로 빠르게 반복 튜닝(§6).
> 컬러풀 = clean 클럼프가드 vivid. 다크-볼드 = prism. 창백/잔디테일 = 어렵다(소스 교체 고려).

---

## 9. 작업 로그 (자가발전 — 매 이미지 작업마다 1행 이상 추가)

> SKILL의 MANDATORY 규칙: 모든 렌더 작업(성공·실패·거부 포함) 후 이 표에 기록.
> 새 일반 패턴이면 위 §2/§3/§5에도 반영. 새 작업 전 이 로그를 먼저 훑어 유사 소스 선례를 활용.

### 9-1. 승인 최종본 (오디오 합본 = 권위 기준, 전수분석)
> 이게 "사용자가 끝까지 만족해 음악까지 입힌" 작업물. 셋팅 신뢰도 최상.

| 소스 | 타입 | 패밀리 | K×S(L1) | satB/satInj(L1) | 비고 |
|------|------|------|------|------|------|
| buddha-planet | 다크 화려 | C enterprise | 108 | 5.4 / 1.4 | 가장 쨍 |
| hand-eye(12d06870) | 깊은다크 | B prism | 88 | 4.8 / 1.22 | prism 정석 |
| mushroom-head | 깊은다크 | B prism | 25(회색fix) | 4.8 / 1.22 | subject 회색fix+vLift0.22 |
| hands-tree(d01372e4) | 무드/차분 | E elegant | 40 | 2.6 / 0.56 | 절제 |
| f19 bright-body | 밝은바디 저대비 | D bright-punch | **6** | **5.4 / 1.5** | 강sat인데 K×S낮아 깨끗+vLift0.68 |
| lotus(39fddeaf) | 컬러풀 형태뚜렷 | A clean | 4 | 1.9 / 0 | ★역대최고, 요소분리 |
| graffiti-buddha-eye | 완성아트 | F preserve | 0 | 1.12 / 0 | cc=0 거의정지 |
| fd8d6c39 | 완성아트 | F preserve | 2 | 1.0 / 0 | 미세 숨결만 |

→ 결론: **승인본은 K×S 양극단(≤6 또는 >50)에 몰린다. 중간(20~40)은 elegant 1건뿐.** 컬러풀일수록 K×S↓, 다크-볼드일수록 K×S↑.

### 9-2. 거부/실패 사례 (안티패턴)
| 소스 | 타입 | 시도 | 결과 | 교훈 |
|------|------|------|------|------|
| 7862e9a1 | 창백얼굴+잔디테일 | clean+median | 별로 | 소스 부적합. 어떤 설정도 한계 |
| IMG_9213/9214 | 밝은파스텔+busy | prism→clean | 별로 | 파스텔+busy는 진흙. 소스 교체 |
| ganesha 다수 | 컬러풀에 prism강제 | prism(K×S88) | 별로 | 컬러풀에 prism=무조건 진흙 |
| bw-eye (e5be1991) | 흑백+흰배경+피부 잔디테일 | satInj/valueLift/luminanceKey/median 전부 | ❌폐기 | 무채는 satBoost 무력, satInj×satBoost로 주입돼도 어두우면 칙칙·잔디테일 스페클. **사용자 정책: 무채색 소스 안 받음** |

### 9-3. 신규 작업 로그 (여기부터 매 작업 append)
| 2026-06-18 | eye2/3/4/5 (손으로 얼굴 가린 portrait 4장) | 컬러풀+딥블랙+**busy 잔디테일(피부 모공·스월)** | trip3(noise dye+lumKey) → 밝히기 → denoise → lownoise 등 다수 | ❌**결론: 전부 별로** | **이 타입(손-얼굴 busy-텍스처 portrait) = 부적합.** 비비드/딥블랙 다 맞춰도 **잔디테일이 노이즈·지글거림으로 남아** 만족 못함. 중간에 "제일 낫다"는 상대평가였을 뿐. lotus(매끈+요소뚜렷)와 달리 이 잔디테일 portrait은 한계. → 잔디테일 빽빽 소스 회피 원칙 재확인 |
