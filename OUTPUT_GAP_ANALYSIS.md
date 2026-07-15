# Masterpiece Pipeline — Operating Knowledge Base

> **정본 운영층.** 렌더 전·후 이 문서만으로 “지금 뭘 할까 / 왜 실패했나 / 다음에 뭘 남길까”를 결정한다.
> 이론·엔진 해부 상세가 필요하면 코드와 git 이력으로 내려간다. **케이스 없이 규칙 없고, 규칙 없이 결정 시스템 갱신 없다.**

---

## 0. 30초 사용법

| 시점 | 행동 |
|------|------|
| 소스 수령 | §2 분류 → §2 시작 레시피 |
| 렌더 전 | §4 KILLED 확인 · §7 큐 우선순위 · 프리뷰 먼저 |
| 렌더 후 | §5 QA + 제1문 · §3 케이스 1건 필수 기록 |
| 패턴 출현 | §1 규칙 승격/강등 · §2 반영 |
| 2연속 미스 | 튜닝 중단 · 재분류 or Isaac (R-013) |
| 동일 소스 6라운드 / 보류 2연속 | 최선 2종 A/B 배달 (R-021) |
| Isaac 피드백 | §8 플레이북 (기록→크롭3종→단일변수) |
| 최종 후보 | 최종 MP4 재계측 + 동일시점 크롭 · **명시 승인 전 오디오 금지** (R-043) |

**역할:** 구현=Codex / 판정·기록=오케스트레이터 / 최종 미학=Isaac.

---

## 1. 자가개선 폐회로

```
소스 → 분류(§2) → 가설 → 레시피 → 렌더(프리뷰→풀)
  ↑                                              ↓
결정시스템 갱신 ← 규칙 증류(§1) ← 케이스 기록(§3) ← 판정(§5+제1문)
```

| 규칙 계층 | 승격 | 강등 |
|-----------|------|------|
| **[P] Provisional** | 케이스 1건 | 반례 1건 → 재검토 |
| **[E] Established** | 이질 케이스 ≥3 + 반례 0 | 반례 1 → [P] |
| **[L] Law** | Isaac 확정 or 승인작 뒷받침 | Isaac 번복만 |

### 1.1 기계 차단 루프 (코드)

| 단계 | 명령/모듈 | 차단 조건 |
|------|-----------|-----------|
| 다음 실험 계획 | `npm run plan:psychedelic` | 실패 family 재선택 금지 |
| region-affinity 권한 | `npm run audit:region-affinity` + `export --authority-report` | affinity 연결 성분 부족 시 **preview 차단** |
| 후보 품질 | `npm run gate:psychedelic` | coverage/connected/coherence/edge/drift |
| 풀렌더 | `export:layered --gate-report` | PASS 또는 Isaac `humanOverride` + scene SHA 일치 |
| 학습 레저 | `out/psychedelic-learning-ledger.jsonl` | gate 결과 append-only |

**H80 수정 (2026-07-15):** `canCarryConnectedTransport`는 binary median mask가 아니라 **셰이더가 받는 smooth affinity field** (`affinityActiveCoverage` / `affinityConnectedCoverage`)로 판정한다.  
**r209 재발 방지:** 실패 축 `source-region-affinity / region-affinity-coordinate-transport`는 family `region-affinity-permission-failure`로 블록되고, planner는 `region-affinity-permission-audit` diagnostic만 낸다.

---

## 2. 결정 시스템

### 2.1 공통 원리 (타입 무관)

1. **최종 후보는 전면이 살아 움직여야 한다.** 보존은 결함 수정의 수단이지 목표가 아니다 (R-037).
2. **모션 = 소스 in-place 변형** (R-038). 고정 원본 + 오버레이/외래 레이어/액체 flow 덮개 = 거부.
3. **가드 PASS ≠ 성공** (R-020). 성공 = “3초 응시=환각” + 소스보다 아름다움 (R-002).
4. **만능 레시피 없음** (R-003). 소스 적합성 8할.

### 2.2 소스 분류 → 시작 레시피

