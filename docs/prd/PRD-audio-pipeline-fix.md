# PRD: Audio Synthesis Pipeline Production Fix

**Version**: 0.2
**Author**: Isaac (via Claude)
**Date**: 2026-03-31
**Status**: Draft
**Size**: L

---

## 1. Problem Statement

### 1.1 Background
`render-analysis.ts` 파이프라인은 오디오 분석 결과(analysis.json)를 기반으로 SuperCollider NRT 렌더링을 수행하여 합성 오디오를 생성한다. 현재 파이프라인에 7개 결함이 있어 출력 품질이 프로덕션 수준에 미달한다.

### 1.2 Problem Definition
렌더링된 합성 오디오가 사실상 무음에 가깝다. 16개 SynthDef 중 5개만 이벤트가 생성되고, 구조 감지가 깨져 99.9%가 "outro"로 분류되어 앰프가 절반으로 감소하며, 마스터링 EQ가 원본 트랙 스펙트럼을 합성 출력에 잘못 적용한다.

### 1.3 Impact of Not Solving
오디오 파이프라인이 사용 불가. 분석→합성→마스터링 전 과정이 프로덕션에 투입할 수 없는 상태.

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: 구조 감지가 트랙 전체를 의미있는 섹션으로 분할 (최소 4개 섹션, 각 섹션 > 5초)
- [ ] G2: 16개 SynthDef 중 섹션별 적합한 신스가 실제 스케줄링됨 (최소 8종 이상)
- [ ] G3: 모든 스템(drums, bass, hat, synth, pad, fx)이 청취 가능한 레벨 (RMS > -40dB)
- [ ] G4: 마스터링 출력이 -16 ~ -12 LUFS 범위, peak < -0.3dB
- [ ] G5: 기존 테스트 + 신규 테스트 전부 통과
- [ ] G6: render-pro.ts 등 기존 소비자 코드가 새 스템 구조와 호환

### 2.2 Non-Goals
- NG1: SC SynthDef 자체 수정 (기존 .scd 파일 유지)
- NG2: 새로운 SynthDef 추가
- NG3: 라이브 모드(live-orchestrator) 수정
- NG4: Demucs/샘플 추출 로직 변경
- NG5: 데드코드 정리 (Flaw 7 — 별도 작업)
- NG6: wavetable_pad/granular_pad NRT 스케줄링 (버퍼 할당 설계 필요 — 후속 이터레이션)

## 3. User Stories & Acceptance Criteria

### US-1: 구조 감지 정규화
**As a** 파이프라인 사용자, **I want** 분석된 트랙의 구조가 정확히 감지되어, **so that** 섹션별 적절한 앰프/신스가 적용된다.

**Acceptance Criteria:**
- [ ] AC-1.1: `detect_structure()`가 트랙 전체 duration을 기준으로 최소 4개 섹션 생성
- [ ] AC-1.2: 각 섹션의 길이가 최소 5초 이상 (duration < 30초 트랙은 최소 2초)
- [ ] AC-1.3: "outro" 섹션이 전체 duration의 50% 초과하지 않음
- [ ] AC-1.4: `detectSections()` (TS)도 동일 정규화 적용

### US-2: SynthDef 이벤트 스케줄링 확장
**As a** 파이프라인 사용자, **I want** 섹션별 적합한 SynthDef가 스케줄링되어, **so that** 합성 출력이 풍성하고 다이나믹하다.

**Acceptance Criteria:**
- [ ] AC-2.1: drop 섹션에 kick, bass/acid_bass, hat, supersaw, fm_lead(centroid>2500), clap 이벤트 존재
- [ ] AC-2.2: build 섹션에 riser, arp_pluck 이벤트 존재
- [ ] AC-2.3: break 섹션에 pad 이벤트 존재 (wavetable_pad/granular_pad은 NG6으로 제외)
- [ ] AC-2.4: 30초 렌더 기준 이벤트 수 > 300개 (절대값)
- [ ] AC-2.5: pitch_contour가 비어있을 때 bass fallback이 루트+5도 교대 패턴으로 생성 (모노톤 방지)
- [ ] AC-2.6: layered_kick이 4-on-the-floor 보강용으로 drop 섹션에 스케줄링
- [ ] AC-2.7: squelch가 bass.flux > 0.3일 때 drop 섹션에 간헐적 스케줄링

### US-3: 에너지 게이트 및 앰프 정상화
**As a** 파이프라인 사용자, **I want** 에너지 기반 게이트가 합리적으로 설정되어, **so that** 스템이 청취 가능한 레벨을 유지한다.

