> **Status: RATIONALE (2026-09-02).** 이 문서는 **증거와 이유**다. 명령·법은 `00-INDEX.md` v2(§1 두 계약 · §2 루프 · §3 천장 · §4 발화 사전)에 편입됐다. 여기서 명령을 가져오지 말 것. 00과 충돌 시 **00 승**.
> §5 표의 1–4는 2026-09-02 구현 완료(hold 기본값 · `--hero` · `--sketch` + `sketch-grid` · `isaac-pick` · `close-lock` · `deadZone`). §6 Isaac 판정 3건(L6/L7/L9)은 아직 열려 있다.

# 05 — Hallucination Method: "바닥"이 아니라 "천장"을 올리는 작업 방식

---

## 0. 한 줄 진단

현 OS는 **죽은 영상을 못 내보내게 하는 바닥(floor)** 은 완성했지만, **환각적인 영상을 요구하는 천장(ceiling)** 이 없다.
바닥만 있는 시스템에서 에이전트의 합리적 최적해는 "골든 그대로"(r343·r345 최종 = 골든 무수정)다. 그래서 환각 요소가 적다.

---

## 1. 증거 (레저 §9 + 게이트 리포트 실측)

### 1.1 게이트는 환각을 측정하지 않는다 — 충실도 상한만 측정한다

`psychedelic-gate.ts` 실패코드 8개 전부가 **모션/드리프트/보일의 상한**이다. 환각의 **하한**은 없다
(`material-coverage`·`connectedness` 하한은 레퍼런스의 25%로 사실상 항상 통과).

| 최종본 | gate | motionDensity | Isaac |
|---|---|---|---|
| r343 r221 v1 | **PASS** | 0.091 (최저) | 최종 |
| r325 v8b | REJECT boil/edge/drift | 0.512 | 최종 "이게 젤 나아" |
| r342 v1c | REJECT boil/edge | 0.377 | 최종 "맘에든다" |
| r344 v3 | REJECT edge | 0.366 | 최종 |
| r345 v1 | REJECT local-drift | 0.058 | 최종 |
| r346 v11 | REJECT edge 0.829 / drift 0.326 | 0.402 | 최종 |
| r346 v6 denoise | REJECT boil | 0.254 | "하나도 싸이키델릭하지않아" |
| r346 v10 ingest | QA PASS | 0.411 | "구려 완전 별로야" |

- 최근 6 최종본 중 **5건 REJECT + humanOverride**. 유일한 PASS(r343)는 **가장 안 움직이는** 결과.
- `temporalCoherenceFloor` = 0.85 × min(ref) = **0.8102**, `fineMotionCeiling` = **0.34** — 레퍼런스(2026-06 승인작 2편)를 *바닥 캘리브레이션*으로 쓰라던 Isaac 지시([[feedback_extreme_standard]])와 반대로 **천장**으로 쓰고 있다.
- `motionDensity`만으로도 예측 불가(r345 0.058 최종 / v10 0.411 탈락). 빠진 차원은 **양이 아니라 모션의 구조**(§3).

### 1.2 골든은 설계상 준정적이다

r221: `colorCycle 0 · phaseAmount 0 · phaseWarpAmount 0 · glowWave 0.10 · feedback 0.12 zoom 1.0 · breath 0.003`.
= sourcePrism 크로마 회전 + 미세 휘도파. `session-grade`는 "히어로가 얼지 않았는가"만 본다. 바닥이다.

### 1.3 만들어놓고 한 번도 경로에 넣지 않은 프리미티브

`be49eb8 feat(shaders): opt-in emergent pattern-formation primitives (multi-wave interference, reaction-diffusion, phase warp)` 이후, 골든 5 + 락 5 + 락 플레이트 스크립트 전수:

