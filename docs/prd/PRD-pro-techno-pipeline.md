# PRD: Enterprise Pro Techno Production Pipeline

**Version**: 0.1
**Author**: Isaac
**Date**: 2026-03-29
**Status**: Draft
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background
현재 render-analysis.ts → scsynth NRT 파이프라인은 분석 + 스코어링 도구로는 동작하지만, 프로덕션 결과물이 아마추어 수준. 근본 원인:

1. **사운드 소스 한계**: SinOsc/Saw 기반 합성, demucs 추출 샘플 아티팩트
2. **이펙트 체인 부재**: 사이드체인 컴프, 버스 컴프, 파라메트릭 EQ, 리버브 없음
3. **스템 분리 렌더 없음**: 모든 악기가 하나의 WAV에 합쳐져 개별 프로세싱 불가
4. **믹싱 불가**: 킥/베이스/햇/신디 간 볼륨/EQ/팬 조정 없음
5. **사이드체인 부재**: 테크노의 핵심인 킥-베이스 사이드체인 없음

### 1.2 Problem Definition
분석 파이프라인의 출력을 **프로 수준 사운드**로 변환하는 완전 자동화 렌더링 + 믹싱 + 마스터링 체인이 없다.

### 1.3 Impact
분석 정확도 높지만 최종 결과물 품질이 낮아 실용 가치 없음. calibrate.py 점수 개선을 위한 이터레이션도 사운드 품질 한계 때문에 의미 없음.

## 2. Goals & Non-Goals

### 2.1 Goals
- G1: **스템 분리 NRT 렌더** — kick, bass, hat, synth를 개별 WAV로 출력
- G2: **pedalboard 프로세싱 체인** — 스템별 EQ/컴프/리버브 + 사이드체인 + 마스터
- G3: **909 샘플팩 통합** — 프로 킥/클랩/햇 샘플 사용 옵션
- G4: **분석 기반 자동 믹싱** — frequency_balance, energy_curve 기반 EQ/컴프 자동 설정
- G5: **CLI 한 줄로 전체 파이프라인** — `npx tsx scripts/render-pro.ts <analysis-dir>`
- G6: **calibrate.py total_score 70+ 달성** (현재 27% RMS, 목표 80%+)

### 2.2 Non-Goals
- NG1: Logic Pro / Ableton 연동 (API 없음)
- NG2: AI 음악 생성 (MusicGen 등)
- NG3: 실시간 재생 (NRT 렌더만)
- NG4: AU 플러그인 로딩 (보안 제한으로 불가, pedalboard 빌트인만 사용)

## 3. User Stories & Acceptance Criteria

### US-1: 스템 분리 NRT 렌더
**As a** producer, **I want** 각 악기(kick, bass, hat, synth, fx)를 개별 WAV로 렌더, **so that** 개별 프로세싱 가능.

**Acceptance Criteria:**
- [ ] AC-1.1: scsynth NRT로 5개 스템 렌더 (kick.wav, bass.wav, hat.wav, synth.wav, fx.wav)
- [ ] AC-1.2: 각 스템에 해당 악기만 포함 (kick.wav에 킥만, 등)
- [ ] AC-1.3: 모든 스템 동일 길이/SR/채널 (44100Hz, stereo, 동일 duration)
- [ ] AC-1.4: 기존 analysis.json 기반 이벤트 생성 유지

### US-2: pedalboard 프로세싱 체인
**As a** producer, **I want** 스템별 프로급 이펙트 체인, **so that** 프로 수준 믹스.

**Acceptance Criteria:**
- [ ] AC-2.1: 킥 버스: HPF 30Hz + Compressor (4:1) + Gain
- [ ] AC-2.2: 베이스 버스: HPF 25Hz + LPF 250Hz + Compressor + **사이드체인 from 킥** (ducking)
- [ ] AC-2.3: 햇 버스: HPF 3kHz + Compressor + 리버브 send
- [ ] AC-2.4: 신디 버스: EQ (cut 100-300Hz) + Compressor + **사이드체인 from 킥** + 리버브/딜레이
- [ ] AC-2.5: 마스터 버스: 버스 컴프 (2:1) + EQ + Limiter -0.3dB
- [ ] AC-2.6: 사이드체인: 킥 envelope → 베이스/신디 볼륨 덕킹 (attack 1ms, release 100ms)

### US-3: 909 샘플팩 통합
**As a** producer, **I want** 프로 드럼 샘플 사용 옵션, **so that** 합성보다 나은 드럼 사운드.

**Acceptance Criteria:**
- [ ] AC-3.1: audio/samples/909/ 디렉토리에 909 킥/클랩/햇/라이드 샘플
- [ ] AC-3.2: `--samples 909` 플래그로 샘플 모드 전환
- [ ] AC-3.3: 합성 모드 (`--synth`) / 샘플 모드 (`--samples`) / 하이브리드 (`--hybrid`) 선택

### US-4: 분석 기반 자동 믹싱
**As a** producer, **I want** 레퍼런스 분석 기반 자동 EQ/볼륨 조정, **so that** 레퍼런스 스펙트럼에 근접.

