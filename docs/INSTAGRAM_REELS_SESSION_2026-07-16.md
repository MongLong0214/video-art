# Instagram Reels 작업 로그 — 2026-07-16

> **목적:** 이 세션(및 직전 연속 작업)에서 한 인스타 릴스 편집·파이프라인 실험을 **빠짐없이** 기록한다.  
> **정본 충돌 규칙:** 이미지→루프 *생성* 미학 = `OUTPUT_GAP_ANALYSIS.md`. 닫힌 프로덕트 재현 = `docs/REPRO_LOCKS_PLAYBOOK.md`.  
> **이 문서:** 인스타 *배포 컷 / 릴스 편집 실험* 전용 세션 로그 (MP4는 git에 넣지 않음).

---

## 0. 한 줄 요약

| 제품 | 상태 | Isaac 픽 |
|------|------|----------|
| **r274 dual-abstract beam-focus** | 20s 루프 **closed** (gate PASS + lock + Sapana @2:58) | 본편 확정 |
| **r274 릴스** (before→hard-cut→halluc + drop) | 실험 v1–v7 | 카메라 눈 팬 실패 다수; **v7 풀프레임 Ken Burns 눈 팬**이 기술적으로 맞음 |
| **r275 mushroom-crown** | 20s prism full + 별도 narration full | 본편 룩 OK, narration-final 보류 호평 |
| **r275 릴스** | 실험 v1–v14 | **최종 선택: `r275-mushroom-crown-reel-v10-matchcut.mp4`** |

---

## 1. 절대 경로 / 디렉터리 맵

```
out/instagram/                          # 릴스 최종·중간 MP4 (git 금지)
out/instagram/v2…v7/                    # r274 세그먼트 작업 폴더
out/instagram/r275/                     # r275 세그먼트·오디오 중간물
out/instagram/r274-reel-before-drop-v*.mp4
out/instagram/r275-mushroom-crown-reel-v*.mp4

out/layered/…r274…-54cff7f8/            # r274 full + with-sapana
out/layered/…r275-mushroom-crown-prism-final-ab46062f/
out/layered/…r275-mushroom-crown-narration-final-282a9cd4/   # Isaac “오 이거 좋다 일단 보류”
out/layered/…r275-mushroom-crown-narration-drip-final-d6f32be8/

out/manual-runs/r274-dual-abstract-a-beam-focus/
out/manual-runs/r275-mushroom-crown-prism/
out/manual-runs/r275-mushroom-crown-narration/

sources/approved/r274-dual-abstract-beam.png
sources/incoming/r275-mushroom-crown*.png   # 첨부→업스케일 작업본 (approved 아님)

# 오디오 (로컬 Downloads, 레포 밖)
/Users/isaac/Downloads/Astrix - Sapana (Album Version).wav
/Users/isaac/Downloads/Psysex - L.S.Dance (LOUD Remix).wav
```

**Hard ban (Agents.md):** MP4 / `out/**` / regenerated layers **커밋 금지**. 로그·레시피·approved 소스만 git.

---

## 2. r274 — 닫힌 본편 (릴스 재료)

| 항목 | 값 |
|------|-----|
| Slug | `r274-dual-abstract-a-beam-focus` |
| Source | `sources/approved/r274-dual-abstract-beam.png` 1632×2912 |
| 타입 | figure-vivid / 실루엣 + third-eye beam |
| Recipe | extreme prism + **godRays@eye** + bloom threshold + colorMotionMask lum/sat (R-057) |
| Full | `out/layered/2026-07-16_r274-dual-abstract-a-beam-focus-final-54cff7f8/r274-dual-abstract-a-beam-focus-final.mp4` |
| +Audio | `…-final-with-sapana.mp4` — **Astrix Sapana @ 2:58 (t=178s)** |
| Gate | PASS cohere≈0.816 |
| Git | locks + source + CASE (commit 계열 `5f2693a` 등) |

Isaac: 본편 맘에 듦 → 인스타 노출 포맷 실험으로 이어짐.

---