| 프리미티브 | 위치 | 골든/락 사용 |
|---|---|---|
| `reactionDiffusionAmount` (feedback, 휘도 전용) | `multipass-feedback.frag:110` | **0 / 0** |
| `feedback.zoom ≠ 1` (포탈 흡인) | `multipass-feedback.frag:93` | 9곳 모두 **1.0** |
| `camDrift` (벡션) | `layer.frag:910` | **0 / 0** |
| `phaseWarpAmount` (글로우파 위상 왜곡) | `layer.frag:1750` | 11곳 모두 **0** |
| `tangentMicroflow` · `sourceMaterialDissolve` · `sourceSpectralFlow` · `sourceChromaFlow` · `domainWarp` · `scalePulse` · `feedbackMask` | layer.frag | **0 / 0** |
| `sourceStreamFlow` | layer.frag | r348 v4 1회 → gate "boiling" REJECT |

전부 **소스 픽셀의 in-place 변형**(R-038 적합)이고 R-060(회전/각위상/칼레이도) 금지 목록에도 없다.
그러나 어느 문서도 "합법"이라 명시하지 않으므로 zero-context 에이전트는 절대 건드리지 않는다.

### 1.4 규칙이 탐색공간을 단조 감소시킨다 (래칫)

- §5 KILLED AXES 17행 + R-053(실패 패밀리 영구 차단) + R-013(2미스 정지) + §13 DoD "골든 또는 **단일축 델타**".
- **축을 죽이는 규칙만 있고, 축을 만들거나 재진입시키는 규칙이 없다.**
- 결과: Isaac이 "더 창의적으로"라고 하면 에이전트의 유일한 합법 수는 knob 델타(sat/glow/bloom/CA/surface).
  r346 v2·v4·v5·v6·v7이 전부 그것이었고 판정은 "하나도 싸이키델릭하지않아".
- Isaac이 좋아한 두 수는 모두 **언어 변경**이었다: v3 24밴드 카운터플로우("링이 안팎으로 흐르는건 맘에 들어"), v11 인물만 r139 텍스처(최종).

### 1.5 피드백 오독

- "자글자글 노이즈 낀거같아"(v5) → 에이전트는 "전부 낮추기"(v6 denoise) → "너무 구려". 노이즈 = **미세 스케일 에너지가 중/대 스케일보다 큰 것**이지 "덜 움직이라"가 아니다.
- "사람 형태가 너무 정적이야" → `patchSessionScene`의 hold 기본값이 `surface 6 · phaseFlow 6 · colorMotionMask floor 0.08` = 어두운 몸에는 사실상 모션 0. **기본값이 정적을 만든다.**

### 1.6 Isaac이 이미 명시한 극한 기준 대비 이행률

2026-07-03 기준(메모리 `feedback_extreme_standard`): ① 전영역 모션(staticZone→0) ② **다중 파동 간섭** ③ **벡션(카메라 드리프트 + 포탈 줌 흡인)** ④ 색 밴드가 구조를 타고 질주.

| 항목 | 현 OS |
|---|---|
| ① 전영역 | ✗ hold 레이어가 영역을 얼림 |
| ② 간섭 | ✗ glowWave2 존재하나 0.06, phaseWarp 0 |
| ③ 벡션 | ✗ zoom 1.0 · camDrift 0 |
| ④ 구조 따라 색 밴드 | ✓ (L1/L3만) |

4개 중 1개.

---

## 2. 방법론 전환: knob 튜닝 → 언어 작곡 (Language Composition)

### 2.1 두 계약 분리

| 계약 | 내용 | 상태 |
|---|---|---|
| **Floor** (04) | 히어로 travel · no box · no spin · plates · olive/bleach/seam | 유지, 손대지 않음 |
| **Ceiling** (신설) | 후보는 **언어 맵**을 선언하고 §2.3 최소 조건을 충족해야 프리뷰 제출 가능 | 이 문서 |

게이트 정책: `temporal-boiling` · `source-edge-damage` · `source-local-drift`는 **얼굴 코어 마스크에서만 FAIL**, 전프레임에서는 WARN.
풀렌더 허가 = Isaac visual OK + Floor PASS. (게이트 PASS는 Isaac 승인을 예측한 적이 없다 — §1.1.)

