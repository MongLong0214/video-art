# T4: 전체 SynthDef 이벤트 스케줄링

**PRD Ref**: PRD-audio-pipeline-fix > US-2
**Priority**: P0 (Blocker)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T1 (soft — fixture analysis.json 사용 시 병렬 가능)

---

## 1. Objective
render-analysis.ts에 누락된 SynthDef 이벤트 생성 코드를 추가하여, 섹션별 적합한 신스가 스케줄링되도록 한다.

## 2. Acceptance Criteria
- [ ] AC-2.1: drop → kick, bass/acid_bass, hat, supersaw, fm_lead(centroid>2500), clap 이벤트
- [ ] AC-2.2: build → riser, arp_pluck 이벤트
- [ ] AC-2.3: break → pad 이벤트
- [ ] AC-2.4: 30초 렌더 기준 이벤트 수 > 300개
- [ ] AC-2.5: pitch_contour 비어있을 때 bass fallback — 루트+5도 교대 패턴
- [ ] AC-2.6: layered_kick이 drop 섹션에서 4-on-the-floor 보강
- [ ] AC-2.7: squelch가 bass.flux > 0.3일 때 drop에서 간헐적 (매 2마디 1회)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `drop section has kick events` | Integration | dry-run score 파싱 | kick 이벤트 > 0 |
| 2 | `drop section has fm_lead when centroid > 2500` | Integration | centroid 3000 분석 | fm_lead 이벤트 > 0 |
| 3 | `drop section has clap events` | Integration | dry-run | clap 이벤트 > 0 |
| 4 | `build section has riser events` | Integration | dry-run | riser 이벤트 > 0 |
| 5 | `build section has arp_pluck events` | Integration | dry-run | arp_pluck 이벤트 > 0 |
| 6 | `break section has pad events` | Integration | dry-run | pad 이벤트 > 0 |
| 7 | `total events > 300 for 30s render` | Integration | dry-run 이벤트 카운트 | > 300 |
| 8 | `bass fallback uses root + fifth alternation` | Unit | pitchInWindow empty | freq 패턴에 root와 root*1.5 교대 |
| 9 | `layered_kick in drop section` | Integration | dry-run | layered_kick 이벤트 > 0 |
| 10 | `squelch in drop when bass flux > 0.3` | Integration | flux=0.5 분석 | squelch 이벤트 > 0 |

### 3.2 Test File Location
- `scripts/lib/render-dryrun-e2e.test.ts` (기존 파일 수정 — 이미 dry-run 테스트 존재)

### 3.3 Mock/Setup Required
- 합성 analysis.json 픽스처 (정규화된 구조, 다양한 centroid/flux 값)
- `--dry-run` 모드로 render-analysis.ts 실행 후 score 파싱

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/render-analysis.ts` | Modify | 이벤트 생성 코드 추가 (6개 SynthDef) |
| `scripts/lib/render-dryrun-e2e.test.ts` | Modify | 테스트 케이스 추가/수정 |

### 4.2 Implementation Steps (Green Phase)

**4.2.0 CRITICAL: synth-only 경로 리팩토링**
- 현재 이벤트 생성 코드가 `if (manifestPath)` 블록(line 329) 안에 갇혀있음
- synth-only 모드(`--mode synth`, manifest 없음)에서는 이벤트 0개가 됨
- **해결**: 새 SynthDef 이벤트 생성 코드를 `if (manifestPath)` 블록 바깥, `// === Sort + end marker ===` 블록 앞에 배치
- kick/hat은 manifest 있을 때 sample_player, 없을 때 synthesis SynthDef 사용
- bass/pad/supersaw는 manifest 유무와 무관하게 항상 생성

**4.2.1 riser 이벤트 (build 섹션)**
- build 섹션 시작부터 끝까지 매 4마디마다 1개
- freq: root * 4, sweepRange/noiseAmount은 preset에서
- amp: 0.5 * energy * sectionScale

**4.2.2 arp_pluck 이벤트 (build 섹션)**
- 16분음표 그리드, build 섹션 내
- freq: 스케일 노트 순환 (옥타브 * 4)
- amp: 0.25 * energy * sectionScale

**4.2.3 fm_lead 이벤트 (drop, centroid > 2500)**
- 매 2마디 시작, 반마디 지속
- freq: 스케일 3도/5도 교대
- amp: 0.3 * energy * sectionScale

**4.2.4 clap 이벤트 (drop/build)**
- 비트 2, 4에 배치 (backbeat)
- amp: 0.35 * energy * sectionScale

**4.2.5 layered_kick (drop)**
- kick과 동일 타이밍, 낮은 amp (0.3)로 보강
- subDecay/bodyDecay/clickAmp은 preset에서

**4.2.6 squelch (drop, flux > 0.3)**
- 매 2마디 1회, 1박 지속
- freq: root, sweepStart/End은 preset에서

**4.2.7 bass fallback 수정**
- `if (step % 2 === 0) continue;` 제거 → 모든 8분음표 스텝에서 emit
- freq: `step % 2 === 0 ? rootFreq : rootFreq * 1.5` (루트/5도 교대)
- cutoff: 300 (기존 150에서 상향)

## 5. Edge Cases
- EC-1: 분석에 kick/hat positions 없음 → 4-on-the-floor 그리드 폴백
- EC-2: centroid <= 2500 → fm_lead 스킵 (AC-2.1 조건부)
- EC-3: bass.flux <= 0.3 → squelch 스킵 (AC-2.7 조건부)