**Acceptance Criteria:**
- [ ] AC-4.1: frequency_balance → 스템별 EQ 자동 계산
- [ ] AC-4.2: energy_curve → 볼륨 오토메이션 (시간별 에너지 추종)
- [ ] AC-4.3: dynamic_range → 컴프레서 threshold/ratio 자동 설정
- [ ] AC-4.4: loudness.integrated → 마스터 LUFS 타겟

### US-5: CLI 통합
**As a** developer, **I want** 한 줄 CLI로 전체 파이프라인 실행, **so that** 자동화 가능.

**Acceptance Criteria:**
- [ ] AC-5.1: `npx tsx scripts/render-pro.ts <analysis-dir> [--samples 909] [--style dark-techno]`
- [ ] AC-5.2: 출력: `out/analysis/{name}/pro/master.wav` + 스템들
- [ ] AC-5.3: 처리 시간 < 30초 (30초 트랙 기준)

## 4. Technical Design

### 4.1 Architecture

```
analysis.json
    │
    ▼
┌──────────────────────────────┐
│  Layer 1: Composition Engine │  (TS — render-pro.ts)
│  analysis → SC events        │
│  structure-aware patterns    │
│  genre preset selection      │
└──────────┬───────────────────┘
           │  5x .scd score files (one per stem)
           ▼
┌──────────────────────────────┐
│  Layer 2: NRT Stem Render    │  (scsynth -N × 5)
│  kick.wav                    │
│  bass.wav                    │
│  hat.wav                     │
│  synth.wav                   │
│  fx.wav                      │
└──────────┬───────────────────┘
           │  5x WAV stems
           ▼
┌──────────────────────────────┐
│  Layer 3: Mix Engine         │  (Python — mix-pro.py)
│  pedalboard per-stem chains  │
│  sidechain: kick → bass/synth│
│  analysis-driven EQ/comp     │
│  stem → bus → master         │
└──────────┬───────────────────┘
           │  master.wav
           ▼
┌──────────────────────────────┐
│  Layer 4: Quality Score      │  (calibrate.py — 기존)
│  reference vs master → score │
└──────────────────────────────┘
```

### 4.2 스템 분리 렌더 방식

scsynth NRT에서 스템 분리: **개별 Score 파일 5개 생성, 각각 scsynth -N 실행**.

| 스템 | SC 파일 | SynthDefs | 이벤트 소스 |
|------|---------|-----------|-----------|
| kick.wav | kick-score.osc | layered_kick, sample_player | kick_pattern positions |
| bass.wav | bass-score.osc | acid_bass | pitch_contour / root drone |
| hat.wav | hat-score.osc | hat, sample_player | hat_pattern positions |
| synth.wav | synth-score.osc | pad, supersaw | structure-based |
| fx.wav | fx-score.osc | squelch | sparse FX |

각 Score에는 해당 SynthDef의 이벤트만 포함 → 깨끗한 스템.

### 4.3 pedalboard 믹싱 체인 상세

```python
# Per-stem chains
kick_chain = Pedalboard([
    HighpassFilter(cutoff_frequency_hz=30),
    Compressor(threshold_db=-8, ratio=4, attack_ms=5, release_ms=80),
    Gain(gain_db=2),
])

bass_chain = Pedalboard([
    HighpassFilter(cutoff_frequency_hz=25),
    LowpassFilter(cutoff_frequency_hz=250),
    Compressor(threshold_db=-10, ratio=3, attack_ms=10, release_ms=100),
    # Sidechain applied separately (envelope follower from kick)
])

hat_chain = Pedalboard([
    HighpassFilter(cutoff_frequency_hz=3000),
    Compressor(threshold_db=-15, ratio=2, attack_ms=1, release_ms=50),
    Reverb(room_size=0.15, wet_level=0.1),
])

synth_chain = Pedalboard([
    HighpassFilter(cutoff_frequency_hz=100),
    LowpassFilter(cutoff_frequency_hz=8000),
    Compressor(threshold_db=-12, ratio=3),
    Reverb(room_size=0.3, wet_level=0.15),
    Delay(delay_seconds=0.375, feedback=0.2, mix=0.1),  # dotted 8th
])

master_chain = Pedalboard([
    HighpassFilter(cutoff_frequency_hz=25),
    Compressor(threshold_db=-6, ratio=2, attack_ms=30, release_ms=200),  # bus glue
    Gain(gain_db=1),
    Limiter(threshold_db=-0.3),
])
```

### 4.4 사이드체인 구현

pedalboard에 사이드체인 입력이 없으므로, Python에서 직접 구현:

```python
def sidechain_duck(target, trigger, attack_ms=1, release_ms=100, depth=0.8, sr=44100):
    """Duck target signal based on trigger (kick) envelope."""
    # Compute kick envelope
    env = np.abs(trigger)
    # Smooth with attack/release
    attack_coeff = np.exp(-1 / (attack_ms * sr / 1000))
    release_coeff = np.exp(-1 / (release_ms * sr / 1000))
    smoothed = np.zeros_like(env)
    for i in range(1, len(env)):
        coeff = attack_coeff if env[i] > smoothed[i-1] else release_coeff
        smoothed[i] = coeff * smoothed[i-1] + (1 - coeff) * env[i]
    # Normalize and invert for ducking
    smoothed /= np.max(smoothed) + 1e-10
    gain = 1.0 - (smoothed * depth)
    return target * gain
```