| 타입 | 시작 | 핵심 | 금지 |
|------|------|------|------|
| 올오버 비비드 흐름 | 단일레이어 vivid OKLCH | cycle 12–14, satBoost 1.5–1.7, hueKey≤0.5, palette≤0.15, satInj 0, bloom thr≥0.55, warp≤0.03 | 과다 palette, satInj>0 |
| 고밀도 figure+전면 패턴 | r65/r221 계열 in-place | 정수 cycle, OKLCH, palette 0, noise 0, greenCompress≥0.88; 또는 sourcePrism phase advection | screen identity 과다, 비정수 speed |
| busy 고주파 라인 | sourcePrism phase advection (r139) | UV/휘도 고정, phase만 운반, phaseMix=0, phaseFlow∝texture폭 | phase cross-morph, 수치 맹목 복사 |
| 파스텔·greenRisk 하이브리드 | sat-gating / sourceColorClamp | palette 0, hueKey·lumKey 극저, clamp 0.12–0.18 | full-field hue (R-039) |
| figure/초상/신상 | **미해결·고난이도** | in-place만. peacock 1회 후 즉시 이탈 가능 | 대면적 body hue (R-018), overlay, liquid |
| 블랙 지배 | 제외 권장 | — | valueLift만으로 구원 불가 |

### 2.3 판정 게이트 (2단)

1. **가드:** QA (`qa-motion`) + 제1문 “소스보다 아름다운가”
2. **목표:** 운동밀도·최면성 (R-020). `lightMotion PASS` ≠ 목표 PASS (R-039)

**Isaac 탈락제 (한 항 위반=전체 거부):**  
살아있음 ∧ 쨍함 ∧ 질서(스페클/그린×) ∧ 피사체존엄 ∧ 위계 ∧ GLSL산출

---

## 3. 규칙 레지스트리

형식: `R-### | 계층 | 한 줄 | 근거`

| ID | 계층 | 규칙 |
|----|------|------|
| R-001 | [L] | **Animate, don't repaint** — 완성-비비드 색 정체성 파괴 금지 |
| R-002 | [L] | 판정 제1문: 소스 원본보다 아름다운가 |
| R-003 | [L] | 만능 레시피 없음. 소스 적합성 8할 |
| R-004 | [E] | 엔진 절대색 보존 불가 (colorCycle=0도 비선형 오프셋) |
| R-005 | [E] | 풀 colorCycle은 그린 대역 통과 (완전 제거 불가) |
| R-006 | [E] | 스페클 킬 = OKLCH + hueKey≤0.4 + lumKey≤0.2 + palette≈0 + noise 0 |
| R-007 | [E] | paletteSatFloor/satBlend는 중성에 채도 강제 주입 |
| R-008 | [E] | “화질 안좋음” = 해상도 vs 색노이즈 — 원인 분리 |
| R-009 | [E] | 파라미터↓인데 증상 동일 → 배선 사망 의심 (MD5/diff) |
| R-010 | [E] | 프리뷰로 색·모션, 풀해상도는 승인분만 |
| R-011 | [L] | 검증은 이질 소스 ≥2종. 벤치마크 과적합 금지 |
| R-012 | [E] | 모션 판정은 서브초 샘플 (t=6.0/6.15/6.3) |
| R-013 | [P] | 2연속 미스 → 중단. 3번째 블라인드 렌더 금지 |
| R-014 | [E] | 컬러풀 클럼프 가드: satInj 0, satBoost≤1.9, vignette 0 |
| R-015 | [E] | bloom thr≥0.55, feedback decay 0.82–0.86 (디스플레이 참조) |
| R-016 | [E] | feedback warp≥0.07 = 멜팅. ≤0.04 |
| R-017 | [E] | 모션 주 운반체 = 빛(휘도) 우선, hue 단독 의존 금지 |
| R-018 | [P] | 초상 대면적 colorCycle(저속도 포함) = 리페인트 |
| R-019 | [P] | flowField를 피부 glow phase로 쓰지 말 것 |
| R-020 | [L] | 가드 통과 ≠ 성공. 목표=3초 환각 밀도 |
| R-021 | [P] | 동일 소스 솔로 튜닝 ≤~6 프리뷰/세션 |
| R-022 | [P] | 미검증 노브는 단독 A/B 전 레시피 투입 금지 |
| R-023 | [E] | staticZone은 hue 전용. lightMotion은 보조일 뿐 |
| R-024 | [P] | 결함 피드백 = 원인 공간 분리 후 튜닝 (인코딩 vs 렌더) |
| R-025 | [P] | 패턴 엔진 긍정 시 보존축 도주 금지 — 결함만 국소 수정 |
| R-026 | [E] | source identity `screen` 과다 = 백화 |
| R-027 | [E] | colorCycle.speed = 정수 cycle only (루프 seam) |
| R-028 | [P] | hueJump WARN을 정적 덮개로 지우지 말 것 |
| R-029 | [L] | qa-motion PASS ≠ 국소 구조 품질 PASS |
| R-030 | [E] | noiseAmount 시간항은 루프 세이프 아님 → 최종 후보 noise 0 |
| R-031 | [P] | 중앙 hard lock은 보존 기준선이지 최종 아님 |
| R-032 | [L] | 원본 고정 + 오버레이 = 영상 아님 |
| R-033 | [L] | cosmos “보존+약한 휘도” = 방향 실패 |
| R-034 | [P] | r65 이식 QA clean ≠ 밝은 신상 목표 PASS |
| R-035 | 폐기 | optical liquid material — Isaac 거부. R-038 대체 |
| R-036 | [P] | lightMotion 기록 필수, 미학 대체 금지 |
| R-037 | [E] | 안전 보존 후퇴 = 3소스 0승. 전면 모션 유지 |
| R-038 | [L] | **In-place 변형이지 오버레이가 아니다** |
| R-039 | [P] | 단일 visible source + full-field hue ≠ 충분 (필터룩) |
| R-040 | [P] | sourceColorClamp + 강한 in-place 동시. 보존↔모션 동시 계측 |
| R-041 | [P] | temporalCoherence/coverage는 분류 지표, 자동 합격선 아님 |
| R-042 | [P] | sourcePrism = UV 고정 + invisible phase만 advection. phaseMix=0 |
| R-043 | [L] | 최종 승격 = 최종 MP4 재계측 + 크롭 + **명시 승인 전 오디오 금지** |
| R-044 | [P] | sourceColorDrift95 ≤0.18 AND LocalDrift95 ≤0.30 |
| R-045 | [P] | edgeDensity 높음 ≠ busy 라인. busyness·orientation 함께 |
| R-046 | [P] | 고주파 색 boiling ≠ 대규모 구조 운동 |
| R-047 | [P] | bounded curl/breath 추가 = 대규모 장면 운동 아님 |
| R-048 | [P] | sourceFlowAdvection 고정반경 = micro-shuffle. 진행파 진폭 필요 |
| R-049 | [P] | 레퍼런스 매칭 = 총 변화량이 아니라 시간 스펙트럼 |
| R-050 | [L] | noiseAmount=0만으로 source-only 증명 불가 (숨은 hash 감사) |
| R-051 | [P] | alpha 합=1 ≠ source-over 불투명. opaque base + AE=0 검증 |
| R-052 | [E] | **capacity/preview 권한 = renderer affinity field** (H80). binary mask 금지 |
| R-053 | [E] | 실패 family 재선택 금지. region-affinity 실패 후 diagnostic only |
| R-054 | [P] | eye-mirror 완성 figure: peacock 기본 1회 후 실패 시 phase-advection/in-place로 축 전환 |