## 3. r274 릴스 실험 (before → hard cut → halluc + drop)

### 3.1 공통 의도

- **포맷:** 정지/느린 “before” → **하드컷** → 본편 모션 + 드롭 사운드  
- **초반 의도:** Ken Burns / pan-to-**third-eye** (0.42, 0.33 근사)  
- **오디오:** Sapana, 컷에 드롭 정렬 (audio start ≈ 178 − open_dur)

### 3.2 버전 테이블

| Ver | 파일 | 대략 길이 | 핵심 변경 | Isaac/교훈 |
|-----|------|-----------|-----------|------------|
| v1 | `r274-reel-before-drop-v1.mp4` | ~10s | 최초 before/after concat | 기본 형태 |
| v2 | `…-v2.mp4` | ~12s | flash 등 장식 시도 | 과한 장식 경계 |
| v3 | `…-v3.mp4` | ~11s | pro before | — |
| v4 | `…-v4.mp4` | ~11s | poster + Ken Burns + match | push-in 어색 |
| v5 | `…-v5.mp4` | ~11s | look-at eye 시도 | **눈 팬 체감 약함** |
| v6 | `…-v6.mp4` | ~11s | 공격적 lower→eye (z 1.05→1.45) | 여전히 약함; 시작이 거의 풀샷 |
| **v7** | `…-v7.mp4` | **11.2s** | **진짜 look-at:** start (0.50,0.82) z1.55 → end (0.42,0.33) z2.60; 2.0s open; Sapana drop@2s | **눈 팬 궤적 성립** (start=아래 인물, end=눈 CU). zoompan 쉼표 이스케이프/`s=1632x2912` 필수 (안 하면 1280×720 가로 버그) |

### 3.3 v7 기술 디테일 (재현용)

```
# Open Ken Burns (portrait, look-at lerp) — commas in max/min must be escaped if used
z: 1.55 → 2.60 over 60 frames @30fps (2.0s)
look: (0.50, 0.82) → (0.42, 0.33)
output: 1632×2912

# After segments (from r274 full)
after-eye  ~3.2s  crop ~2.2× on eye
after-tight ~3.0s crop ~1.55×
after-wide  ~3.0s full

# Audio
Sapana WAV, adelay 2000ms so drop hits hard cut
# OR: -ss (178 - open) then map
```

### 3.4 r274 릴스 교훈

1. **“팬 투 아이”는 z 1.0→1.4 센터 줌이 아님.** start에서 눈이 프레임 밖/가장자리, end에서 눈 CU.  
2. **눈 좌표 실측:** 대략 **(0.42, 0.33)** (핑크 림/홍채; 빔 원점 착시 주의).  
3. **ffmpeg zoompan** 필터 파라미터 쉼표 → `\,` 또는 max/min 없이 클램프. 기본 s=1280x720 주의.  
4. Isaac 거부: 아마추어 push-in/hold, 가짜 팬, (일부 버전) 눈 타이트 크롭 과다.

---

## 4. r275 — mushroom crown (신규 소스 + 이중 렌더)

### 4.1 소스

| 항목 | 값 |
|------|-----|
| 첨부 | 세션 에셋 JPG (압축 1121×2000) |
| 작업 PNG | `sources/incoming/r275-mushroom-crown.png` → `…-1632.png` (lanczos 1632×2912) |
| 비주얼 | 측면 인물 + 왕관 광점 + 손 위 빨간 버섯, dense psychedelic texture |
| 타입 | dense-pattern / finished vivid (woodblock 계열 1차) |
| approved? | **아니오** (아직 `sources/approved` 미등록; 세션 실험) |

### 4.2 본편 (drop / “완성본 느낌”)

