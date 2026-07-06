# 이미지별 튜닝 가이드 — 레이어드 사이키델릭 파이프라인

> **최종본 (2026-06-22 세션 총정리).** "왜 어떤 이미지는 잘 나오고 어떤 건 진흙이 되는가"와
> 소스별로 어떻게 다르게 접근해야 하는가. 승인 최종본 9종(§5 A~G) + 셰이더 패치 6건 + 자가발전 로그(§9).
>
> **3초 요약**: ① 소스부터 분류·거르기(§2, 적합성이 8할) → ② 타입별 레시피로 시작(§5) → ③ 레이어 재사용으로 빠르게 반복(§6). 색=palette 휘도리매핑(머디/클럼프 회피), 모션=느린 colorCycle 디졸브(strobe 회피), 패턴=정지위치+디졸브(금지 회피).

---

## 0. 제1원칙 — 만능 레시피는 없다

출력 품질 = **소스 성격 × 파라미터**. 둘 중 하나만 봐선 안 됨.

> 🚫 **사용자 절대 금지 (영구)**: ① **정지(static) 금지** — 색이 항상 움직여야 함 ② **geometric 이미지 왜곡 금지**(이미지를 비트는 polarTwist/rotateSpeed/scalePulse 전부 0) ③ **대각선 드리프트 금지** — 패턴이 시간으로 **이동(translate)**하는 것(`noiseSpeed>0`, 또는 효과 내부 하드코딩 `time*x` 평행이동).
> → **중요 정정(2026-06-22)**: 금지 대상은 패턴의 **이동(드리프트)**이지 패턴 자체가 아니다. **`noiseSpeed=0`이면 fbm 마블/domainWarp는 공간 고정** → colorCycle이 그 위로 색만 흘려 ban 안 어기고 질감을 만든다(§0 절차적 패턴 항). 즉 `noiseAmount>0`은 OK, `noiseSpeed>0`만 금지.
> → 허용 모션은 **colorCycle(전역 hue 회전, 단 느리게=디졸브)뿐.** 단 이게 블루 지배 소스를 그린으로 시프트시키는 충돌이 있음(아래).

> ⚠️ **모션=hue변형 딜레마 (2026-06-22, ukiyo)**: 자유 hue 회전(`shiftedHue=hsv.x+hueShift`, layer.frag:358)은 전 화면을 lockstep 회전 → **블루 지배 소스가 올리브/그린 데드존 통과해 머디**.
> ✅ **해결 — IQ 팔레트 기법 (2026-06-22 돌파, 코드 0줄)**: 자유 hue 회전 대신 **`paletteAmount`(layer.frag:374-378)로 색을 "데드존 없는 비비드 곡선"에만 통과**시킨다. `palette(t)=A+B·cos(2π(C·t+D))`. **올리브를 곡선에서 빼는 게 핵심 = D 조정**. colorCycle이 팔레트 위상을 구동 → 모션 유지(정지/noise/geometric 안 씀). `×originalVal`로 형태 보존, hueKey로 공간 분산.
>   - 검증 값(블루 우키요에): `paletteAmount 0.85~0.9, A[0.5~0.6,0.5,0.55], B[0.45~0.5,...], C[1,1,1], D[0,0.10~0.20, 0.20~0.45]`, satB1.8~2.0, valueLift0.25~0.32, hueKey2/hueSpeed2.5, colorCycle 12/14/10, noise/geo 0.
>   - **이게 블루 지배·완성 컬러풀 스틸의 머디 그린을 잡는 유일한 길.** colorCycle 단독은 실패.

> 🌀 **strobe vs 디졸브 법칙 (2026-06-22 eye2)**: "색이 번쩍번쩍/깜빡깜빡"의 진짜 원인은 **colorCycle 속도가 너무 빠른 것**. hue 회전율 = `speed/period` 회전/초. **`14/10`=초당 1.4회전=20초에 28회전 = strobe(번쩍).** 사용자가 원하는 "디졸브(서서히 물들듯)" = **초당 0.2~0.4회전** → `speed 2~4 / period 10` (20초에 4~8회전).
>   - **루프 심리스 조건**: `duration × speed / period = 정수`. 20초·period10이면 speed는 0.5 배수(2.0→4회전, 4.0→8회전)라야 루프 점프 없음.
>   - **부차 번쩍 원인 (프리셋 잔존, 반드시 끌 것)**: `effects.godRays`(intensity 1.05·samples128) + `effects.aura`(hueSpeed 0.32) = 밝기·색 깜빡. batch 스크립트가 CA/bloom만 끄고 **godRays/aura는 안 꺼서** strobe 잔존했음 → godRays.intensity≤0.1, aura.intensity≤0.2/hueSpeed0.
>   - **테두리 번쩍**: `rimHueShift>0` = 림 색이 시간으로 흐름 = 가장자리 깜빡. **`rimHueShift=0`**(각도기반 정지색 글로우)로.
>   - **밝기 펄스**: `glowPulse>0` = 호흡 밝기 = 깜빡 → `glowPulse=0`.
>   - **피드백 루프-심 깜빡 (2026-06-22)**: `multipassFeedback`는 이전 프레임 누적인데 export 캡처가 프레임0에서 버퍼를 **콜드 스타트**(워밍업 없음, export-layered.ts captureFrames). → 프레임0=에코없음, 마지막프레임=풀에코 → 루프마다 1회 밝기 점프(번쩍). deflash 시 `multipassFeedback.strength=0` 권장(글로우는 bloom/rim/palette로 충분).
>   - **밝은 톤만**: `paletteA`↑(베이스 밝기) + `paletteB`↓(어두운쪽 진폭 축소). pal은 `×originalVal`이라 **검정 배경 앵커는 유지**(밝히는 게 아니라 "뜬 색만" 밝게). bloom strength/threshold로 루미노시티 보강.

