> **History, not law.** 운영 법과 명령은 `00-INDEX.md`(v2)에 있다. 근거는 `05-HALLUCINATION-METHOD.md`.
> 이 파일은 2026-09-02에 무엇을 왜 바꿨는지의 기록이다. 여기서 명령을 가져오지 말 것. 00과 충돌하면 **00 승**.

# video-os v2 인수인계 — 2026-09-02

한 줄: **파이프라인에 환각 요소가 적었던 것은 취향 문제가 아니라 구조 문제였다.**
OS에 *바닥*(죽은 영상 차단)만 있고 *천장*(환각 요구)이 없어서, 에이전트의 합리적 최적해가 "골든 무수정"이었다.

| 항목 | 수 |
|------|-----|
| 변경 파일 | 30 |
| 신규 파일 | 9 |
| 삭제 스텁 | 7 |
| 테스트 | 78 통과 |
| 발견·수정 버그 | 1 |
| Isaac 판정 대기 | 3 |

렌더 없음 · 오디오 없음 · 커밋 없음 · 닫힌 락 무변경.

---

## 목차

- [1. 진단](#1-진단)
  - [1.1 증거 — 게이트는 환각을 측정하지 않는다](#11-증거--게이트는-환각을-측정하지-않는다)
  - [1.2 증거 — 만들어놓고 한 번도 안 쓴 프리미티브](#12-증거--만들어놓고-한-번도-안-쓴-프리미티브)
  - [1.3 증거 — 규칙이 탐색공간을 단조 감소시킨다](#13-증거--규칙이-탐색공간을-단조-감소시킨다)
- [2. 변경 D — 문서](#2-변경-d--문서)
- [3. 변경 E — 강제](#3-변경-e--강제)
- [4. 변경 T — 새 도구](#4-변경-t--새-도구)
- [5. 변경 B — 발견한 버그](#5-변경-b--발견한-버그)
- [6. 새 루프](#6-새-루프)
- [7. 참조해야 할 파일](#7-참조해야-할-파일)
- [8. 검증 결과](#8-검증-결과)
- [9. Isaac 판정 대기 3건](#9-isaac-판정-대기-3건)
- [10. 추가 (2026-09-03) — 천장을 코드로 옮김](#10-추가-2026-09-03--천장을-코드로-옮김)

---

## 1. 진단

기존 OS는 **죽은 영상이 못 나가게 하는 바닥**을 완성했다. 히어로가 얼면 export가 거부하고, 직사각 홀드는 스캔에서 걸리고, 스핀은 금지된다. 그런데 **환각을 요구하는 천장**이 없었다.

바닥만 있는 시스템에서 에이전트의 가장 합리적인 수는 "골든을 건드리지 않는 것"이다. 건드리면 바닥에 걸릴 위험이 생기고, 안 건드리면 확실히 통과한다. 실제로 **r343과 r345의 최종본은 골든 무수정**이었다.

그리고 Isaac이 수용한 수는 언제나 **언어 변경**이었다. r346 v3의 24밴드 카운터플로우("링이 안팎으로 흐르는건 맘에 들어")와 v11의 인물만 r139 텍스처. 그 사이에 있던 다섯 번의 knob 라운드(채도·글로우·블룸·CA·surface)는 전부 "하나도 싸이키델릭하지않아"를 받았다.

### 1.1 증거 — 게이트는 환각을 측정하지 않는다

`scripts/lib/psychedelic-gate.ts`의 실패코드 8개는 모두 모션·드리프트·보일의 **상한**이다. 환각의 **하한**은 없다. 하한처럼 보이는 `material-coverage`와 `connectedness`는 레퍼런스의 25%라 사실상 항상 통과한다.

| 버전 | 게이트 | motionDensity | Isaac 판정 |
|------|--------|--------------:|------------|
| r343 r221 v1 | **PASS** | 0.091 | 최종 채택 |
| r325 v8b | REJECT boil·edge·drift | 0.512 | 최종 "이게 젤 나아" |
| r342 v1c | REJECT boil·edge | 0.377 | 최종 "맘에든다" |
| r344 v3 | REJECT edge 0.827 | 0.366 | 최종 "ㅇㅇ 풀렌더" |
| r345 v1 | REJECT drift 0.340 | 0.058 | 최종 채택 |
| r346 v11 | REJECT edge 0.829 · drift 0.326 | 0.402 | 최종 "플렌더" |
| r346 v6 denoise | REJECT boil | 0.254 | "너무 구려 하나도 싸이키델릭하지않아" |
| r346 v10 ingest | QA PASS | 0.411 | "구려 완전 별로야" |

최근 최종 6건 중 **5건이 REJECT + humanOverride**. 유일한 PASS(r343)가 motionDensity 최저값. motionDensity 단독으로도 예측이 안 된다(0.058이 최종, 0.411이 탈락). 빠진 차원은 모션의 *양*이 아니라 *구조*다.

> **레퍼런스가 뒤집혀 쓰이고 있었다.** Isaac은 2026-07-03에 "레퍼런스는 바닥 캘리브레이션용일 뿐"이라고 명시했는데, 게이트는 그 두 편(2026-06 승인작)으로 `temporalCoherenceFloor 0.8102`와 `fineMotionCeiling 0.34`를 만들어 **천장**으로 쓰고 있었다.

### 1.2 증거 — 만들어놓고 한 번도 안 쓴 프리미티브

커밋 `be49eb8`에서 창발 패턴 프리미티브를 추가했지만, 골든 5 + 락 5 + 락 플레이트 스크립트 어디에서도 켜진 적이 없다. 전부 소스 픽셀 in-place라 R-038에 적합하고 R-060 금지 목록에도 없다. 어떤 문서도 "합법"이라 말해주지 않아 제로컨텍스트 에이전트가 절대 건드리지 않았다.

| 프리미티브 | 셰이더 위치 | 골든/락 사용 |
|---|---|---|
| `reactionDiffusionAmount` | `multipass-feedback.frag:110` | 0 / 0 |
| `feedback.zoom ≠ 1` | `multipass-feedback.frag:93` | 9곳 모두 1.0 |
| `camDrift` | `layer.frag:910` | 0 / 0 |
| `phaseWarpAmount` | `layer.frag:1750` | 11곳 모두 0 |
| `tangentMicroflow` | `layer.frag:1416` | 0 / 0 |
| `sourceMaterialDissolve` | `layer.frag:1229` | 0 / 0 |
| `sourceSpectralFlow` | `layer.frag:1465` | 0 / 0 |
| `sourceChromaFlow` | `layer.frag:1432` | 0 / 0 |
| `domainWarp` · `scalePulse` · `feedbackMask` | `layer.frag` | 0 / 0 |
| `sourceStreamFlow` | `layer.frag` | r348 v4 1회 → boiling REJECT |

같은 맥락에서 Isaac이 2026-07-03에 정의한 극한 기준 네 항목 중 **이행된 것은 하나**였다.

| 항목 | 상태 |
|---|---|
| ① 전영역 모션 (staticZone→0) | ✗ 홀드 레이어가 영역을 얼림 |
| ② 다중 파동 간섭 | ✗ glowWave2 0.06, phaseWarp 0 |
| ③ 벡션 (카메라 드리프트 + 포탈 줌) | ✗ zoom 1.0, camDrift 0 |
| ④ 색 밴드가 구조를 타고 질주 | ✓ |

### 1.3 증거 — 규칙이 탐색공간을 단조 감소시킨다

`01-CREATE-OS.md`에 R-번호 33개, KILLED AXES 17행, 케이스 132건이 쌓여 있고, R-053은 실패 패밀리를 영구 차단하며, §13 DoD는 "골든 또는 **단일축 델타**"를 요구했다. 전부 합치면 남는 합법 수는 knob 델타 하나뿐이다.

그래서 "더 창의적으로"에 대해 할 수 있는 게 sat·glow·bloom·CA·surface뿐이었다. r346의 v2·v4·v5·v6·v7이 정확히 그랬고 판정은 전부 부정. 추가로 "자글자글 노이즈"를 "전부 낮추기"로 오독한 v6은 "너무 구려"를 받았다. 노이즈는 미세 스케일 에너지가 중·대 스케일보다 크다는 뜻이지 덜 움직이라는 뜻이 아니다.

---

## 2. 변경 D — 문서

읽을 파일 수를 줄이고, 법을 한 장에 모은다.

### D1 — `00-INDEX.md`를 v2로 전면 재작성

시작 페이지 한 장에 **두 계약 · 상태머신 루프 · 천장 계약 · 발화→축 사전 · 지식 수명표**를 담았다. 읽기 예산 표를 맨 위에 둬서 잡별로 열 파일을 지정한다. 새 소스 잡은 00 → 04 → 01 §3(타입 트리)만 읽으면 끝.

- **근거**: 제로컨텍스트 에이전트가 1889줄짜리 01에서 최신 법을 못 찾고 골든 r221을 켬. 법·증거·명령이 한 파일에 섞여 있었음.
- **파일**: `docs/video-os/00-INDEX.md`
- **검증**: 00이 인용한 스크립트 8개와 플래그 13개가 전부 코드에 실재함을 grep으로 확인.

### D2 — 01은 타입 트리 · 킬드 · 원장으로 역할 축소

01 상단에 역할 경계를 명시. 운영 법은 00으로, 01은 §3 분류 · §5 킬드 축 · 명령 상세 · §9 원장을 유지. §0 프로세와 00이 충돌하면 00이 이긴다. **R-번호는 R-064에서 동결.**

- **근거**: 규칙을 더 쌓는 것이 고도화로 위장되는 것을 막아야 함. 새 교훈은 사전 한 줄 · 테스트 · 원장 중 하나로 감.
- **파일**: `docs/video-os/01-CREATE-OS.md`
- **검증**: §9.1 템플릿에 `quote:` / `language-map:` 필드 추가, §13 DoD에서 "단일축 델타"를 언어 맵 조건으로 교체.

### D3 — 04에 히어로 오버라이드와 언어 맵 체크박스

히어로 문단을 재작성. 디텍터와 눈이 갈리면 **`--hero` 플래그만이 합법적 이견**이고, 케이스 노트에만 적힌 오버라이드는 존재하지 않는 것으로 취급한다. 프리뷰 전 체크리스트에 언어 맵과 `isaac-pick.json` 항목 추가.

- **근거**: r346 v1 · r348 v1에서 "디텍터는 form이라 했지만 실제 히어로는 halo"라고 케이스에 적었으나 grade는 재검출로 form을 강제했음.
- **파일**: `docs/video-os/04-QUALITY-CONTRACT.md`
- **검증**: 회귀 커맨드 블록에 신규 테스트 2개 추가.

### D4 — `05-HALLUCINATION-METHOD.md` (신규, 근거 문서)

명령은 없고 **이유만** 있는 문서. 게이트 대 Isaac 표, 미사용 프리미티브 전수, 래칫 분석, 언어 세트 정의, 구현 상태표.

- **근거**: 법과 증거를 분리해야 00이 짧게 유지됨.
- **파일**: `docs/video-os/05-HALLUCINATION-METHOD.md` (204줄)
- **검증**: 상태를 PROPOSAL → RATIONALE로 갱신, §5 구현표에 완료/보류 표시.

### D5 — 루트 리다이렉트 스텁 7개 삭제

제로컨텍스트 에이전트가 엉뚱한 파일에서 명령을 복사하는 한 04는 죽은 계약이다. 리다이렉트만 하던 스텁을 지우고 `AGENTS.md`와 스킬을 00만 가리키게 했다.

- **삭제**: `OUTPUT_GAP_ANALYSIS.md` · `IMAGE_TO_LOOP_WORKFLOW.md` · `LAYERED_PIPELINE_PLAYBOOK.md` · `PER_IMAGE_TUNING_GUIDE.md` · `docs/REPRO_LOCKS_PLAYBOOK.md` · `docs/WORKFLOW-image-to-video.md` · `docs/layered-pipeline-usage.md`
- **보존**: 원문은 `docs/video-os/archive/legacy/`에 그대로 있음.
- **검증**: grep으로 잔존 참조 확인 → 02와 03의 2건 수정 완료.

### D6 — 02에 close-lock 우선 경로, 골든 README에 홀드 기본값

02 §4.2 상단에 `close-lock.ts` 한 줄 경로를 넣고 수동 E–H 절차는 참조용으로 남김. 골든 README에 새 홀드 기본값과 첫 결함 노브(`maxDrift` 0.42 → 0.26)를 기재.

- **근거**: r343–r346이 "최종"인데 락팩이 없어 다른 PC에서 재현 불가.
- **파일**: `docs/video-os/02-REPRO-LOCKS.md` · `recipes/golden/README.md`

---

## 3. 변경 E — 강제

문서가 말하던 것을 코드가 실제로 지키게 만든다.

### E1 — `--hero` 오버라이드가 실물이 됨

`applyHeroOverride()` 추가. 문법은 `kind@cxN,cyN[:rInner/rOuter][:wWaterNy]`이고 `--hero-reason`이 필수. halo는 반경 명시가 강제된다(플레이트가 반경으로 만들어지므로). 결과는 소스 sha와 함께 `hero.json`에 기록되고 **session-grade가 그것을 심판**한다. 소스가 다르면 sha 불일치로 무시하고 재검출한다.

```bash
npx tsx scripts/prepare-new-source.ts \
  --source <png> --slug <slug> --recipe recipes/golden/<g>.json --work-dir out/manual-runs/<slug> \
  --hero "halo@0.50,0.20:130/630" --hero-reason "eye rings are the living part"
```

- **근거**: r346 v1 · r348 v1 케이스 노트의 오버라이드가 grade 단계에서 재검출로 소멸. 스폰 브리프 면3의 질문에 대한 답.
- **파일**: `scripts/lib/hero-detect.ts` · `scripts/lib/session-grade.ts` · `scripts/prepare-new-source.ts`
- **검증**: 테스트 6건 — 문법 파싱, halo 반경 강제, 빈 사유 거부, 범위 밖 좌표 거부, grade가 오버라이드 심판, sha 불일치 시 무시.

### E2 — 홀드 레이어 기본값을 r346 v11 인물 knobs로 교체

`patchSessionScene`이 쓰던 홀드 기본값이 **"사람 형태가 너무 정적이야"의 직접 원인**이었다. `surfaceCycles 6` + `phaseFlowPx 6` + `colorMotionMask.floor 0.08`이면 어두운 몸에 프리즘이 사실상 도달하지 않는다. Isaac이 최종 채택한 r346 v11의 인물 레이어 값으로 교체.

| 노브 | 기존 | 신규 | 의미 |
|------|-----:|-----:|------|
| `sourcePrism.surfaceCycles` | 6 | **27** | 표면 텍스처가 실제로 생김 |
| `sourcePrism.phaseFlowPx` | 6 | **32** | 위상 강이 흐름 |
| `sourcePrism.phaseFlowCycles` | 2 | **4** | |
| `sourcePrism.chromaCycles` | 0 | **3** | 크로마 회전 추가 |
| `sourcePrism.phaseMix` | 0.22 | **0** | R-042 패치 마스크 제거 |
| `sourcePrism.detailBoost` | 0.95 | **1** | |
| `sourcePrism.phaseScale` | 5.5 | **7** | |
| `colorMotionMask.floor` | 0.08 | **1** | 어두운 몸 픽셀도 프리즘 수신 |
| `colorMotionMask` lum/sat/edge | 0.72 / 0.65 / 0.5 | **0 / 0 / 0** | |
| `glowWave` | 0.22 / 9 | **0.58 / 12** | R-063 에너지는 글로우로 |
| `glowWave2` | 0.12 / 18 | **0.36 / 22** | 두 번째 파동 |
| `saturationBoost` | 1.38 | **1.74** | |
| `greenCompress` | 0.92 | **0.4** | r139 계열 값 |
| `satInjectionMul` | 0.01 | **0.001** | |
| `sourceColorClamp.maxDrift` | 0.14 | **0.42** | 0.14는 죽은 값. 표백 시 0.26이 첫 수정 |
| `phaseField2` | `phase-mix` | **`phase-luma-hybrid`** | r139 페어 |

- **근거**: r346 v3 "가네샤는 이제 그냥 멈춰있는거 처럼" · v8/v9 검은 창 실패 · v11 Isaac 최종 채택값.
- **파일**: `scripts/lib/session-scene.ts`
- **검증**: `session-scene.test.ts`에 surface ≥ 20, floor === 1 단언 추가.

### E3 — halo 홀드가 히어로 반경을 뚫고 나감

04 §1.2의 "히어로를 홀드하지 말 것"을 코드로 옮김. halo 분기에서 인물 타원이 선언된 헤일로 중심을 삼킬 수 있었는데, 이제 `rInner` 반경 안쪽은 홀드가 0으로 페더된다.

- **근거**: 스모크 중 발견 — r221 소스에 halo 오버라이드를 걸자 홀드 알파 0.97로 grade가 거부. 문서상 위법인 상태를 플레이트 생성기가 만들 수 있었음.
- **파일**: `scripts/lib/session-plates.ts`
- **검증**: 히어로 알파 ≤ 0.28 단언 + r325(halo) · r342(pour) 회귀 스모크 통과.

### E4 — qa-motion에 `deadZone` 지표

기존 `staticZone`은 **hue 전용**이라 휘도 모션(glowWave)을 못 본다. `deadZone`은 hue와 luma가 *둘 다* 정적인 셀 비율. WARN 행이며 게이트가 아니다. R-023 계측 부채의 1/3 상환.

- **근거**: Isaac 극한 기준 ①전영역 모션을 잴 지표가 없었음.
- **파일**: `scripts/lib/qa-motion-core.ts`
- **남은 부채**: `microShare`(노이즈 수치화)와 `flowDirections`(간섭 프록시)는 32×57 그리드로 불가 — 풀해상 프레임 경로 필요. `ponytail:` 주석으로 표시.

---

## 4. 변경 T — 새 도구

루프의 빈 상태를 메우는 명령 3개.

### T1 — `--sketch` + `sketch-grid.ts` (언어를 고르게 한다)

`--sketch`는 ¼해상 · 12fps · 앞 6초 타일. session-grade는 그대로 걸린다. `sketch-grid.ts`가 2–6개 타일을 한 화면으로 묶고 범례 텍스트를 쓴다. Isaac은 knob이 아니라 **언어**를 고르고, 그 뒤에만 1632 프리뷰를 쓴다.

```bash
cp scene-<tile>.json scene.json
npx tsx scripts/export-layered.ts --title <slug>-<tile> --work-dir out/manual-runs/<slug> --sketch
npx tsx scripts/sketch-grid.ts --out out/manual-runs/<slug>/sketch-grid.mp4 \
  "A L1+L2 counterflow=out/layered/.../<slug>-a-sketch.mp4" \
  "B L1+L5 texture=out/layered/.../<slug>-b-sketch.mp4"
```

- **근거**: r346은 프리뷰를 11번 태우고도 "다 맘에 안들어". 힐클라임 대신 발산→수렴.
- **파일**: `scripts/export-layered.ts` · `scripts/sketch-grid.ts` (신규)
- **검증**: 합성 타일 3개 → 1224×728 그리드 + 범례 정상. `drawtext` 미사용(폰트 경로 취약)이라 라벨은 범례 파일에.

### T2 — `isaac-pick.ts` (발화 원문이 풀렌더 허가)

게이트 JSON 손편집 폐지. Isaac 발화를 원문 그대로 받아 `psychedelic-gate.json`에 `humanOverride`를 쓰고, `isaac-pick.json`에 발화·시각·씬 sha·프리뷰·오디오를 남긴다. 씬 sha가 다른 기존 게이트는 버리고 새 스텁을 만든다. 오디오는 `@m:ss`가 없으면 거부한다.

```bash
npx tsx scripts/isaac-pick.ts --work-dir out/manual-runs/<slug> \
  --quote "이게 젤 나아 풀버전으로" --audio "Mama India @6:27"
```

- **근거**: 최근 최종 6건 중 5건이 손편집 override. 게이트 PASS가 Isaac 승인을 예측한 적 없음(§1.1). 오디오 시작점 추측은 운영 버그(R-059).
- **파일**: `scripts/isaac-pick.ts` · `scripts/lib/isaac-pick.ts` · 테스트
- **검증**: 격리 임시 리포에서 실행 — 잘못된 오디오 거부, PASS 게이트 보존, 다른 sha 게이트 폐기, 빈 발화 거부. `psychedelic-final-guard.ts`는 무변경.

### T3 — `close-lock.ts` (락팩이 기본 동작)

02 §4.2의 E–H를 코드로. 소스·씬·게이트를 복사하고 sha를 계산해 manifest를 upsert하고 `git add` 목록을 출력한다. 커밋은 하지 않는다. 게이트 허가 없음 · 씬 sha 불일치 · 안전하지 않은 플레이트 명령 · 다른 픽셀로 같은 파일명 재사용을 거부한다.

```bash
npx tsx scripts/close-lock.ts --slug <slug> --audio "Adhana @5:06" \
  [--plates "node scripts/locks/<x>.mjs"] [--final <final.mp4>]
npx tsx scripts/rebuild-closed-lock.ts --slug <slug>   # 재현 검증
```

- **근거**: 최종의 정의가 "폴더에 mp4 있음"이었음. r343–r346이 그 상태.
- **파일**: `scripts/close-lock.ts` · `scripts/lib/close-lock.ts` · 테스트
- **검증**: 임시 리포에서 pick → close-lock → rebuild sha 검증까지 통과. 생성된 `scaffold`/`exportFull` 문자열이 02 §3 형식과 일치함을 테스트로 고정.

---

## 5. 변경 B — 발견한 버그

### B1 — session-plates 홀드 알파가 3배 stride로 어긋나 있었음

`blurAlpha()`가 sharp의 블러 결과를 1채널로 인덱싱했는데, **sharp는 1채널 raw 입력에 3채널을 반환**한다(64×64 입력에 12288바이트 실측). 그래서 생성된 모든 `figure-hold.png`의 알파가 계산된 마스크와 다른 픽셀에서 왔다. PNG는 그럴듯해 보여서 조용히 지나갔고, wall 스캔도 어긋난 마스크를 검사하고 있었다.

커밋 `757aff5`부터 존재. r325와 r342는 락 플레이트 스크립트를 쓰므로 **기존 제품은 무영향**이고, r343–r346은 `form` 히어로라 플레이트를 안 쓴다. 영향 범위는 앞으로의 halo/pour/beam 신규 소스였다.

- **발견**: E3 수정이 효과가 없어서 추적. 히어로 중심을 0으로 만들었는데 알파가 0.97로 읽힘.
- **수정**: `resolveWithObject`로 `info.channels`를 받아 stride 적용.
- **파일**: `scripts/lib/session-plates.ts`
- **검증**: 회귀 테스트 — `figure-hold` 알파와 `debug-hold` 그레이가 1 이내로 일치, 히어로 알파 ≤ 0.28.
- **비고**: 이 사실은 Isaac의 기존 메모리("sharp `.blur()`가 1ch raw를 3ch로 반환")에 이미 기록돼 있었으나 이 파일에 적용되지 않았음.

---

## 6. 새 루프

상태마다 명령 하나, 출구 하나 (상세: `00-INDEX.md` §2).

```
INTAKE → PREPARE → SKETCH → PICK-LANGUAGE → PREVIEW → QUOTE ─┬─ DELTA ──────┐
                                                             ├─ NEW-LANGUAGE┤→ PREVIEW (총 ≤3)
                                                             └─ STOP (같은 클래스 2미스 → Isaac에게)
PICK → FULL → AUDIO (트랙+시작점 있을 때만) → CLOSE (락팩, 기본)
```

| # | 상태 | 명령 | 결정 |
|---|------|------|------|
| 1 | INTAKE | `analyze-source.ts` | 에이전트 |
| 2 | PREPARE | `prepare-new-source.ts` (+`--hero`) | 스크립트 |
| 3 | SKETCH | `export-layered --sketch` → `sketch-grid.ts` | 에이전트가 굽고 |
| 4 | PICK-LANGUAGE | — | **Isaac이 타일 선택** |
| 5 | PREVIEW | `export-layered --preview` → stills → `qa-motion.ts` | 에이전트 |
| 6 | QUOTE | 00 §4 사전으로 해석 | **Isaac 발화가 법** |
| 7 | PICK | `isaac-pick.ts --quote "<원문>"` | **Isaac** |
| 8 | FULL | `export-layered --full-res --gate-report …` | 스크립트 |
| 9 | AUDIO | `01` §7.3 먹스, `-ss`는 Isaac이 준 값 | **Isaac** |
| 10 | CLOSE | `close-lock.ts` | 스크립트 |

**천장 계약**(프리뷰 제출 전 자가검사, 00 §3.2)

1. 지역 3–5개 선언 (hero / figure / field / ground / sky)
2. **언어 0개인 지역 금지**
3. 히어로 언어 ≥2, 프레임 전체 언어 종류 ≥3
4. 스케일 macro / mid / micro 중 ≥2, **micro가 지배하면 안 됨**
5. 비가약 템포 ≥2 (예: 3 vs 5 cycles/20s)
6. 얼굴 코어는 L3 저강도 또는 L5만
7. 케이스 행에 `language-map:` 기재

이 조건이 있으면 "더 창의적으로"에 knob 델타로 답하는 것이 구조적으로 불가능해진다.

---

## 7. 참조해야 할 파일

### 문서 (잡별 읽기 순서)

| 파일 | 역할 | 언제 여나 |
|------|------|-----------|
| `docs/video-os/00-INDEX.md` | 유일 시작 페이지. 두 계약 · 루프 · 천장 · 발화 사전 · 금지 · 지식 수명 | 항상 |
| `docs/video-os/04-QUALITY-CONTRACT.md` | 바닥 상세. 히어로 트리, 홀드 법, 프리뷰 전 체크리스트 | 항상 |
| `docs/video-os/01-CREATE-OS.md` §3 | 소스 타입 트리(숫자 기준) → 골든 선택 | 새 소스 |
| `docs/video-os/01-CREATE-OS.md` §5 | KILLED AXES 17행 | 축 제안 전 |
| `docs/video-os/01-CREATE-OS.md` §9 | 케이스 원장. **전수 읽기 금지**, 인용된 슬러그만 | 해당 슬러그를 다룰 때 |
| `docs/video-os/02-REPRO-LOCKS.md` | 닫힌 락 재현 + 락팩 + 커밋 대상 | 다른 PC / 잠금 |
| `docs/video-os/03-INSTAGRAM-REELS.md` | 릴스 컷 로그 전용 (루프 룩 아님) | 릴스 편집만 |
| `docs/video-os/05-HALLUCINATION-METHOD.md` | 왜 이렇게 생겼는지의 증거 | 설계 의도를 물을 때 |
| `recipes/locks/manifest.json` | 닫힌 제품 색인. `plates` 건너뛰면 다른 영화 | 재현 |
| `recipes/golden/*.json` | 신규 소스 시작 템플릿 5종 | PREPARE |

읽기 예산: 새 소스 잡은 **00 → 04 → 01 §3**. 재현 잡은 **00 §6 → 02**. 두 잡을 섞지 않는다.

### 스크립트

| 스크립트 | 역할 | 상태 |
|---|---|---|
| `scripts/prepare-new-source.ts` | 신규 소스 명령의 기록. `--hero` 진입점 | 수정 |
| `scripts/lib/hero-detect.ts` | 히어로 계측 + `applyHeroOverride` | 수정 |
| `scripts/lib/session-grade.ts` | 바닥 강제. `hero.json`을 읽어 오버라이드 심판 | 수정 |
| `scripts/lib/session-plates.ts` | flow/phase/hold 플레이트 생성 | **버그 수정** |
| `scripts/lib/session-scene.ts` | 골든 씬 패치 + 홀드 레이어 기본값 | 수정 |
| `scripts/lib/hold-walls.ts` | 직사각 홀드 스캔 | 무변경 |
| `scripts/export-layered.ts` | `--sketch` / `--preview` / `--full-res` | 수정 |
| `scripts/sketch-grid.ts` | 언어 타일 → 한 그리드 + 범례 | **신규** |
| `scripts/isaac-pick.ts` | 발화 원문 = 풀렌더 허가 | **신규** |
| `scripts/close-lock.ts` | 락팩 생성 + manifest upsert | **신규** |
| `scripts/rebuild-closed-lock.ts` | 닫힌 제품 재현 | 무변경 |
| `scripts/lib/psychedelic-gate.ts` | 레퍼런스 모션 계약 — 이제 **진단 도구** | 무변경 |
| `scripts/lib/psychedelic-final-guard.ts` | 풀렌더 가드 (PASS 또는 override) | 무변경 |
| `scripts/lib/qa-motion-core.ts` | QA 지표 + `deadZone` | 수정 |

---

## 8. 검증 결과

실행한 것만 적는다.

```bash
npx vitest run scripts/lib/hero-detect.test.ts scripts/lib/hold-walls.test.ts \
  scripts/lib/session-scene.test.ts scripts/lib/session-grade.test.ts \
  scripts/lib/figure-vivid-legal.test.ts scripts/export-layered.test.ts \
  scripts/lib/isaac-pick.test.ts scripts/lib/close-lock.test.ts \
  scripts/lib/qa-motion-core.test.ts scripts/lib/psychedelic-final-guard.test.ts \
  scripts/lib/rebuild-closed-lock.test.ts
# Test Files 11 passed · Tests 78 passed
```

- **테스트 78건 통과** (11개 파일)
- **타입체크 깨끗** — 건드린 파일 전부. 리포에 원래 있던 다른 파일의 에러는 그대로 존재
- **prepare 스모크 3종** — r325(halo) · r342(pour) · r221+오버라이드(halo) 전부 `session-grade OK`
- **격리 리포 E2E** — `isaac-pick` → `close-lock` → `rebuild-closed-lock` sha 검증 통과. 거부 경로 4개 확인
- **sketch-grid** — 합성 타일 3개 → 1224×728 + 범례 파일
- **00 인용 검증** — 00이 언급한 스크립트 8개와 플래그 13개 전부 코드에 실재

**하지 않은 것**: 프리뷰 렌더, 풀렌더, 오디오 먹스, 커밋. 닫힌 락은 하나도 건드리지 않았다.

---

## 9. Isaac 판정 대기 3건

셋 다 아니오여도 나머지는 작동한다 (L1–L5 · L8 · L10만으로 천장 조건 충족 가능).

| ID | 언어 | 무엇 | 왜 판정이 필요한가 |
|----|------|------|--------------------|
| **L6** | 벡션 | `multipassFeedback.zoom` 1.003–1.010 + 미세 `camDrift`(정수 사이클) | R-060은 회전만 금지. 2026-07-03 기준의 "포탈 줌 흡인"과 같은 개념 |
| **L7** | 패턴 형성 | 휘도 전용 반응확산, 필드·그라운드 마스크 한정, 얼굴 제외 | 소스 휘도에서 파생되지만 창발 패턴 — R-038 "생성 노이즈" 경계 |
| **L9** | 지역 colorCycle | 피부·몸 제외 마스크(할로·필드·스카이)에 정수 cycle 12–20 | R-018은 *portrait body* 한정이었으므로 지역 단위 재진입 |

### 그 외 미완

- `microShare`와 `flowDirections` 지표 — 32×57 QA 그리드로는 계측 불가. 풀해상 프레임 경로 필요.
- `form` 히어로용 작곡 골든 — 실루엣 플레이트가 없어 시각 검증 없이 만들 수 없다고 판단해 보류. halo/pour/beam 소스에서는 E2의 홀드 기본값이 같은 역할을 한다.
- r343–r346 락팩 — 다음에 그 슬러그를 건드릴 때 `close-lock.ts`로 닫을 것.

---

## 10. 추가 (2026-09-03) — 천장을 코드로 옮김

v2 출하 다음 날 Isaac: "결과물이 달라진게 없는데?" 측정 결과 맞았다.

| 런 | 실체 | 골든에 없는 언어 |
|---|---|---:|
| r349 | 골든 r221과 **82키 0차이** | 0 |
| r351 v1 | r346 v11 클론 (SSIM 0.980) | — |
| r351 v2 | 실제 합성 (SSIM 0.548 vs 클론) | 6 |

**원인 두 가지, 둘 다 v2의 설계 결함.**
1. 바닥은 코드(`session-grade`가 거부), 천장은 문서(00 §1 "Enforced by: agent self-check"). 부탁은 강제가 아니다.
2. 천장이 언어 **이름**을 셌다. 골든 r221에 `glowWave2 0.06`·`breath 0.003`이 이미 있어 "언어 3종 이상"을 골든 무수정이 그대로 만족했다.

**고친 것 (브랜치 `feat/ceiling-enforced`).**

| # | 변경 | 파일 |
|---|---|---|
| C1 | `measureLanguages` — 임계값 이상의 **셰이더 활성화**만 언어로 셈. L3는 baseline으로 절대 안 셈. 골든 기본값은 임계값 미달 → 골든 무수정 = composed 0 | `scripts/lib/language-map.ts` |
| C2 | `composeLanguageMap` — layer 0에 L4(glowWave 0.40/3 : 0.26/5 + phaseWarp 0.12) + L8(dissolve 0.42/22px · spectral 0.48/16px · chromaFlow 0.5/6px) + L10(breath 0.032×2). prism·colorCycle·플레이트 무변경. 값은 r351 v2(픽셀을 움직인 유일한 실측 씬)에서 | 같은 파일 |
| C3 | `gradeCeiling` — 골든과 키 동일 · 같은 소스 sha에서 다른 슬러그의 `scene*.json` 재생 · composed <3 · 히어로 레이어 <2 를 **거부**. Isaac waiver(`ceiling-waiver.json`, 씬 sha 바인딩)만 예외 | 같은 파일 |
| C4 | `prepare-new-source`가 기본 합성 + `language-map.json` 기록. `--compose off`는 `--ceiling-waive "<Isaac 원문>"` 필수 | `scripts/prepare-new-source.ts` |
| C5 | `session-grade`가 new-source마다 천장 실행 → export도 거부 | `scripts/lib/session-grade.ts` |
| C6 | `isaac-pick.ts --ceiling-waive` — 프리뷰 전용 waiver, 풀렌더 허가 아님 | `scripts/isaac-pick.ts` |
| C7 | **매크로 규칙** — composed ≥3만으로는 부족. L1·L2·L6·L9 중 하나가 없으면 거부("no macro language"). 컴포저 v1(L4+L8+L10 장식만)이 Isaac 눈에 "크게 달라진게 없다"였던 것의 코드화 | `scripts/lib/language-map.ts` |
| C8 | **컴포저 v2** — form/sheet 히어로에 L1 travel(스캐폴드 flow-field 44px, fieldAlign 1, forwardBias 0.35) + transport 30px · 전 씬에 prism `chromaCycles 3` · L4 glowWave 0.55/9 : 0.32/14 + phaseWarp 0.2 · L6 `cameraDrift` 0.01 + zoom 1.006 · L8 · L10. phaseFlowPx/surfaceCycles/colorCycle/플레이트 무변경 | 같은 파일 |
| C9 | **`macroMotion` 지표** — 32×57 그리드에서 0.2s 간격 |Δluma| 평균. WARN floor 0.025. 골든 0.013 · v1 0.015 · v2 0.035 · Isaac 최종 0.044. SSIM은 등고선 요동을 잡고, 이 지표는 Isaac이 보는 것을 잡는다 | `scripts/lib/qa-motion-core.ts` |

**컴포저 v1은 틀렸다.** r349 소스에 v1(L4+L8+L10)을 렌더해 골든 무수정과 비교하니 SSIM 0.654 — 숫자상 큰 차이였다. Isaac이 보고 "크게 달라진게 없는데"라 했고, 프레임을 나란히 놓고 보니 맞았다. 같은 프리즘 등고선 강이 제자리에서 요동하는 위에 미세 요동만 얹은 것이었다. 매크로 운동 에너지(저해상 0.2s 간격 |Δluma|, 0–255)로 다시 재면 골든 3.40 · v1 3.69 · Isaac이 "구려"라 한 r346 v6 5.56 · Isaac 최종 r346 v11 11.13. SSIM은 등고선 위치를, 이 지표는 프레임이 하는 일을 잰다.

**검증 (컴포저 v2).** 같은 r349 소스를 `--preview`(816×1456, 300f)로 렌더: 매크로 운동 **8.81** (골든 3.40 · v1 3.69 · Isaac 최종 11.13) · SSIM 0.548 · QA PASS (olive 0.069 · bleach 0.008 · seam 1.03 · motionDensity 0.459 · deadZone 0.001). 프레임: 눈·입술·알약 선명(뭉개짐 없음), 얼굴 색조가 20초에 걸쳐 쓸려가고, 빛 밴드가 지나가고, 프레임이 천천히 표류. **Isaac에게 플래그:** `chromaCycles 3`이 사진 얼굴의 피부 색조까지 흔든다 — r346 v11에서는 실루엣+링에 걸렸던 값. R-001 리페인트로 읽힐 수 있음. blind 튠 안 함. 프리뷰: `out/layered/2026-09-03_verify-r349-composed-v2-d42a9b84/verify-r349-composed-v2-preview.mp4`. 테스트 31건(천장 세트) 통과.

**바꾸지 않은 것.** L7·L9는 여전히 Isaac 결정이며 컴포저가 켜지 않는다. L6 벡션은 Isaac의 2026-07-03 기준이 명시한 항목이라 컴포저 기본값으로 올렸다 — 아니오면 `language-map.ts` 상수 하나. Isaac은 합성 룩을 아직 판정하지 않았다. 이 변경은 "다르게 움직이는 프리뷰가 존재함"을 보장할 뿐 "좋아함"을 보장하지 않는다.

### 10.1 두 번째 소스 (r352) + 자글자글 진단 — 2026-09-03 오후

Isaac: "v2가 훨씬 나아 그리고 다른 소스 써봐" → r352 engraved-buddha-hands(`busy-line`, busyness 0.116, 골든 r139)에 컴포저 v2 적용.

| 렌더 | 매크로 운동 | microShare | micro×macro | QA |
|---|---:|---:|---:|---|
| r352 (다른 에이전트 손합성) | 2.40 | 0.383 | 0.74 | PASS |
| **r352 컴포저 v2** | **9.91** | 0.309 | 2.05 | olive 0.058 FAIL · drift 0.184/0.384 FAIL |
| r346 v11 (Isaac 최종) | 11.13 | 0.240 | 1.20 | — |

`prepare` 출력 `languages layer0=[L1+L3+L4+L8+L10] composed=5`, session-grade OK. 프레임: 얼굴·손 각인선 선명, 주변 필드가 무지개로 흐르고 20초에 걸쳐 색이 쓸림.

**Isaac 지적: "자글자글 끓는 듯한 픽셀 모양의 거친 텍스쳐".** 눈이 아니라 숫자로 잡기 위해 `microShare`(408×728에서 인접프레임 |Δluma|의 최상위 옥타브 비율)를 라벨 케이스로 캘리브레이션:

| 케이스 | microShare | 매크로 | micro×macro | Isaac |
|---|---:|---:|---:|---|
| r346 v11 | 0.240 | 11.13 | 1.20 | 최종 |
| r346 v7 | 0.241 | 11.00 | 1.18 | HOLD |
| r344 v3 | 0.245 | 12.68 | 1.52 | 최종 |
| r346 v4 | 0.374 | 7.22 | 1.45 | **"노이즈 낀거같아"** |
| r346 v5 (디노이즈 시도) | 0.384 | 5.56 | 1.07 | 실패 |
| r345 v1 | 0.464 | 2.23 | 1.16 | 최종 |
| r343 r221 v1 | 0.416 | 2.71 | 0.78 | 최종 |
| r349 컴포저 v2 | 0.303 | 8.81 | 1.43 | 미판정 |
| **r352 컴포저 v2** | 0.309 | 9.91 | **2.05** | **"자글자글"** |

**읽는 법:** microShare 단독은 예측력이 없다(r345·r343 최종이 0.46/0.42). 절대 micro 에너지(microShare×매크로)도 아니다(r344 v3 1.52 최종 vs r346 v4 1.45 불만). Isaac 최종 3건의 micro는 1.18–1.52 대역에 있고 r352 v2는 **2.05로 그 위**. 즉 자글자글 판정선은 **micro 절대량 ≈1.6 부근**이며, 매크로가 크다고 면제되지 않는다.

**기계론 (가설, 검증 미완):** 소스 자체 텍스처 피치(각인 해칭 ~2–4px)와 같은 스케일에서 프레임마다 리샘플이 일어나면 해칭이 에일리어싱된다. 용의자 3개 — ① 프리즘 `surfaceCycles 22` × `phaseFlowPx 28`이 해칭 피치 근처에서 동작 ② `sourceChromaFlow` 6px/5cyc `detailGain 2`(국소 크로마 차 증폭) ③ `phaseWarpAmount 0.2`. 인과 분리용 프리뷰 3개를 렌더했으나 **계측 전 중단**:

- `out/layered/2026-09-03_probe-nol8-eb367e3a/probe-nol8-preview.mp4` — L8 전부 0 + phaseWarp 0
- `out/layered/2026-09-03_probe-coarseprism-5e50e667/probe-coarseprism-preview.mp4` — surface 22→8, phaseFlow 28→14
- `out/layered/2026-09-03_probe-both-68c29b0c/probe-both-preview.mp4` — 둘 다 + 스케일 인지 L8(파장 220px, edgePreserve 0.95, detailGain 1)

**다음 세션이 할 일:** 위 3개에 `microshare` + `macro-motion` 측정 → 지배 원인 확정 → 컴포저를 **소스 주파수 인지형**으로(analysis.json `M4.busyness` 0.116 / `M4.edgeDensity` 0.60을 읽어 프리즘·L8 변위 스케일을 해칭 피치 위로) → `microShare`를 qa-motion 행으로 승격. 미사용 셰이더 프리미티브 `sourceDetailResidualFlow`(`bandLimitPx` 24–96, `chromaOnly`)가 "굵은 것만 움직이고 가는 선은 그대로"의 정공법 후보 — 단 미검증이라 blind 채택 금지(R-013).

---

## 기록 위치

| 무엇 | 어디 |
|------|------|
| 케이스 행 | `docs/video-os/01-CREATE-OS.md` §9 `CASE-2026-09-02-OS-v2` · `CASE-2026-09-03-OS-v2.1` |
| 근거 문서 | `docs/video-os/05-HALLUCINATION-METHOD.md` |
| 스폰 브리프 (전달 완료) | `docs/video-os/SPAWN-OS-EVOLUTION.md` |
| 세션 메모리 | `project_hallucination_method_proposal.md` |

*2026-09-02 · 렌더 없음 · 오디오 없음 · 커밋 없음 · R-번호 R-064에서 동결.*