**Acceptance Criteria:**
- [ ] AC-3.1: supersaw 에너지 게이트 0.4 → 0.15로 하향 (상수 `SUPERSAW_ENERGY_GATE` 추출)
- [ ] AC-3.2: 모든 스템 RMS > -40dB
- [ ] AC-3.3: SECTION_AMP 최소값이 0.5 → 0.65로 상향 (outro/intro)

### US-4: 버스 할당 분리 + 소비자 호환
**As a** 파이프라인 사용자, **I want** pad와 synth 그룹이 별도 버스에 할당되어, **so that** 스템 분리가 정확하다.

**Acceptance Criteria:**
- [ ] AC-4.1: 새 STEM_BUS 매핑:
  - bus 0-1: drums (kick, layered_kick, sample_player)
  - bus 2-3: bass (bass, acid_bass)
  - bus 4-5: hat (hat, clap)
  - bus 6-7: synth (supersaw, lead, arp_pluck, fm_lead, squelch)
  - bus 8-9: pad (pad)
  - bus 10-11: fx (riser)
- [ ] AC-4.2: OUTPUT_CHANNELS = 12 (6 스테레오 스템)
- [ ] AC-4.3: 인라인 스템 스플리터가 6개 스템으로 분리: `["kick","bass","hat","synth","pad","fx"]`
- [ ] AC-4.4: `render-pro.ts:108` stemNames를 `["kick","bass","hat","synth","pad","fx"]`로 업데이트
- [ ] AC-4.5: `render-pro.ts` 폴백 로직이 6-stem 기준으로 동작

### US-5: 마스터링 EQ 수정
**As a** 파이프라인 사용자, **I want** 마스터링 EQ가 합성 출력의 실제 스펙트럼 기반으로 적용되어, **so that** 스펙트럼 왜곡이 없다.

**Acceptance Criteria:**
- [ ] AC-5.1: `master.py`가 입력 WAV의 실제 frequency_balance를 scipy 3-band energy 측정으로 계산하여 EQ 적용 (analysis.json 미사용)
- [ ] AC-5.2: 측정 방법: Butterworth 3-band split (250Hz/4kHz crossover) → 각 밴드 RMS 비율 계산 → `compute_eq_gains()` 입력
- [ ] AC-5.3: 다채널 입력(10ch 또는 12ch) 시 스테레오 다운믹스 후 마스터링
- [ ] AC-5.4: 최종 출력 LUFS가 -16 ~ -12 범위. 범위 밖이면 WARNING 로그 출력 + 재정규화

## 4. Technical Design

### 4.1 Architecture Overview

```
analyze_track.py → analysis.json (구조 감지 수정)
                        ↓
track-analyzer.ts → preset.json + sections (TS 섹션 정규화)
                        ↓
render-analysis.ts → SC NRT Score (전체 SynthDef 스케줄링 + 버스 분리)
                        ↓
scsynth NRT → 12ch WAV (6 stereo stems)
                        ↓
master.py → measure synth output spectrum → compute_eq_gains(measured) → 2ch mastered WAV
```

### 4.2 Data Model Changes
- `render-analysis.ts` OUTPUT_CHANNELS: 10 → 12
- `render-analysis.ts` STEM_BUS: pad 그룹 bus 6→8, fx bus 8→10
- `render-pro.ts` stemNames: 5→6 (pad 추가)
- `master.py`: analysis.json frequency_balance 의존 제거, 입력 WAV 실측으로 대체

### 4.3 API Design
N/A (CLI 파이프라인, 외부 API 없음)

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 구조 감지 방식 | 1) diff threshold 2) 고정 비율 3) 에너지 기반 | 3) 에너지 기반 | diff는 노이즈 취약. energy_curve 활용 |
| 버스 수 | 1) 10ch 유지 2) 12ch | 12ch | pad/synth 분리 + 소비자 코드 동시 업데이트 |
| 마스터링 EQ 소스 | 1) analysis.json 2) 합성 실측 3) 하이브리드 | 2) 실측 | scipy 3-band split으로 입력 WAV 직접 측정. 기존 _crossover_filter() 재사용 |
| Bass fallback | 1) 모노톤 2) 루트+5도 3) 아르페지오 | 2) 루트+5도 | 음악적 안전 + 단조로움 방지 |
| wavetable/granular | 1) 이번에 포함 2) NG으로 분리 | 2) NG6 | 버퍼 할당 설계 필요 — 후속 이터레이션 |

### 4.5 Implementation Order