> 🔮 **절차적 패턴 고도화 = 정지위치 + 느린 디졸브 (2026-06-22 셰이더 개선)**: "더 사이키델릭"의 정답은 **모션이 아니라 정지 패턴 밀도 + 색 디졸브**. 셰이더에 ban-safe로 풀어둔 레버:
>   - **cellular crackle**: `worleyAmount`/`voronoiAmount`(+scale). 크리스탈 균열/잠자리날개. ⚠️ **레이어0(배경)은 끄고 subject 레이어만** 켜야 딥블랙 유지(안 그러면 배경이 글로우 그물).
>   - **마블 심화**: `domainWarp`(1.8~2.4) + 신규 `domainWarp2`(2옥타브 재귀, opt-in) = 액체-돌 베이닝. noiseSpeed=0 필수.
>   - **fractal**: `juliaAmount`(+juliaC) 정지 set + 색은 hueShift 동기. `sdfAmount`(hexagon glyph).
>   - **sacred geometry**: post-fx `mandala`(opacity, **rotationSpeed/breathSpeed/hueSpeed=0** 정지) + `kaleidoscope`(segments 8fold). ⚠️ kaleidoscope는 구도를 접어 인물 클리어함 약화, mandala/fractal 팔레트는 올리브로 튀기 쉬움.
>   - **holographic**: `multipassFeedback`(strength 0.35, **warp=0** 정지 색에코) + 스펙트럴 rim + 오일슬릭 팔레트 = 비눗방울 무지개. **eye2 4종 중 최강**.
>   - **함정(영구 교훈)**: shipped 효과들이 `time*x` 하드코딩 드리프트/비정수 케이던스를 품고 있어 그냥 켜면 ban 위반·루프 깨짐. 켜기 전 `grep "time" layer.frag`로 점검 → 정지화 or hueShift 동기화.
>   - **필리그리 소스 선택 (2026-06-22)**: 필리그리(domain-warped fbm 마블)는 **소스의 휘도-구조를 타고 그려진다.** 평평한 면(검정 void·민무늬 하늘)엔 안 나오고 균일 색 필드만 됨. **극대화 소스 = 화면 전체가 유기적 소용돌이 구조 + 밝은~중간 톤**: 흐르는 머리카락·드레이프·천주름, 액체·물결·연기·구름, 대리석/마노/돌 베이닝, 잎맥/산호/깃털. (이번 `pal` 흐르는머리가 holoG 배치 ✅ 최강 = 우연 아님.) ❌ 큰 평면·딱딱한 기하·회색 저대비 평면. **공식: 필리그리 밀도 ∝ 소스 휘도-구조밀도 × noiseAmount × domainWarp.**

> ⭐ **세션 최대 교훈 — 소스 적합성이 8할 (2026-06-19)**: 만족작은 **lotus 하나뿐**. 그 외 다수(eye 시리즈·buddha·cosmos·무채색·파스텔) 거부.
> - ✅ **되는 소스**: 매끈한 면 + 플랫하고 뚜렷한 컬러 영역 + 단순/굵은 형태 (lotus=연꽃/부처 실루엣).
> - ❌ **안 되는 소스**: ① 이미 디테일하게 완성된 busy 텍스처 psychedelic 스틸(잔물결 라인·스월이 전면 → hue 재매핑으로 머디/그린 + 스페클) ② 회색/석상 hero(색 넣으면 머디) ③ 무채색 ④ 창백/파스텔 ⑤ 단일 인물 클로즈업 — **단, 컬러풀+딥블랙이면 §5 패밀리 G(holo 디졸브)로 살아난다 (2026-06-22 eye2 정정). "회피"는 무채색/파스텔 portrait 한정.**
> - **결론: 소스가 안 맞으면 어떤 파라미터로도 못 살린다. 튜닝 전에 소스부터 거른다.**

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

> 🎯 **구도 축(질감만큼 중요)**: **뚜렷한 컬러 요소 + 장면 구성**(lotus=연꽃/부처/물)이 있어야 임팩트가 산다. **단일 인물 클로즈업 portrait**(얼굴+손 한 덩어리)은 색을 입혀도 "무지개 피부"에 그쳐 천장이 낮음(eye 시리즈 전부 불만족). → 요소가 분리·대비되는 구도 소스를 골라라.

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
- **저채도 픽셀(blend≈0)**: `satInjectionMul>0`이면 채도 = `saturationBoost × satInjectionMul`(주입), `satInjectionMul=0`이면 원본 boost/저채도 floor를 보존해 밝은 픽셀이 회색으로 죽지 않게 함.
- **고채도 픽셀(blend≈1)**: 채도 = 원본×boost, hue = 원본 hue 회전.
- ⚠️ **순수 무채(채도 0)는 satBoost가 곱셈이라 약함** → 주입형 소스는 `satInjectionMul`로 색을 넣고, 컬러풀 소스의 `satInjectionMul=0`은 회색화 방지 floor만 걸림. 단 어두우면(`valueLift` 안 올리면) "채도 높아도 어두운=칙칙"하게 보임.
- `luminanceKey`↑ = 명암에 따라 hue가 깔림(매끈한 무지개). 단 **소스에 잔디테일/질감 있으면 그게 hue 스페클**로 변함 → median 디노이즈로도 한계.