### 4.5 Key Technical Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Stem render | (A) SC multi-bus (B) Separate NRT runs | **B** | 깨끗한 분리, 병렬 실행 가능 |
| Effects engine | (A) scipy (B) pedalboard (C) AU plugins | **B** | 프로급 빌트인, AU 로딩 불가 |
| Sidechain | (A) SC Compander (B) Python envelope | **B** | 스템 분리 후 적용이 더 유연 |
| Drum sounds | (A) SynthDef only (B) 909 samples (C) Both | **C** | 플래그로 선택 |
| Mastering | (A) master.py scipy (B) pedalboard | **B** | 동일 체인으로 통합 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | pedalboard 미설치 | scipy fallback (기존 master.py) | Medium |
| E2 | 스템 렌더 실패 (scsynth error) | 해당 스템 빈 WAV로 대체, warning | Medium |
| E3 | 909 샘플 디렉토리 없음 | 합성 모드로 fallback | Low |
| E4 | analysis.json 필드 누락 | 기본값 사용 (bpm=128, key=Cm) | Low |
| E5 | 사이드체인 트리거(킥) 무음 | 덕킹 비활성화 | Low |
| E6 | 렌더 시간 초과 | 300초 후 partial result 반환 | Medium |

## 6. Security & Permissions
N/A — 로컬 CLI 도구, 네트워크/인증 없음.

## 7. Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| 30초 트랙 총 처리 시간 | < 30초 | 스템 렌더(5×3s) + 믹싱(2s) + 마스터(1s) |
| 스템 렌더 병렬화 | 5 스템 동시 | 5 scsynth 프로세스 병렬 |
| 메모리 | < 1GB | pedalboard 스트리밍 처리 |

## 8. Testing Strategy

### 8.1 Unit Tests (Python)
- pedalboard chain: 입력 → 출력 RMS/peak 검증
- sidechain: 킥 onset에서 타겟 볼륨 감소 확인
- 스템 합산: 스템 믹스 ≈ 풀 렌더 (허용 오차)

### 8.2 Integration Tests (TS + Python)
- render-pro.ts: dry-run → 5개 .osc 파일 생성 확인
- 전체 파이프라인: analysis-dir → pro/master.wav 존재 + size > 0
- calibrate.py 스코어 > 기존 베이스라인

### 8.3 E2E
- void-acid-carousel 레퍼런스로 전체 실행 → calibrate score ≥ 70

## 9. Rollout Plan

### 9.1 티켓 분해 (예상)

| T# | Title | Size | Depends |
|----|-------|------|---------|
| T1 | 스템 분리 NRT 렌더 (5 stems) | L | — |
| T2 | pedalboard 믹싱 체인 (per-stem + master) | L | T1 |
| T3 | 사이드체인 컴프레션 구현 | M | T1 |
| T4 | 909 샘플팩 통합 + --samples 플래그 | M | T1 |
| T5 | 분석 기반 자동 믹싱 (EQ/comp from analysis) | M | T2 |
| T6 | CLI 통합 (render-pro.ts) | M | T1-T5 |
| T7 | E2E 테스트 + calibrate 스코어 검증 | M | T6 |

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Status | Risk |
|-----------|--------|------|
| pedalboard | ✅ 설치됨 (v0.9.17) | Low |
| scsynth NRT | ✅ 동작 중 | Low (hang 이슈 해결됨) |
| mido (MIDI) | 미설치 | Low (선택적) |
| 909 샘플팩 | 미보유 | Medium (무료 팩 다운로드 필요) |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| scsynth 병렬 5개 실행 시 리소스 | Medium | Medium | 순차 실행 fallback |
| pedalboard Python 3.9 호환성 | Low | High | ✅ 이미 설치 확인 |
| 사이드체인 Python 구현 품질 | Medium | Medium | SC Compander fallback |
| 909 샘플 라이센스 | Low | Low | CC0/public domain 팩 사용 |

## 11. Success Metrics

| Metric | Baseline (현재) | Target | Measurement |
|--------|----------------|--------|-------------|
| RMS ratio (vs ref) | 27% | 80%+ | numpy RMS comparison |
| calibrate total_score | 72.3 | 80+ | calibrate.py |
| calibrate envelope | 7.2 | 50+ | calibrate.py |
| 처리 시간 (30s 트랙) | ~8s | < 30s | wall clock |
| 사용자 만족도 | "졸라 구려" | "괜찮다" | Isaac 판단 |

## 12. Open Questions

- [ ] OQ-1: 909 샘플팩 — 무료 CC0 팩 중 추천?
- [ ] OQ-2: 스템 렌더 5개 병렬 vs 순차 — 메모리/CPU 제한?
- [ ] OQ-3: 사이드체인 파라미터 — 테크노 장르별 최적값?