### 2.2 언어 목록 L-set (모두 소스 픽셀 in-place · R-038/R-060 적합)

| ID | 언어 | 구현 | 상태 |
|---|---|---|---|
| L1 | **Travel** — 커스텀 필드 따라 픽셀 이동 (halo/fall/beam) | `sourceFlowAdvection` + `flow-*.png` | ✓ 승인(r325/r342) |
| L2 | **Counterflow** — 교대 in/out 밴드 (8→24) | `flow-halo-counter` | ✓ 승인(r346 v3 "링 안팎") |
| L3 | **Chroma river** — 위상 크로마 회전 | `sourcePrism surface/phaseFlow` | ✓ 현 기본 |
| L4 | **Interference** — 비가약 속도 2개 휘도파 + 위상 왜곡 | `glowWave`(속도 a) + `glowWave2`(속도 b, a:b 비정수비) + `phaseWarpAmount` | 존재·미사용 |
| L5 | **Texture emergence** — 평평/어두운 영역에 dense-edge 프리즘 | r139 knobs + `colorMotionMask.floor 1` | ✓ 승인(r346 v11) |
| L6 | **Vection** — 포탈 줌 흡인 + 미세 카메라 드리프트 | `feedback.zoom 1.003–1.010` + `camDrift radius ≤0.004, integer cycles` | 존재·미사용 · **Isaac 판정 필요** |
| L7 | **Pattern formation** — 휘도 전용 반응확산, 필드/그라운드 마스크만 | `reactionDiffusionAmount` + `feedbackMask` | 존재·미사용 · **Isaac 판정 필요** (R-038 "생성 노이즈" 경계) |
| L8 | **Mid-scale material** — dissolve / spectral / chroma flow / tangent microflow | 각 `source*Flow` | 존재·미사용 |
| L9 | **Region colorCycle** — 피부 아닌 영역 마스크(할로/필드/스카이)에만 정수 cycle | `colorCycle.speed 12–20` on masked source layer | 죽은 축 **재진입** · **Isaac 판정 필요** (R-018은 *portrait body* 한정) |
| L10 | **Macro arc** — 20s에 1–2 사이클 엔벨로프로 캐리어 진폭 변조(최면성) | `breath` 확장 또는 glow strength 엔벨로프 | 신규(작음) |

### 2.3 작곡 최소 조건 (프리뷰 제출 전 자가검사)

1. **영역 맵**: 3–5 영역 (hero / figure / field / ground / sky). hero는 `hero-detect`, figure는 기존 hold 마스크, 나머지는 `session-plates`의 hue/val 분류(lava/marble/sky 로직) 재사용.
2. **영역당 언어 ≥1. 0인 영역 금지.** ("사람 형태가 너무 정적" 봉쇄)
3. hero 언어 ≥2 (travel + 1). 프레임 전체 언어 종류 ≥3.
4. **스케일 3단** 중 ≥2 존재: macro(밴드 ≥200px) · mid(30–80px) · micro(≤12px). **micro가 총 에너지의 50%를 넘으면 안 됨** (= "노이즈" 디코더).
5. **템포 ≥2 비가약** (예: 3 vs 5 cycles/20s). 선택: L10 macro arc 1 cycle.
6. 얼굴 코어: L3 저강도 또는 L5만. L1/L6/L7 금지(정체성).

이 조건은 "예쁘다"를 보장하지 않는다. **"knob 델타로 창의성 요청에 답하는 것"을 불가능하게** 만든다.

---

## 3. 측정: R-023 부채 상환 — H 지표 (report-only로 시작)

`qa-motion-core.ts`에 WARN 행 추가. 게이트 아님. 10건 Isaac 라벨 축적 후 하한 캘리브레이션.