### 색 트랜지션/모션 3종 (느낌별 선택)
1. **colorCycle** `{speed, period}`: 전체 화면 hue가 **균일하게 회전**(rainbow sweep). 무손실 루프=(duration/period)×speed 정수. speed↓=서서히, speed↑=빠름/급작.
2. **noise 마블** `{noiseScale, noiseSpeed, noiseAmount}`: fbm이 hue에 더해져 색이 영역단위로 퍼짐(마블/filigree). ⚠️ **`noiseSpeed>0`만 금지** — flow `vec2(time*speed*0.1, time*speed*0.07)`가 배경을 대각선으로 흘림. **✅ `noiseSpeed=0` + `noiseAmount>0`은 권장**: 마블이 공간 고정되고 colorCycle이 색만 흘려 = 정지 아니고 드리프트 아닌 사이키델릭 질감(family G 핵심).
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

### G. holo-iridescent 디졸브 — **컬러풀 딥블랙 portrait** ★eye2 세션 최종승인 (2026-06-22)
> 단일 인물 portrait도 "극한 사이키델릭"이 되는 걸 증명한 레시피. 레시피 파일: `recipes/eye2-holo-clean.json`.
```
colorCycle.speed 2/2.5/1.5 (period10 → 4/5/3회전, 심리스 "디졸브" — 빠르면 strobe) · phaseOffset 0/120/240
satBoost 2.0/2.1/2.1 · satInjMul 0/0.2/0.16 · hueKey 3.0/3.2/3.2 × hueSpeed 2.6/2.8/2.8
valueLift 0/0.08/0.06 (딥블랙 앵커 — 절대 올리지 마라) · noiseScale 5/4.8/4.4 · noiseAmount 0.3/0.32/0.32 · noiseSpeed 0
domainWarp 2.2/2.2/2.0 + domainWarp2 1.2/1.3/1.3 (2옥타브 재귀 = 깊은 액체-돌 마블)
rimIntensity 0/0.5/0.5 (rimHueShift 0 = 정지색 글로우) · glowIntensity 0.2/0.25/0.2 · glowPulse 0
palette: amount 0.9 · A[0.68,0.64,0.72] · B[0.32,0.36,0.34] · C[1,1,1.2] · D L0[0.2,0.45,0.75]/L1[0.25,0.5,0.8]/L2[0.22,0.47,0.77] (홀로그래픽 오일슬릭·밝은톤)
effects: bloom 0.85/r0.85/thr0.5 · CA 1.2/mod0.2 · godRays 0.06 · aura 0.28/hueSpeed0 · **feedback 0**(루프심 깜빡 방지) · vignette 0
```
- **필수 셰이더 패치 6건**(이미 적용됨): worley(L429)/voronoi(L437) 정지화, julia(L391)/ring(L463) hueShift 동기, mandala ringWave(effect-composer:292) 정지, `domainWarp2` 신설.
- **옵션 — 거미줄 cellular 배경**: layer0 `worleyAmount`/`voronoiAmount`↑(0.4~0.55)면 크리스탈 그물망 배경. (사용자 최종본은 **제거**: 순수 딥블랙 선호.)
- **잔여 취향이슈**: paletteD가 디졸브 중 그린 페이즈 노출. 싫으면 D를 magenta↔gold↔cyan만 통과하게 재튜닝.

### 패밀리 선택 빠른표
| 소스 | 추천 패밀리 |
|------|------|
| 컬러풀 + 형태뚜렷 | **A** (clean) |
| 깊은다크 + 굵은형태 | **B**(prism) / **C**(enterprise=더쨍) |
| 밝은바디 + 펀치원함 | **D** (bright-body, K×S낮게+vLift↑) |
| 무드/차분 | **E** (elegant) |
| 이미 완성된 아트 | **F** (preserve) |
| **컬러풀 딥블랙 portrait** | **G** (holo-iridescent 디졸브) — 단일 인물도 OK |
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
> 컬러풀 형태뚜렷 = **A** clean. 다크-볼드 = **B** prism / **C** enterprise. 밝은바디 = **D**. 무드 = **E**. 완성아트 = **F**. **컬러풀 딥블랙 portrait = G(holo 디졸브, 세션 베스트)**.
> 창백/회색/무채/매끈한 큰 면 = **소스 단계에서 거른다**(❌ 2개 이상이면 시작 금지). 어떤 파라미터로도 못 살린다.
> 3대 법칙: 색=**palette 휘도리매핑**(머디/클럼프 회피) · 모션=**느린 colorCycle 디졸브**(strobe 회피, duration×speed/period=정수) · 패턴=**정지위치 fbm/cellular + 디졸브**(금지 회피).

---

## 9. 작업 로그 (자가발전 — 매 이미지 작업마다 1행 이상 추가)

> **폐회로 규칙 (SKILL MANDATORY와 일치):**
> - **작업 전 (게이트)**: §2 ❌ 기준 대조 → 2개 이상이면 렌더 금지, 사용자에게 보고. 로그에서 유사 소스 선례 확인.
> - **작업 후 (쓰기)**: 성공·실패·거부 모두 1행. **신뢰도 태그**: `[n=1 가설]`(이 로그에만) vs `[n≥3 법칙]`(본문 §2/§3/§5 승격 가능).
> - **승격**: 서로 다른 소스 3건+ 재확인돼야 본문 "법칙". n=1을 본문에 올려 과일반화 금지.
> - **반증**: 기존 법칙과 어긋나면 그 법칙 옆에 반증 단서를 즉시 추가(삭제 X).
> - **증류**: 같은 소스 행 5개+ → 결론 1행으로 접기.

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
| eyestack (d44a7797, 회색 인물+스택 눈+블루하늘+흰스웨터) | **❌ 4중 부적합 동시** | G→bright-body→prism→salvage 다수 | ❌포기 | **이번 세션 최악 케이스. 한 소스가 ❌ 4개 동시**: ①회색 hero ②큰 매끈 창백면(하늘·스웨터) ③전체 mid-dark 휘도 ④딥블랙 아닌 단일 portrait. 레시피마다 **다른 벽**: G=어둠murk, bright=파스텔, **prism=매끈 하늘이 무지개 픽셀클럼프**. → **사전 거르기 규칙: ❌ 기준 2개 이상이면 시작하지 마라.** |