| Step | 파일 | 내용 | 의존성 |
|------|------|------|--------|
| T1 | analyze_track.py | detect_structure() 에너지 기반 정규화 | 없음 |
| T2 | track-analyzer.ts | detectSections() TS 정규화 동기화 | 없음 |
| T3 | render-analysis.ts | STEM_BUS + OUTPUT_CHANNELS 12ch | 없음 |
| T4 | render-analysis.ts | 전체 SynthDef 이벤트 스케줄링 (US-2) | T1 (섹션 데이터) |
| T5 | render-analysis.ts | 에너지 게이트/앰프 수정 (US-3) | T4 |
| T6 | render-analysis.ts + render-pro.ts | 스템 스플리터 6-stem + 소비자 호환 (US-4) | T3 |
| T7 | master.py | 실측 EQ + 다채널 다운믹스 + LUFS 범위 검증 (US-5) | T6 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | energy_curve가 모두 0 | 전체를 단일 "drop" 섹션으로 폴백 | Medium |
| E2 | pitch_contour + kick/hat 모두 비어있음 | 그리드 기반 4-on-the-floor 폴백 | Medium |
| E3 | 트랙 duration < 30초 | 최소 2섹션(intro+drop), 섹션 최소 2초 | Low |
| E4 | frequency_balance 합이 1이 아님 | 정규화 후 사용 | Low |
| E5 | SC NRT 렌더 실패 | 에러 메시지 출력 + exit 1 | High |
| E6 | master.py에 12ch WAV 입력 | 스테레오 다운믹스 후 마스터링 (AC-5.3) | Medium |
| E7 | pitch_contour 이벤트가 전부 render window 밖 | bass fallback으로 전환 (pitchInWindow.length <= 5) | Low |

## 6. Security & Permissions
N/A (로컬 CLI 파이프라인, 인증/권한 없음)

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 분석 시간 (5분 트랙) | < 120s | analyze_track.py wall time |
| NRT 렌더 시간 (30s 출력) | < 60s | scsynth NRT wall time |
| 마스터링 시간 (실측 EQ 포함) | < 15s | master.py wall time |
| 이벤트 수 (30s 출력) | > 300 | Score event count |

### 7.1 Monitoring & Alerting
CLI 콘솔 출력으로 각 단계 소요시간 + 이벤트 수 + 스템 RMS 레벨 로깅.

## 8. Testing Strategy

### 8.1 Unit Tests
- `detect_structure()` — 정규화된 섹션 경계 검증 (Python pytest)
- `detectSections()` — TS 섹션 정규화 검증 (vitest)
- `compute_eq_gains()` — 실측 frequency_balance 기반 EQ 검증 (pytest)
- 각 SynthDef 스케줄링 함수 — 이벤트 생성 여부 (vitest)

### 8.2 Integration Tests
- `render-dryrun-e2e.test.ts` — dry-run으로 전체 이벤트 생성 검증
- 마스터링 체인 — 입력→출력 LUFS/peak 범위 검증

### 8.3 Edge Case Tests
- Section 5의 E1-E7 시나리오별 테스트

## 9. Rollout Plan

### 9.1 Migration Strategy
없음 (기존 analysis.json 호환 유지). 기존 캐시된 analysis.json은 detect_structure 값만 다르며 스키마 호환.

### 9.2 Feature Flag
없음

### 9.3 Rollback Plan
git revert (단일 브랜치 작업). 기존 캐시된 analysis 산출물은 재생성 필요 (구조 감지 값 변경).

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| SuperCollider 3.13+ | System | Installed | N/A |
| pyloudnorm | pip | Installed | N/A |
| scipy (3-band filter) | pip | Installed | N/A |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| SC NRT 12ch 렌더 호환성 | Low | High | scsynth -o 12 테스트로 사전 검증 |
| render-pro.ts 6-stem 전환 시 기존 산출물 불일치 | Medium | Medium | T6에서 render-pro.ts 동시 수정 |
| 마스터링 실측 EQ 추가 연산 시간 | Low | Low | 기존 _crossover_filter() 재사용, 15s 타임아웃 |
| 이벤트 수 증가로 렌더 시간 증가 | Medium | Low | 300s 타임아웃 충분 |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| 활성 SynthDef 수 | 5/16 | 8+/16 | dry-run 이벤트 카운트 |
| 최소 스템 RMS | -200dB (무음) | > -40dB | ffmpeg volumedetect |
| 마스터링 LUFS | -91dB (무음) | -16 ~ -12 | pyloudnorm |
| 이벤트 수 (30s) | ~100 | > 300 | Score event count |
| 테스트 통과율 | 23 fail | 0 fail (관련 테스트) | vitest run |

## 12. Open Questions

- [x] OQ-1: render-pro.ts:108 stemNames 5-stem 하드코딩 → AC-4.4에서 6-stem으로 동시 수정
- [x] OQ-2: wavetable_pad/granular_pad 버퍼 할당 → NG6으로 분리 (후속 이터레이션)