---

## 4. KILLED AXES (재시도 금지)

| 죽은 축 | 근거 |
|---------|------|
| 오버레이/덮개 전반 | R-038 |
| optical liquid material | R-035 폐기 |
| 원본 고정 + peripheral overlay | R-032 |
| cosmos 보존형 휘도만 | R-033 |
| 초상 대면적 hue preserve | R-018 |
| hueJump를 정적 덮개로 제거 | R-028 |
| 비정수 colorCycle speed | R-027 |
| QA PASS = 성공 선언 | R-020, R-029 |
| greenRisk full-field hue | R-039 |
| uniform chromaOrbit | WB-114 |
| dual-profile r155–157 노브 재조합 | R-047 |
| r209 region-affinity amount/cycles 재튜닝 | R-053, CASE-r209 |
| r177/r178 portrait 색순환 이식 | 넓은 hue sheet |

**살아있는 방향:** 소스 in-place 전면 변형 · sourcePrism phase advection · 자기 요소 분해 후 각각 in-place.

---

## 5. 실패 모드 카탈로그

| # | 증상 | 검출 | 처방 |
|---|------|------|------|
| 1 | 타이다이 (구조 정지+색만) | staticZone, 육안 | phase/glowWave 구조 운동 |
| 2 | 머디 그린 | oliveDwell | OKLCH·greenCompress·좁은 호·회전 포기 |
| 3 | 데이글로 | 육안 bright | R-014, sat 예산 |
| 4 | 무지개 스페클 | 육안 | R-006 |
| 5 | strobe | lumFlicker, seam | godRays/aura 0, 워밍업 |
| 6 | 너무 정적 | 서브초+lightMotion | colorCycle≠0 또는 phase travel |
| 7 | 다 똑같음 | — | 축 극단화 + 서브초 |
| 8 | 멜팅 | 육안 | warp≤0.04 |
| 9 | 화질저하 | — | 풀해상도 / prores |
| 10 | 원본 색 이탈 | sourceColorDrift95/Local | clamp + in-place 유지 |
| 11 | 가짜 자글거림 | coherence↓, noise | source-derived phase, noise 0 |
| 12 | contour-lock / phase patch | 서브초 crop | phase advection, phaseMix=0 |