| 지표 | 계산 | 의미 | 상태 |
|---|---|---|---|
| `deadZone` | staticZone(hue) **AND** lightStaticZone(luma) 모두 정적인 셀 비율 | ①전영역. 기존 staticZone은 hue 전용 | **구현 (2026-09-02)** |
| `microShare` | 프레임차의 라플라시안 피라미드 최상단 에너지 비율 | "노이즈/자글자글" 수치화. >0.5 WARN | 미구현 — 32×57 그리드로는 micro를 볼 수 없어 풀해상 프레임 경로 필요 |
| `flowDirections` | 블록매칭 방향 히스토그램 피크 수 (≥3 = 간섭) | ②간섭 · 언어 수 프록시 | 미구현 — 같은 이유 |

H = (1 − deadZone) × min(flowDirections/3, 1) × (1 − max(0, microShare − 0.5)×2). 라벨 15건(최종 6 / 탈락 9) 있으니 나머지 2지표가 붙는 즉시 상관 확인 가능. 그때까지 §2.3 조건 4·5는 에이전트 자가검사.

---

## 4. 프로세스: 발산 → 수렴 (v1→v11 힐클라임 대체)

### 4.1 Sketch grid (신설)

새 소스 1장 → **언어 맵 4–6종**을 저해상(408×728) · 6s로 한 컨택트 영상에 라벨 붙여 렌더. Isaac은 **언어를 고른다**, knob이 아니다.
그 뒤에만 1632 프리뷰. 예산: grid 1 + 프리뷰 ≤3 / 소스. (r346은 프리뷰 11회.)
R-013 2미스는 유지하되 grid는 타일 수 무관 1미스로 계산.

### 4.2 Isaac 발화 디코더 (§8 triage에 추가 제안 — 레저 실발화 기반)

| 발화 | 뜻 | 허용 수 | 금지 수 |
|---|---|---|---|
| "약해 / 더 세게" | 진폭 부족 | glow strength↑, 밴드 수↑, 언어 추가 | 속도↑ (r344 v2 "너무 스피디해") |
| "스피디해 / 빨라" | 템포 과다 | cycles↓ | 진폭↓ |
| "노이즈 / 자글자글 / 뭉게" | micro 스케일 과다 | surface↓ **+ 밴드폭↑**(에너지를 mid/macro로 이동) | 전체 감쇠(r346 v6) |
| "정적이야 / 멈춰있어" | 그 영역 언어 0 | L5 먼저, 다음 L1 | hold alpha↑ |
| "창의적으로 / 새로운거 / 다른 프리셋" | **언어 맵 변경 요구** | 언어 ≥1 추가·교체, grid | knob 델타로 응답 |
| "패턴 다 똑같" | 전 영역 동일 언어 | 영역별 상이 언어 | 진폭 |
| "이질적 / 오버레이 / 덮은거" | R-038 위반 | 제거 | 완화 |
| "꿀렁 / 멜트" | R-063 | `phaseFlowPx`↓ 먼저 | prism 제거·cosmos |
| "구려 / 별로" | **그 영역 클래스에서** 그 언어 kill | 다른 영역·언어 유지 | 전체 폐기 |
| "빙글빙글 / 시계방향" | R-060 | 제거 | — |

### 4.3 죽은 축 재진입 규칙

§5 kill 행에 **(축, 영역 클래스, 소스 타입)** 컨텍스트를 붙인다. 다른 영역 클래스 + 소스 픽셀 마스크 적용이면 **재진입 실험 1회 허용**, 단 Isaac에 한 줄 사전 OK.
예: `colorCycle` kill 컨텍스트 = portrait body → halo/field 마스크 재진입 후보(L9). Isaac 승인 역사(peacock cycle 14–22)와 일치.

---

## 5. 리포 변경 (최소·순서대로 · 각 1파일)