| 항목 | 값 |
|------|-----|
| Work-dir | `out/manual-runs/r275-mushroom-crown-prism/` |
| Base recipe | `recipes/golden/woodblock-phase-advect-r139.json` + 왕관 튜닝 |
| 튜닝 | sourcePrism phaseFlow≈32, surface≈30, detailBoost↑; **godRays center (0.48,0.28)**; bloom; colorMotionMask; clamp maxDrift≈0.24 |
| Preview | `…/r275-mushroom-crown-prism-124ed072/…-preview.mp4` |
| Gate | PASS (axis `crown-godrays` / primitive `woodblock-rays-v1`) cohere≈0.83 |
| **Full** | `out/layered/2026-07-16_r275-mushroom-crown-prism-final-ab46062f/r275-mushroom-crown-prism-final.mp4` **20s 1632×2912** |
| +Sapana (실험 mux) | `…-final-with-sapana.mp4` (본편 전체 Sapana 178s부터) |

Isaac: **“완성본 느낌 좋아”** → 릴스 after/드롭 구간 재료.

### 4.3 나레이션 전용 렌더 (별도 scene)

의도: 드롭 전 “느린 자글” — 본편과 **다른 에너지**, 같은 소스.

| 패스 | 결과 | 비고 |
|------|------|------|
| mild phaseFlow↓ only | gate REJECT temporal-boiling (과도 약화 시 더 악화) | residual 모션 문제 |
| full@~45% energy (phaseFlow 13, surface 16, glow/rays↓) | **gate PASS** cohere≈0.848 | **채택** |
| **Full path** | `…/r275-mushroom-crown-narration-final-282a9cd4/r275-mushroom-crown-narration-final.mp4` | Isaac: **“오 이거 좋다 일단 보류”** |
| drip advection (sourceFlowAdvection+Transport, phase-vertical) | gate PASS, full `…-narration-drip-final-d6f32be8/…` | 흘러내림 실험; 최종 픽 아님 |

Work-dir (마지막 scene은 drip 쪽으로 덮였을 수 있음):  
`out/manual-runs/r275-mushroom-crown-narration/`  
- `gate-narration.json` PASS (slow-prism-v3)  
- `gate-drip.json` PASS (flow-advection-v1)

**중요:** 나레이션 full `282a9cd4` 은 Isaac 보류 호평본 — 삭제/덮어쓰기 금지 권장.

---

## 5. r275 릴스 버전 전체 (v1–v14)

### 5.1 오디오 재료: Psysex — L.S.Dance (LOUD Remix)

| 항목 | 값 |
|------|-----|
| 경로 | `/Users/isaac/Downloads/Psysex - L.S.Dance (LOUD Remix).wav` |
| 길이 | ~474.8s |
| 구조 | **0–1s 침묵/뮤트** → 나레이션 → **드롭 점프 ≈ 7.775s** (원본 타임라인, +19.7dB 실측) |
| 정책 | 오디오 **1.0s부터** 시작 (뮤트 스킵) |
| 나레이션 배속 | 실험: 2.0× → **1.5× 채택 구간** → open 3s용 2.26× 등 |
| 드롭 이후 | **항상 1.0×** (원곡 템포) |

**배속–길이 공식**

```
NARR_SRC_LEN = BANG_SRC - AUDIO_START   # 예: 7.78 - 1.0 = 6.78s
OPEN_VIDEO   = NARR_SRC_LEN / NARR_SPEED
# 1.5× → OPEN ≈ 4.52s
# 2.26× → OPEN = 3.00s
atempo: factor>2 이면 atempo=2.0,atempo=(s/2) 체인
```

### 5.2 버전 테이블 (상세)