---

## 6. 케이스 레저 (append-only)

### 스키마
```
### CASE-YYYY-MM-DD-X | slug
- 소스 / 타입 / 가설 / 레시피
- QA / 육안 / 판정 / 근본원인 / 학습 / 규칙 / 상태
```

### 승인 아티팩트

| 소스 | 라운드 | 파일 | 오디오 |
|------|--------|------|--------|
| mushroom-hand | r65 | `out/layered/2026-07-08_r65-.../r65-...-final.mp4` | Ancient Aum |
| woodblock | r139 | `out/layered/2026-07-10_r139-.../r139-...-final.mp4` | Shaman Trance |
| **eye-mirror** | **r221** | `out/layered/2026-07-15_r221-eye-mirror-phase-advect-peak-final-ab325ea9/r221-eye-mirror-phase-advect-peak-final.mp4` | **Getting That Feeling** (0s) |

### 핵심 케이스 (압축)

| CASE | 결과 | 학습 |
|------|------|------|
| 07-07 A~E cosmos | peacock 실패 → OKLCH 저키 승리 부분 | R-006, R-004 |
| 07-08 eye-mirror r43–56 | preserve/prism 전부 목표 FAIL | figure 미해결, R-018–020 |
| 07-08 mushroom r57–65 | 패턴 유지+결함 국소 → **Isaac 승인** | R-025–028 |
| 07-08 cosmos r66–79 | lock/overlay/보존 전부 FAIL | R-029–033 |
| 07-09 ganesha U/V | r65 이식 정적, liquid 거부 | R-034–038 |
| 07-09–10 buddha/woodblock | sourcePrism 승인 r139 | R-041–044 |
| 07-13 dual-profile AD–AF | 3연속 boiling FAIL | R-045–047 |
| 07-13–14 underwater AG–AJ | transport 부분 성공, alpha 감사 | R-048–051 |
| 07-14–15 portrait r177–209 | 색 sheet / residual / affinity 실패 사다리 | R-052–053, H80 |
| **07-15 eye-mirror r210–222** | peacock FAIL → phase-advection **r221 승인** | R-054 |

### CASE-2026-07-15-EM | eye-mirror r210→r221

- **소스:** `9ed45c9b…PNG` 1632×2912 — 완성-비비드 figure/초상 (satMean 0.685, vivid 60%, figure 40%)
- **r210:** peacock-b-fast → 시안 리페인트, drift 0.37/0.61 **FAIL** (R-001/R-002/R-018)
- **r211–216:** colorCycle+prism/glow 혼성 — 환각 밀도↑, gate coherence/edge FAIL
- **r217:** 순수 sourcePrism phase advection — coh 0.836, 극한 등고선, drift FAIL
- **r221:** r217 밸런스 — QA PASS, coh 0.797, edge 0.842, Isaac **r221 선택**
- **풀렌더:** 1632×2912 30fps 20s H.264, QA final PASS
- **오디오:** `Jared Wilson - Getting That Feeling.wav` 0s–20s AAC stereo (Isaac 명시 요청)
- **규칙:** R-054 신설, R-038/R-042/R-043 확증
- **상태:** 최종 무음+오디오 합성 전달. 새 결함 전 재튜닝 금지

### CASE-2026-07-15-CL | closed-loop H80/H81 fix

- **문제:** planner `canCarryConnectedTransport=true`인데 실제 affinity field 연결 성분 부족 → r209 preview 허용
- **수정:** capacity=affinity field · region-affinity 실패 family 블록 · preview 전 authority audit 강제
- **검증:** unit tests 30+ pass (capacity/learning/audit/final-guard/export)
- **규칙:** R-052, R-053

---

## 7. 실험 큐 (우선순위 강제)

1. ~~eye-mirror r221~~ **닫힘** (승인+오디오)
2. **sourcePrism 이질 busy 소스 1종** 재현 (R-011) — woodblock 수치 복사 금지
3. **cosmos-B 블랙홀** in-place 국소 수정 only (§8, R-038) — lock/overlay 금지
4. **lightMotion 임계 캘리브레이션** (승인/거부 세트)
5. **colorCycleDesync 단독 A/B** (미검증 재투입 금지)
6. **레저 백필** r25–r42 압축 (선택)
7. figure/신상 클래스: Isaac 방향 (in-place 신기법 vs 스위트스폿 집중)