| # | 변경 | 근거 | 상태 (2026-09-02) |
|---|---|---|---|
| 1 | `scripts/lib/session-scene.ts` hold 기본값 → r346 v11 figure knobs (`surface 27 · chroma 3 · glow 0.58/12 · colorMotionMask.floor 1`) | §1.5 — 기본값이 정적을 만듦 | **완료** (테스트: hold surface ≥20, floor 1) |
| 2 | 작곡 골든 2종 | 언어 맵 골든 | **보류** — `form` 히어로용 실루엣 플레이트가 없어 시각 검증 없이 만들 수 없음. hold 기본값(1번)이 halo/pour/beam에서 같은 효과 |
| 3 | `qa-motion-core.ts` `deadZone` WARN | R-023 부채 | **완료** (1/3 지표, §3) |
| 4 | `export-layered.ts --sketch` (¼해상 · 12fps · 6s) + `scripts/sketch-grid.ts` | §4.1 발산→수렴 | **완료** |
| 4b | `--hero` 오버라이드가 `hero.json`(소스 sha 태그)로 기록되고 `session-grade`가 그것을 심판 | 브리프 면 3: "오버라이드를 grade가 존중하는가" → 이전엔 재검출로 무시 | **완료** (테스트 2건) |
| 4c | `scripts/isaac-pick.ts` — Isaac 발화 원문이 풀렌더 허가. 게이트 JSON 손편집 폐지 | §1.1 게이트는 진단 | **완료** |
| 4d | `scripts/close-lock.ts` — 풀렌더 후 락팩 기본화 (02 §4.2 E–H) | "final = mp4 있음" ≠ 재현 | **완료** |
| 5 | 00 v2에 §4.2 디코더 · 01 §9.1에 `quote/language-map` · §13 DoD 교체 | §1.4 래칫 해제 | **완료** (Isaac "다 너맘대로해" 2026-09-02) |
| 6 | 게이트 정책: PASS는 더 이상 풀렌더 바가 아님. 허가 = Isaac pick + floor. `gate:psychedelic`은 진단 도구 | §1.1 | **완료** (가드 코드 무변경 — pick이 override를 기록) |
| 7 | 00 재작성 (v2), 루트 스텁 7개 삭제, AGENTS/skill 포인터 갱신 | 편입 | **완료** |
| **8** | **천장을 코드로** — `scripts/lib/language-map.ts`: 언어를 이름이 아니라 **셰이더 활성화(임계값 이상)** 로 계측 · `prepare-new-source`가 L4+L8+L10을 기본 합성 · `session-grade`가 골든 무수정·같은 소스 클론·composed<3을 **거부** · 골든 그대로는 `isaac-pick.ts --ceiling-waive`만 | §1.4 재발: v2 출하 다음 날 r349가 골든 r221 **82키 0차이**로, r351 v1이 r346 v11 클론(SSIM 0.98)으로 Isaac에게 도달. "agent self-check"는 강제가 아니었음 | **완료 2026-09-03** (테스트 12건 · r349 소스 렌더 검증 §1.5 참조) |

---

## 6. Isaac 판정 3건 (yes/no)

1. **L6 벡션** — `feedback.zoom 1.003–1.010` + `camDrift` 미세 정수 사이클. R-060은 회전만 금지. 7-03 기준의 "포탈 줌 흡인"과 동일 개념. 허용?
2. **L7 반응확산** — 휘도 전용, 필드/그라운드 마스크 한정, 얼굴 제외. 소스 휘도에서 파생되지만 창발 패턴임. R-038 "생성 노이즈" 경계 — 허용?
3. **L9 영역 colorCycle** — 피부/몸 제외 마스크(할로·필드·스카이)에 정수 cycle. R-018 재진입 — 허용?

세 개 모두 no여도 §2·§4·§5-1~4는 그대로 유효하다 (L1–L5·L8·L10만으로 조건 §2.3 충족 가능).

---

## 7. 이 문서가 바꾸지 않는 것

- 04 실행 바닥 · R-038 in-place · R-060 no spin · R-001 animate-not-repaint · 프리뷰 우선 · 오디오 금지.
- Isaac = 최종 판정. 이 문서는 에이전트가 "골든 그대로"로 도망갈 수 없게 하는 **천장**을 추가할 뿐이다.

---

*Draft 2026-09-02 · 근거: 01 §9 r325–r348 · `psychedelic-gate.json`(r346) · `session-scene.ts` · `multipass-feedback.frag` · `layer.frag` · memory `feedback_extreme_standard`(2026-07-03).*