### 9-3. 신규 작업 로그 (여기부터 매 작업 append)
| 2026-07-03 | **위상장 A/B 실험 (marble e7389d99)** `[n=1 검증]` | 통제실험: 위상장 유무만 분리 | scene-A(전역순환) vs scene-B(층별 위상장) | ✅ 가설 검증 | **전역 lockstep="전면 단일색 필터", 위상장="한 프레임 안 다색 파동 공존"** — 그린도 전면→밴드로 국소화. 마스터피스 경로의 지각적 토대 확정 (OUTPUT_GAP_ANALYSIS A-4-2) |
| 2026-07-03 | **ganesha 8b4cafbd r0~r7 (유도 시스템 수렴 사가)** `[교훈 다수]` | figure 중심 밝은 비비드 | 자동 유도 라운드 반복 | △ 지표 수렴, 미학 미달 | olive 47.5→1.3%, seam 해결, atan NaN 드라이버버그 발견. **교훈: 벤치마크 과적합 금지(단일 소스 연속 라운드 금지, PART H-8)** + greenRisk가 리페인트 강제→원본보다 열화 (v5 우선순위 재정렬로 해소) |
| 2026-07-03 | **r10 극한 티어 3종 (eyestack d44a7797 부활 / marble / whitebuddha f0be5e02)** `[n=3]` | 4중부적합 포기작 / 보존경로 2종 + 회전경로 1종 | 극한 운동 티어 (글로우 0.5~0.8, 케이던스 21, 드리프트+포탈+플로우) | ⚠️ 2/3 어둡게 침몰 | **글로우파동 평균편향 버그**(crest−0.3 기준선 > 실제 마루평균 → 상시 감광) + **OKLCH 그린밴드 좌표계 불일치** → r11 수정 중. whitebuddha(회전경로)는 PASS·비비드. eyestack은 "모노크롬 정체성+빛만 여행" 콘셉트 자체는 유효 |
| 2026-07-02 | **ganesha-8b4cafbd dmt-v7 5종** `[n=1 가설]` | 밝은 컬러풀 Ganesha + 동심원 링 + busy 배경 + figure 중심 | v6가 full-frame dayglo yellow/green으로 과하게 떠서 탈락. v7은 같은 source-derived 9레이어(`void/aura/halo/body/gold/cyan/magenta/white/shadow`) 구조를 유지하되 spectral 보색 가중치, layer alpha, bloom/CA/rim/glow/feedback을 낮춤. 3/4번은 30fps 캡처에서 Chrome evaluate timeout이 있어 20fps 캡처 후 30fps 출력으로 우회. 금지된 `mandala/fractal/swirl/pattern/sdf/julia/noise/domainWarp/flow/polar/rotate/scale/ring/voronoi/worley`는 0 유지. | ✅ v7 5종 최종 후보 + QA | 전면 리컬러보다 피사체 가독성과 딥톤을 회복. 빠른 색 디졸브는 유지하되 v6의 쨍한 과노출을 줄임. 5종 모두 1080x1920/20s/30fps/600f 검증. 3/4는 dup 프레임이 있지만 최종 컨테이너는 30fps/600f이며, 안정성을 위해 장시간 Chromium 캡처 부하를 낮춘 우회로 산출. |
| 2026-07-02 | **ganesha-8b4cafbd research-dmt-v5 classic 5종** `[n=1 가설]` | 밝은 컬러풀 Ganesha + 동심원 링 + busy 배경 + figure 중심 | 심층 DMT/visionary 리서치 재반영. 금지된 mandala/fractal/swirl/pattern generator를 전부 0으로 유지하고, 원본에서 뽑은 `veil-field`/`portal-depth`/`entity-light`/`jewel-current`/`skin-current`/`optic-linework` 6레이어를 사용. v4/v5 초기의 "단색 마스크+필터" 느낌을 줄이기 위해 각 레이어 RGB에 원본 픽셀의 명암·보색 정보를 섞는 `spectralColor` 적용. 레이어별 `colorCycle.speed`를 모두 다르게 두고 20초 정수 루프 유지, 약한 trails/feedback은 warp/rotate 0으로 제한. | ✅ 5종 산출 + QA | classic 세트가 최종 후보. 첫 spectral 세트는 안정적이지만 5종 차이가 작았고, classic은 opacities/팔레트를 더 벌려 선택지가 됨. 접촉 시트 기준 hard cut 없이 6.0~6.8s 구간도 빠른 디졸브로 이어짐. `mandala.opacity=0`, `kaleidoscope=0`, `pattern/sdf/julia/noise/domainWarp/flow/polar/rotate/scale/ring=0`; 금지 패턴을 새로 생성하지 않고 소스 기반 라인워크·오라·잔상만 사용. |
| 2026-07-02 | **ganesha-8b4cafbd research-dmt-v4 5종** `[n=1 가설]` | 밝은 컬러풀 Ganesha + 링/문양이 이미 있는 figure 중심 소스 | DMT/visionary 리서치 재반영. base는 원본 파일을 그대로 레이어화하고 `saturationBoost=1`, `paletteAmount=0`, `glow=0`, `--tonemap none`로 보존. 환각감은 source-derived `background-field`/`halo-chamber`/`warm-energy`/`cool-energy`/`edge-prism` 5개 레이어가 각기 다른 `colorCycle.speed`/phase로 빠르게 디졸브. 과노출 원인이던 screen/add 남발을 중단하고 `normal` 중심 + edge만 `multiply`로 네온 라인워크 강화. `godRays=0`, bloom 0.12~0.18, feedback warp 0. `mandala`/`kaleidoscope`/fractal/swirl 생성 계열 전부 0 | ✅ 5종 산출 + QA | 이전 v3는 screen+bloom 때문에 중앙 피사체가 백화됐음. v4는 백화 없이 블랙라이트/DMT 후보로 수렴. 5종 모두 1080x1920/20s/30fps/600f 검증. 접촉 시트 기준 02/03이 가장 균형, 01/04/05는 더 다크하고 네온 대비가 강한 후보. |
| 2026-07-02 | **ganesha-8b4cafbd master-dmt 5종** `[n=1 가설]` | 밝은 컬러풀 Ganesha + 동심원 링 + busy 배경 + figure 중심 | DMT 리서치 기준으로 5방향(`hyperspace-chamber`/`jewel-deity`/`entity-aura`/`indigo-oracle`/`fast-dissolve`) 생성. 공통: `--tonemap none`, base 원본 보존형 color dissolve, `satBlendLow=-1`, `satBlendHigh=0`, `satInjectionMul=0`, overlay screen/add 저Opacity(대략 0.035~0.135), 레이어별 speed/phase 분리, `trails=0`, `multipassFeedback=0`, mandala/fractal/swirl 계열 전부 0 | ✅ 5종 산출 + QA | 첫 시도는 base도 저채도 blend 기본값 때문에 피사체가 창백/회색화되고, 넓은 screen overlay가 원본을 씻어냈음. 해결: base preserve blend를 강제하고 overlay를 크게 낮춤. v4의 multiply 계열은 중앙 밴드 아티팩트 유발 → 제거. 최종 QA: 5종 모두 1080x1920/20s/30fps/600f, 6.0~6.8s 연속 프레임에서 hard cut 없이 디졸브. 후보감은 02(jewel)·05(fast) 우선, 04는 절제형. |
| 2026-07-02 | **ganesha-8b4cafbd triplex-holo** `[n=1 가설]` | 밝은 컬러풀 Ganesha + 동심원 링 + busy 배경 | 사용자 요청으로 기존 `ring-dissolve` 대비 `colorCycle.speed` 4→12(3배), `paletteAmount 0.34`, `paletteValueFloor 0.34`, `paletteSatFloor 0.58`, `saturationBoost 1.48`, `hueKey 0.95`, bloom/CA/feedback 강화, `--tonemap none` | ✅ 요청 반영 | 보존형보다 훨씬 환각적이고 색 변화가 빠름. 단 Ganesha figure 중심 소스라 그린/마젠타 페이즈가 강하게 드러나며, 이 방향은 "원본 보존"보다 명확히 공격적인 룩. |
| 2026-07-01 | **buddha-e7389d99 preserve-warm-loop** `[n=1 가설]` | 부처/인물 조각상 + 이미 완성된 비비드 사이키델릭 + 큰 매끈 배경 | `IMAGE_TO_LOOP_WORKFLOW` 순서대로 rainbuddha2(3레이어) 먼저 시도 → BRIA 573x1024/flux 807x1440 업스케일로 암부·블록화; 최종은 단일레이어 preserve+warm, `--tonemap none`, `colorCycle.speed=3`, `paletteAmount=0.08`, `multipassFeedback=0` | ✅ 최종 후보 | 부처 타입이어도 API 레이어가 저해상도로 오면 rainbuddha2보다 원본 단일레이어 preserve+warm이 낫다. feedback 0.38은 seam ratio 3.76이라 루프용 최종에서는 끔. |
| 2026-07-01 | **buddha-cfc45443 preserve-warm-loop** `[n=1 가설]` | 부처/인물 조각상 + 이미 완성된 비비드 사이키델릭 + 매끈 배경 | `IMAGE_TO_LOOP_WORKFLOW` 순서대로 rainbuddha2(3레이어) 먼저 시도 → 배경 블록화/subject 암부; 최종은 단일레이어 preserve+warm, `--tonemap none`, `colorCycle.speed=3`, `paletteAmount=0.08`, `multipassFeedback=0` | ✅ 최종 후보 | cfc도 rainbuddha2 3레이어보다 원본 단일 보존이 깨끗했다. feedback 0.38은 시각은 좋지만 seam 리스크가 있어 loop 최종은 feedback0. |
| 2026-06-24 | **Ganesha 7연속 렌더 전부 사용자 거부 (구려/형편없음)** `[n≥2 법칙 재확인]` | 석상+동심원링+(2번째)배경스월 — 굵은색 BUT figure 중심 | preserve/strong/no-green팔레트/flow모션 등 다수 시도 | ❌❌ 전부 거부 | **재확인된 법칙: 파이프라인은 "흐르는 사이키델릭 구조가 이미 있는 소스"(rainbuddha)에서만 만족작.** Ganesha처럼 **bold-color지만 figure 중심(석상/인물)** 소스는 아무리 튜닝해도 "타이다이된 필터 포스터"에 그쳐 거부됨(buddha-916·eye 시리즈와 동일 결론, n≥3). **flow 모션을 figure에 걸면 멜팅/꿈틀거려 더 나빠짐** — flow는 추상/흐름 소스 전용, figure 소스엔 독. **결론: figure/석상 소스는 받지 말 것. rainbuddha류(전면 흐르는 무지개·액체·연기·마블)만.** (paletteD 그린회피 탐색·circle-time 루프 트릭 자체는 유효하나 소스가 안 맞으면 무의미.) |
| 2026-06-23 | **rainbuddha #13·#14** (완성 비비드 무지개 스틸 2종) `[n=2 강한 교훈 — ⑧ 기준 정정]` | 이미 비비드+흐르는 무지개 구조 (#14는 배경 점묘) | **"리페인트 말고 애니메이션"**: paletteAmount 0.25(소스색 보존) + hueKey 1.2(저분산) + 느린 디졸브 colorCycle + satInj0 + bloom/CA. #14는 추가로 **layer-0(배경)만 median13+blur9 디그레인** | ✅ 둘 다 클린(밝음·비비드·노이즈0·디졸브 흐름) | **⑧ "완성 비비드 스틸" 기준 정정**: ⑧을 "개선 불가→차단"으로 본 건 오류. 사용자 목표는 *개선*이 아니라 ***움직이는 루프(애니메이션)*** — 완성 비비드 스틸도 **그레인 없는 매끈-흐름 구조면 애니메이션 최적 후보**. 핵심 = **리페인트 금지**(paletteAmount 낮게 → hue만 흘려보내 기존 색 디졸브) + **hueKey 낮게**(매끈면을 스페클로 분해 안 함). shroom/rbface가 망한 건 ⑧이라서가 아니라 **그레인/aggressive 리컬러** 때문. **선택적 디그레인 법칙**: 노이즈가 layer-0(배경)에 격리되고 focal이 layer-1이면 **layer-0만 강블러로 제거 가능**(rainbuddha2 성공). buddha-swirl이 실패한 건 focal(스월)과 노이즈(니트)가 *같은 레이어*였기 때문 — 레이어 분리 여부가 디그레인 가능성을 가른다. |
| 2026-06-22 | **monks-vivid** (오렌지 승복 행렬, 숲길) — "어두운 톤 싫다" 핵심 불만 해결 `[n=1 강한 교훈 — 메커니즘 규명]` | 다크 코너(숲/그림자) 있는 장면 | `uPaletteValueFloor` 신설 + **팔레트 HSV value-floor(채도보존)** + colorCycle 0.3~0.6cyc/s | ✅★ **bright+쨍쨍+딥다크0+패턴 살아있음+디졸브** 모두 충족 | **"전반적으로 어두운 톤"의 진짜 메커니즘 = 2중 어둠**: ①`rgb=mix(rgb, palette*originalVal, amt)`에서 **소스 저휘도 영역**(코너 그림자)이 팔레트색을 곱해 어둡게 → `mix(originalVal,1.0,floor)`로 보정. ②**팔레트 자체**가 특정 hue 위상에서 다크네이비로 떨어짐(`A-B` 최저점) → **`rgb2hsv→z=max(z,floor)→hsv2rgb`로 value만 끌어올리고 채도 보존**(밝히되 안 씻김=쨍쨍 유지). 둘 다 `uPaletteValueFloor`(0.5) 하나로 제어. **valueLift(딥블랙 portrait 앵커 망침)와 다름 — 이건 palette 경로 전용이라 안전.** "너무 정적"은 colorCycle 0.2→0.3~0.6cyc/s로 해소(디졸브 유지, seamless 정수cyc). |
| 2026-06-22 | **채도-floor 신설** (pal·ukiyo3·monks 재렌더) `[n=2 강한 교훈]` | 구조형 vs 평평-다크 | `uPaletteSatFloor` 신설 + `paletteValueFloor 0.3·paletteSatFloor 0.8` | ✅pal·monks 쨍 / ✗ukiyo3 배경 올리브 잔존 | **"탁한 밝음"의 정체 = value-floor가 밝기만 올리고 채도를 안 챙겨 저채도 회색/올리브로 뜸.** 쨍한 밝음 = 고채도+적정밝기. → 팔레트 HSV에서 **`y=max(y,satFloor)`로 채도도 floor**(`palHsv.y=max(palHsv.y,uPaletteSatFloor)`, layer.frag). value-floor는 0.5→0.3(과밝음 해소). **구조형 소스(monks·pal)는 쨍 완성.** 단 **ukiyo3 평평-다크 배경은 채도 올려도 그 영역 hue가 그린 데드존 → "채도 높은 올리브"로 여전히 별로**(hue 문제는 sat-floor로 못 잡음, paletteD 필요). **권장값: structured 소스 = pvf 0.3 + psf 0.8.** |
| 2026-06-22 | value-floor 4종 일괄적용 (cosmos·ukiyo3·eye4·pal) `[n≥3 — 경계조건 확립]` | 다양 | `paletteValueFloor=0.5`+satB2.4(+slow소스 cycle↑) | ✅pal / △cosmos / ✗ukiyo3·eye4 | **value-floor 경계조건**: 어두운 영역을 끌어올리는데 **구조 없는 평평한 다크 영역**은 IQ 팔레트 중간 value = **그린 데드존**으로 올라가 **올리브 머쉬**가 됨(ukiyo3 배경·eye4 전면). 반대로 **화면 전체에 구조/디테일 깔린 소스**(monks 길·pal 흐르는머리)는 디테일이 비비드하게 살아남. → **value-floor는 만능 아님: "전면 구조" 소스 전용. 대형 평평-다크 영역 소스엔 올리브 유발.** (mitigation 후보: paletteD로 그린 회피 or 고채도 픽셀만 floor — 미검증.) |
| 2026-06-22 | shroom(IMG_9210) + rbface(a569fa0d) — **완성 비비드 스틸 2종** `[n=2 법칙]` | 전면 오일슬릭 마블 / 무지개 스페클 얼굴 | 풀소스 보존 + 디졸브 (preserve) | ❌ 둘 다 소스보다 나빠짐 | **새 ❌ 기준 ⑧ 확립: "이미 완성된 비비드 사이키델릭 스틸"은 파이프라인이 개선 못 함.** 더할 게 모션(hue 회전)뿐인데 그게 정교한 색을 어두운/탁한 조합으로 망치고(shroom: 다크그린, rbface: 다크블루/올리브), 스페클은 hue 노이즈가 됨. **게이트에서 사전 차단.** 파이프라인은 사이키델릭이 *아직 안 입혀진* 굵은-매끈-컬러 소스(lotus/석상/인물사진)에 색을 *입힐* 때 가치. 이미 입혀진 건 손해. |
| 2026-06-22 | eye2 "검정 없이 전화면 비비드" 13회 시도 → **bright2x 복귀** `[n=1 강한 교훈]` | 컬러풀 단일 portrait | 풀소스 배경교체 + valueLift↑ + palette hsv.z + 고채도/그린제거 다수 | ❌ 매번 다른 벽, 사용자 딥블랙 복귀 선택 | **(1) "출력 검정"의 진짜 원인 = flux-fill이 배경을 어두운 인페인트로 교체(소스 탓 아님). → 소스 배경이 좋으면 layer-0을 풀소스로 교체(`§4`).** (2) 그래도 "검정0+어둠톤0+전화면 쨍쨍+디졸브"는 **단일 인물 소스(near-black 머리 + 자체 busy 필리그리)에선 천장**: recolor=그린/카오스, preserve=muted maroon/약모션. 매번 트레이드오프. **딥블랙은 이 소스의 강점**(bright2x가 베스트). (3) `pal×hsv.z`는 valueLift로 어둠을 색칠 가능케 하나 위 한계로 무의미 → 원복. **결론: 전화면 필리그리 극대화는 §0 "필리그리 소스"(흐르는머리/연기/대리석)로 가야지, 딥블랙 portrait를 억지로 채우지 마라.** |
| 2026-06-22 | eye2 "검정 없애고 필리그리로 덮기" 시도 → **전면 철회** `[n=1 강한 교훈]` | 컬러풀 딥블랙 portrait | valueLift↑로 검정 채우기 + filigree, palette G채널 약화, 셰이더 `pal×hsv.z` 실험 | ❌ "점점 이상" → 철회 | **딥블랙은 결함이 아니라 그 작품의 핵심 — 채우지 마라.** eye2 베스트의 임팩트=딥블랙 대비(마블이 *튐*). 검정을 채우면 ①대비 소실로 인물이 배경에 묻힘 ②전 화면 균일 저대비 = 어떤 색으로도 머디·산만 ③평평한 배경은 **filigree 구조 생성 불가**(filigree는 휘도/구조를 타야 함 — 이전에 배경 filigree를 만든 건 worley 거미줄 벽이 구조를 넣어준 것). "no-black" 목표 자체가 딥블랙 미학과 정면충돌. 셰이더 `pal×originalVal`→`hsv.z` 변경은 valueLift로 검정 채우기를 가능케 하나 위 이유로 무의미 → **원복**(G는 valueLift0이라 무영향이었음). |
| 2026-06-22 | eye2-holo-bright (G 밝기 튜닝) `[n=1]` | 컬러풀 딥블랙 portrait | G + paletteA 0.68→0.80 · B 0.36→0.28 · bloom 1.0/thr0.42 · glow 0.3 · **layer0 valueLift 0 유지** | ✅ 사용자 "더 밝게" 충족 | **"전반적으로 밝게"의 올바른 레버 = palette A↑·B↓ + bloom/glow↑, valueLift는 건드리지 마라**(layer0 valueLift>0이면 딥블랙 배경이 회색으로 떠 앵커 상실). 보너스: 밝히니 그린 페이즈도 덜 도드라짐. (§0 "밝은 톤만" 항과 일치 — 재확인.) |
| 2026-06-22 | 실패작 5종 G 재렌더 (eye4/cosmos/ukiyo1/ukiyo3/pal) | 다양 | §5 패밀리 G 일괄 적용 | ✅pal·cosmos / △ukiyo1 / ✗eye4·ukiyo3 | **G는 만능 아님(소스 적합성 8할 재확인).** 밝은 focal 요소 있는 딥블랙 소스(pal 흐르는머리·cosmos 은하)엔 강함. **이미 어두운 소스(ukiyo3)는 G의 딥블랙앵커가 과하게 어둡게**, busy 텍스처(eye4)는 그린. → 어두운 소스엔 valueLift 올리거나 G 부적합. |
| 2026-06-22 | **eye2-holo-clean** (holo 최종) | 컬러풀 딥블랙 portrait | **§5 패밀리 G** (`recipes/eye2-holo-clean.json`) | ✅★ **세션 최종승인 (베스트)** | 사용자: 이 설정값이 제일 맘에듦. holo-iridescent + 느린 디졸브[2/2.5/1.5] + feedback0(루프심 깜빡 제거) + domainWarp2 깊은마블 + 웹 제거 + 순수 딥블랙. **단일 인물 portrait도 극한 사이키델릭 가능 증명** → §0의 "portrait 회피" 결론 부분정정. 잔여: 그린 페이즈 노출(취향, paletteD 재튜닝 가능). |
| 2026-06-22 | eye2 극한 고도화 (셰이더 개선 + 4레시피) | 컬러풀 딥블랙 portrait | **셰이더 패치 6건으로 절차적 패턴 ban-safe화** + cellular/mandala/fractal/holo 4종 | 🏆 holo-iridescent 최강(딥블랙 유지+홀로그래픽), cellular 2위(배경 crackle 과함) | **ban-safe 패턴 고도화 = 정지위치 패턴 + 느린 디졸브.** shipped 효과의 함정 = 하드코딩 `time*x` 드리프트/케이던스(worley L429·voronoi L437 대각선, julia L391·ring L463 비정수 케이던스, mandala ringWave `-uTime*1.2`). 전부 정지화 or hueShift 동기화로 패치. 새 `uDomainWarp2`(2옥타브 재귀 워프, opt-in). voronoi/worley는 레이어0(배경) 끄고 subject만 켜야 딥블랙 유지. mandala 8fold/fractal D는 올리브로 튀어 약함. |
| 2026-06-22 | eye2 (디졸브 + 패턴복원, 반복 고도화) | 컬러풀 딥블랙 portrait (손-얼굴) | **느린 colorCycle 디졸브 + 정지 fbm 마블 + 정지색 림 + 밝은 팔레트** | ✅ 디졸브 방향 채택(고도화 진행중) | (아래 4개 교훈) |
| 2026-06-22 | eye2-vary (고도화 5차) | 컬러풀 딥블랙 portrait | speed **레이어별 [8,9.5,7]**(2x), **레이어별 paletteD 다르게**(hue 여정 분리), B진폭↑, hueKey2.8, 밝은A·anti-strobe 유지 | ✅ 풀스펙트럼 변주 | **"더 바레이션" 처방**: ①레이어별 다른 colorCycle 속도(단 20s×speed/period=정수 유지) ②레이어별 다른 paletteD ③hueKey↑. 마블 filigree가 매 순간 다른 색조합 통과 = 강한 사이키델릭. 속도 8(0.8회전/s)이라도 godRays/aura/glowPulse 죽이면 strobe 안 됨(hue만 빠르게 흐름). |
| 2026-06-22 | eye2 + ukiyo1 (palette에 **패턴 복원**) | 컬러풀 딥블랙 / 블루 ukiyo-e | pal-vivid2 + fbm마블 + 림글로우 | ❌ "번쩍번쩍" | **noise 금지의 정체 = 대각선 드리프트(noiseSpeed>0)지 fbm 자체가 아니다.** `noiseSpeed=0` → 마블 공간 고정 + colorCycle이 색을 흘려보냄 = 금지 안 어기고 질감 복원. 림은 실루엣 고정. **voronoi/worley는 `time*0.3` 하드코딩 드리프트(layer.frag:429,437) → 제외.** |
| 2026-06-22 | ukiyo-e 시리즈 (블루 배경 목판화/일러스트, 다수) | 플랫 컬러+블루 지배 배경+뚜렷한 요소(눈/레인보우/인물) | A clean→느린cc→hue고정+noise 다수 | ❌접음 | **모션=hue변형 딜레마**: colorCycle이 블루를 그린으로 시프트, noise는 대각선 흐름(금지)+hue흔듦. 정지·geometric·noise 다 금지된 상태에서 블루 보존+모션 동시 달성 불가. 블루 지배 소스 회피. (lotus처럼 보였지만 블루 면적이 결정적 차이) |
| 2026-06-18 | eye2/3/4/5 (손-얼굴 portrait, busy 텍스처) | 컬러풀+딥블랙+**busy 잔디테일** | trip3→밝히기→denoise→lownoise 등 | ❌전부 별로 | 잔디테일이 노이즈로 남음 |
| 2026-06-19 | cosmos2 (5115e0a6, 우주 은하+행성) | 컬러풀+딥블랙+뚜렷한요소(행성) BUT **전체가 잔물결 라인텍스처로 뒤덮인 완성 스틸** | aggressive→preserve→min-remap 다수 | ❌전부 별로 | 구도/요소 좋아도 **busy 라인텍스처가 전면**이면 실패. 밝은부분→그린 머디 + 텍스처 스페클. element 분리도 무의미(요소들도 다 라인텍스처). |
| 2026-06-19 | buddha-916 (026bc850, 9:16크롭) | 구도 좋음(석상+스월+골드) BUT **회색 석상 hero + 이미 웜한 팔레트** | aggressive→preserve 다수 | ❌최악 | (1)**회색 hero**는 색 넣으면 머디(monochrome 문제 재현). (2)**이미 웜한 팔레트는 hue 재매핑 엔진 거치며 가르시 그린/옐로로 튐** — 원본 색 보존 불가(셰이더가 hue를 remap). (3)구도 좋아도 hero가 회색이면 실패. → 컬러풀 hero(석상 회색 말고) 소스라야 함 |
| 2026-06-19 | eye6 (a6ae1f62, 손-얼굴 portrait, **매끈**) | 매끈+소프트 파스텔 | trip3 | △eye보다 나음 BUT 불만족 | **결정적 인사이트: 천장은 질감이 아니라 "구도/요소"다.** 매끈하게 해 노이즈 줄여도(텍스처=노이즈 주범 맞음) **단일 인물 클로즈업 portrait은 "무지개 피부"에 그쳐 임팩트 약함**. 만족작 lotus는 뚜렷한 컬러 요소(연꽃/부처/물)+구도가 있는 "장면". → **단일 인물 portrait 회피. 뚜렷한 요소가 있는 구도/장면 소스 선호.** |