| Ver | 파일 | 길이 | 구조 | 오디오 | Isaac 반응 / 판정 |
|-----|------|------|------|--------|-------------------|
| v1 | `…-v1.mp4` | 11.2s | 버섯→왕관 Ken Burns open 1.8–2s + eye/mid/wide crop after | (초기 Sapana 계열 시도 후 폐기) | 크롭/눈 집중 **거부** (“크롭해서 눈에 집중 하지마”) |
| v2 | `…-v2-lsdance.mp4` | ~21s | open 7.78s KB + after | L.S.Dance 0s부터 (뮤트 포함) | 나레이션 너무 김 |
| v3 | `…-v3-fullframe.mp4` | ~19.8s | **풀프레임 still** open + full after, no crop | L.S.Dance, drop@7.78 | 크롭 제거 |
| v4 | `…-v4.mp4` | ~17.9s | 본편 **슬로 2.8×** open + full after | narr 2× then drop 1× | “약하다” |
| v5 | `…-v5.mp4` | ~18.9s | 더 슬로 4.2× + 어둡게 open; after sat/contrast 펀치; impact 0.12s | narr duck + drop hot | 대비 강화 |
| v6 | `…-v6-dual.mp4` | ~17.9s | **A narration full** + **B prism full** concat | narr 2× duck, drop 1× | 이중 렌더 합본 |
| v7 | `…-v7-dual.mp4` | ~17.4s | 동일 dual | **audio start@1s**, narr 2× | 뮤트 스킵 |
| v8 | `…-v8-dual.mp4` | ~18.5s | 동일 dual | narr **1.5×**, start@1s, OPEN≈4.52 | 배속 완화 |
| v9 | `…-v9-drip.mp4` | ~18.5s | open = **drip narration** full | 1.5× | 흘러내림 실험 |
| **v10** | **`…-v10-matchcut.mp4`** | **~18.23s** | open=narration-final `282a9cd4` + short **0.28s xfade** to prism full (match 느낌) | 1.5×, start@1s, bang@~4.52 | **Isaac 최종 픽** “10번 버전으로 할게” / “내 기준 이게 가장 낫다” |
| v11 | `…-v11-seamless.mp4` | ~17.1–17.3s | **1.2–1.4s long dissolve** + color match | 1.5× | “디졸브/페이드인 안 됨, 빵 터져야” **거부** |
| v12 | `…-v12-hardbang.mp4` | ~18.5s | hard cut + match frame (open last=drop f0) | 1.5× hard concat | 위치 정렬 시도 (SAD 오프셋 0) |
| v13 | `…-v13-open3s.mp4` | ~16.7s | open **3.0s** (배속~2.26×) | bang@3s | 총길이 짧음 **거부** (“총 20초여야”) |
| v14 | `…-v14-20s.mp4` | **20.0s** | open 3s + after 확장 | bang@3s | 20s 맞춤; 픽은 여전히 v10 |

### 5.3 v10 (Isaac 픽) 재현 스펙

```
NARR = out/layered/2026-07-16_r275-mushroom-crown-narration-final-282a9cd4/r275-mushroom-crown-narration-final.mp4
DROP = out/layered/2026-07-16_r275-mushroom-crown-prism-final-ab46062f/r275-mushroom-crown-prism-final.mp4
AUDIO = /Users/isaac/Downloads/Psysex - L.S.Dance (LOUD Remix).wav

AUDIO_START = 1.0
BANG_SRC    = 7.78
NARR_SPEED  = 1.5
OPEN        = (7.78-1.0)/1.5 ≈ 4.52 s
XFADE       = 0.28 s   # short match-style fade (not long dissolve)
OFFSET      = OPEN - XFADE ≈ 4.24
AFTER       ≈ 14 s     # total ≈ 18.23 (OPEN+AFTER-XFADE)

# Video
[narr] trim OPEN → [drop] trim AFTER+XFADE → xfade fade duration=XFADE offset=OFFSET
scale 1632×2912, 30fps, yuv420p

# Audio
[atrim 1:7.78] atempo=1.5 volume≈0.7  |  [atrim 7.78:] volume≈1.25 alimiter
concat → AAC 320k

# Output
out/instagram/r275-mushroom-crown-reel-v10-matchcut.mp4
```

**v10이 이긴 이유 (Isaac + 편집 판단):**  
- 긴 디졸브(v11)처럼 “페이드인”으로 안 죽음  
- 완전 하드(v12)보다 컷 순간 덜 거칠음  
- dual 렌더(A 느림 / B 풀 에너지) 대비가 살아 있음  
- 눈/왕관 타이트 크롭 없음 (풀프레임)

### 5.4 전환 실험에서 배운 것