**diagnostic only (렌더 금지):** region-affinity 재튜닝 · r209 amount/cycles

---

## 8. 결함 피드백 플레이북

0. 케이스 상태 갱신 (튜닝 금지)  
1. 환경: codex/렌더 충돌 확인  
2. ffprobe 배달본 vs 원본렌더  
3. **크롭 3종** (소스/원본렌더/배달본) — 인코딩 vs 렌더  
4. 단일 변수 프리뷰 A/B  
5. 재배달 + 케이스 + 규칙 + 큐 소멸  

---

## 9. 노브 안전 요약

| 노브 | 안전 | 실패 |
|------|------|------|
| colorCycle.speed | 비비드 12–21 정수 | 0=정적; 비정수=seam |
| hueSpace | oklch (컬러풀/busy) | HSV 중성 물듦 |
| hueKey / lumKey | busy ≤0.4/0.2 | 스페클 |
| paletteAmount | 완성 ≤0.15, 보존 0 | 리페인트 |
| satInjectionMul | 컬러풀 0 | 클럼프 |
| feedback.warp/decay | ≤0.04 / 0.82–0.86 | 멜팅 / 표백 |
| bloom.threshold | ≥0.55 | 전면 백화 |
| noiseAmount | 최종 0 | seam |
| sourcePrism | phaseMix=0, flow∝폭 | contour-lock, patch |
| sourceColorClamp | figure 0.12–0.26 | 과낮=죽음, 과높=훼손 |
| sourceRegionAffinity | **authority audit PASS 전 preview 금지** | r209 권한 붕괴 |

---

## 10. 엔진 불변식 (압축)

1. 모션 프리미티브 간극: 전역 색 순환 ≠ 구조를 따라 여행하는 빛/위상  
2. 완성-비비드 기본 경로: 보존 + 구조 위상 운동 (리페인트 금지)  
3. 위상장·OKLCH·정수 루프·디스플레이 참조 색공간  
4. 소스 불가지론: M 벡터 측정 → 유도 (특정 소스 레시피 고착 금지)  
5. 다중 레이어 허용 조건 = 소스 **자기 요소** 분해 후 각각 in-place (외래 덮개 아님)

---

## 11. 구현 상태 (핸드오프)

| 구성요소 | 상태 |
|----------|------|
| measure→derive→render→QA (`master-pipeline`) | ✅ |
| phase fields / optical masks / preview export | ✅ |
| qa-motion + lightMotion + source drift | ✅ |
| gate:psychedelic + learning ledger + planner | ✅ |
| final-guard (PASS or Isaac humanOverride) | ✅ |
| region-affinity authority audit + export 차단 | ✅ (2026-07-15) |
| capacity = affinity field (H80) | ✅ |
| region-affinity family block after fail | ✅ |

**코드 진입점**

```text
npm run gate:psychedelic -- --candidate <mp4> --source <png> --reference <r1> --reference <r2> --work-dir <dir> --axis <a> --primitive <p>
npm run plan:psychedelic -- --source <png> --report <gate.json> [--output plan.json]
npm run audit:region-affinity -- --source <png> --scene <scene.json> --work-dir <dir> --output <audit.json>
npx tsx scripts/export-layered.ts --work-dir <dir> --preview [--authority-report <audit.json>]
npx tsx scripts/export-layered.ts --work-dir <dir> --full-res --gate-report <pass-or-override.json>
```

---

## 12. 최신 승인 체크리스트 (eye-mirror r221)

- [x] 단일 visible source, in-place, sourcePrism phase advection  
- [x] 프리뷰 육안 선택 (r217 vs r221 → **221**)  
- [x] 풀렌더 1632×2912 30fps 20s QA PASS  
- [x] 오디오: Getting That Feeling @0s, video copy, AAC  
- [x] 경로:
  - 무음: `out/layered/2026-07-15_r221-eye-mirror-phase-advect-peak-final-ab325ea9/r221-eye-mirror-phase-advect-peak-final.mp4`
  - 합성: `.../r221-eye-mirror-phase-advect-peak-final-with-getting-that-feeling.mp4`

---

*문서 버전: 2026-07-15 enterprise refactor. 구 PART A–K 서사/중복 이론 제거. 운영에 필요한 규칙·케이스·차단기·큐만 유지.*