| 요청 | 시도 | 결과 |
|------|------|------|
| 컷이 튀지 않게 | match frame (open last = drop f0) | 프레임 동일해도 **레시피 모션 차**로 체감 점프 가능 |
| 안 튀게 세세히 | 1.2–1.4s xfade + color eq | 부드러움↑ but **“빵” 상실** — Isaac 거부 |
| 갑자기 빵 | hard cut | 원함; 다만 인물 “왼쪽 점프” 체감 이슈 제기 |
| 인물 좌우 | SAD 정렬 | 전역 오프셋 **≈0** — 착시는 이중 이미지/에너지 차일 가능성 |

---

## 6. Isaac 의사결정 로그 (인스타 관련)

| 시점 | 발화/결정 | 반영 |
|------|-----------|------|
| r274 본편 | 맘에 듦 | lock + Sapana @2:58 |
| 인스타 | 노출 포맷 / 릴스 만들어 | r274 reel 시리즈 |
| 카메라 | “눈으로 안 가는데 이상해” | v7 look-at 재계산 |
| r275 첨부 | 릴스용 만들어 | prism pipeline |
| 크롭 | **눈/왕관 타이트 크롭 금지** | v3+ fullframe |
| 오디오 | L.S.Dance, 나레이션 후 빵 | 드롭@7.78 실측 |
| 뮤트 | 0–1s 뮤트 → **1s부터** | v7+ |
| 배속 | 2× 말고 **1.5×** | v8+ |
| 나레이션 렌더 | `narration-final-282a9cd4` **좋다 보류** | A-roll 고정 |
| 전환 | 디졸브 말고 **빵** | v11 폐기 |
| 총길이 | **20초** 요구 | v14; 단 최종 픽은 v10 |
| **최종 릴스** | **“그냥 10번 버전으로 할게”** | **`…-v10-matchcut.mp4`** |

---

## 7. 기술 체크리스트 (다음에 에이전트가 또 할 때)

1. **본편 20s** gate PASS 없이 full 금지 (export-layered `--gate-report`).  
2. 릴스는 `out/instagram/` — **git 커밋 금지**.  
3. zoompan 눈 팬: start look 강함 + end z≥2.2 + portrait s=WxH.  
4. L.S.Dance: `AUDIO_START=1.0`, `BANG≈7.78`, open = (bang−1)/speed.  
5. dual 렌더: A=slow narr recipe, B=full prism — **같은 소스, 다른 scene**.  
6. Isaac이 고른 MP4 파일명은 **덮어쓰지 말 것** (v10, narration-final-282a9cd4).  
7. “안 튀게” ≠ 무조건 long dissolve — 먼저 match cut / 짧은 xfade / 공간 정렬 순.  
8. 총길이 요청 시 **OPEN + AFTER (− xfade) = 목표** 공식 명시.

---

## 8. 미완 / 미커밋

- [ ] r275 source → `sources/approved` + lock pack (Isaac 본편 최종 확정 시)  
- [ ] r275 CASE를 OUTPUT_GAP_ANALYSIS에 요약 링크 (본 문서 참조)  
- [ ] v10 IG 업로드용 1080×1920 리인코드 (선택)  
- [ ] 인물 좌우 점프 체감 — 필요 시 feature 기반 warp (전역 SAD는 0)

---

## 9. 빠른 인덱스 — “지금 뭐 쓰면 됨?”

| 용도 | 파일 |
|------|------|
| **인스타 업로드 후보 (Isaac pick)** | `out/instagram/r275-mushroom-crown-reel-v10-matchcut.mp4` |
| r275 본편 20s | `…/r275-mushroom-crown-prism-final-ab46062f/…-final.mp4` |
| r275 나레이션 보류 호평 | `…/r275-mushroom-crown-narration-final-282a9cd4/…-final.mp4` |
| r274 본편+Sapana | `…/r274-…-54cff7f8/…-with-sapana.mp4` |
| r274 릴스 눈팬 기술 정점 | `out/instagram/r274-reel-before-drop-v7.mp4` |

---

*Logged: 2026-07-16. Session: Instagram reels + r274/r275 dual pipeline. Author: agent for Isaac.*
