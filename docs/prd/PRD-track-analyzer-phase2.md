# PRD: Track Analyzer Phase 2 — SynthDef 확장 + 90-95% 재현

**Version**: 0.4
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-27
**Status**: Draft
**Size**: XL
**Depends On**: PRD-track-analyzer.md (Phase 1, v0.3 — Approved/Implemented)

---

## 1. Problem Statement

### 1.1 Background
Phase 1 (분석 엔진)은 완료: 하이브리드 librosa+essentia 18종 지표 분석, 프리셋 자동 생성, 패턴 초안, scene.json 생성. 64 테스트 PASS.

**실전 테스트 결과**: 레퍼런스 트랙(Void - Acid Carousel) 분석 후 생성된 프리셋으로 렌더링한 결과물 품질 — Isaac 피드백: **"안 만드느니만 못한 품질"** (체감 30-50% 재현).

원인 분석:
1. **SynthDef 한계** (체감 80% 기여) — 현재 9종 SynthDef가 모두 단순 감산 합성. acid bass, FM lead, wavetable pad, layered kick 등 핵심 사운드 재현 불가
2. **정적 매핑** (체감 15%) — 룩업 테이블 기반 일회성 매핑. temporal dynamics (시간에 따른 변화), 섹션별 파라미터 변화, envelope following 부재
3. **캘리브레이션 부재** (체감 5%) — 생성 결과 vs 레퍼런스 객관적 비교 수단 없음. MFCC 거리 기반 점수만 구상

### 1.2 Problem Definition
1. SynthDef 표현력 부족으로 acid bass (303 필터 스위프), FM lead, granular texture, layered kick 등 전자음악 핵심 사운드 재현 불가
2. 분석 결과 → 프리셋 매핑이 시간축 무시 (전곡 평균 → 단일 파라미터)하여 drop/break/build 간 다이나믹 차이 소실
3. 피치 contour 추출 불가 (crepe 미연동)로 acid bass line 멜로디 재현 불가

### 1.3 Impact of Not Solving
- 분석 파이프라인이 존재하나 출력 품질 무의미 → Phase 1 투자 매몰
- 프로덕션 워크플로우에서 사용 불가 → 수동 프리셋 설계로 회귀
- 90%+ 재현 목표 달성 불가

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: **SynthDef 7종 신규** — acid_bass, fm_lead, wavetable_pad, granular_pad, layered_kick, squelch, sample_player. 기존 9종 + 신규 7종 = 16종
- [ ] G2: **필터 모델링** — MoogFF (core SC) 기반 303-style 레조넌트 필터. accent/slide/distortion 지원. SC3-plugins(RLPFD/DFM1) 감지 시 자동 업그레이드
- [ ] G3: **피치 추적** — crepe/torchcrepe 또는 librosa pyin 기반 acid bass pitch contour 추출 → 노트 이벤트 변환
- [ ] G4: **매핑 재설계** — 정적 룩업 → temporal dynamics 매핑. 섹션별(drop/break/build) 파라미터 분기 + envelope following
- [ ] G5: **캘리브레이션 프레임워크** — 복합 유사도 이중 스코어. `synthesis_only_score` (합성만, 목표 75-85) + `hybrid_score` (합성+샘플, 목표 **98**). MFCC+DTW 30% + spectral 20% + envelope 20% + onset 15% + chroma 15%. 벤치마크 5곡 + LUFS 정규화 + 인간 청취 평가
- [ ] G6: **presetSchema 확장** — 신규 7종 SynthDef 파라미터 + stemGroups 확장. 하위 호환 유지
- [ ] G7: **Wavetable 인프라** — NRT Score 내 Buffer 할당 + wavetable 생성 파이프라인
- [ ] G8: **샘플 하이브리드** — demucs stem에서 킥/스네어/기타 샘플 추출 → Buffer 로드 → PlayBuf 재생. 합성 + 샘플링 병행으로 최대 재현율
- [ ] G9: **피치 추적 3단 폴백** — torchcrepe (최우선) → PESTO (경량 ML) → librosa pyin (무의존). Viterbi 디코더로 303 글라이드 자연 캡처

### 2.2 Non-Goals
- NG1: 실시간 분석/피치 추적 (오프라인 배치만)
- NG2: GUI/웹 인터페이스
- NG3: AI 기반 자동 작곡/편곡
- NG4: 기존 9종 SynthDef 재작성 (파라미터 추가만 허용)
- NG5: SC3-plugins 필수 의존 (core SC만으로 동작해야 함. SC3-plugins는 품질 향상 옵션)
- NG6: demucs 이외의 소스 분리 엔진 교체
- NG7: 실시간 피치 추적/리샘플링

## 3. User Stories & Acceptance Criteria

### US-1: Acid Bass 303 사운드 재현
**As a** 프로듀서, **I want** 레퍼런스 트랙의 acid bass line을 분석하여 303-style 필터 스위프 + accent + slide가 포함된 사운드를 재현하기를.

**Acceptance Criteria:**
- [ ] AC-1.1: `acid_bass` SynthDef — MoogFF 기반 레조넌트 LPF + filter envelope + accent + slide + distortion
- [ ] AC-1.2: 파라미터: `freq, amp, dur, pan, cutoff(100-8000), resonance(0-3.9), envDepth(0-8000), envDecay(0.01-1.0), accent(0-1), slide(0/1), slideTime(0.01-0.5), wave(0=saw,1=pulse), dist(0-1)`
- [ ] AC-1.3: SC3-plugins 감지 시 RLPFD(TB303 전용 필터) 자동 사용. 미설치 시 MoogFF 폴백
- [ ] AC-1.4: accent=1 시 filter env depth 2배 + resonance +0.5 + decay 1.5배
- [ ] AC-1.5: slide=1 시 `Lag.kr(freq, slideTime)` 포르타멘토 활성화
- [ ] AC-1.6: NRT 호환. doneAction:2 필수

### US-2: FM Lead 합성
**As a** 프로듀서, **I want** FM 합성 기반 lead 사운드로 psytrance/electronic 리드 라인을 재현하기를.

**Acceptance Criteria:**
- [ ] AC-2.1: `fm_lead` SynthDef — 2-operator FM (carrier + modulator)
- [ ] AC-2.2: 파라미터: `freq, amp, dur, pan, mRatio(0.5-16), cRatio(0.5-4), index(0.1-20), iScale(1-10), vibrato(0-1), drive(0-1)`
- [ ] AC-2.3: modulation index envelope: `[index, index*iScale, index]` over `[attack, dur]` — FM 특유의 어택 밝기
- [ ] AC-2.4: vibrato = SinOsc.kr(5) * vibrato * freq * 0.02
- [ ] AC-2.5: `.tanh` soft clipping distortion stage
- [ ] AC-2.6: NRT 호환. Core SC만 필요 (FM7 불필요)

### US-3: Wavetable Pad 합성
**As a** 프로듀서, **I want** wavetable morphing 기반 풍성한 pad 사운드를 재현하기를.

**Acceptance Criteria:**
- [ ] AC-3.1: `wavetable_pad` SynthDef — VOsc 기반 wavetable morphing + RLPF
- [ ] AC-3.2: 파라미터: `freq, amp, dur, pan, morph(0-1), attack(0.1-4), release(0.5-8), filterCutoff(200-8000), filterRes(0.1-0.8), detune(0-0.02)`
- [ ] AC-3.3: 8개 연속 wavetable Buffer 할당 (sine1Msg, 하모닉 복잡도 점진 증가)
- [ ] AC-3.4: morph 파라미터 → VOsc bufpos 매핑 (0=단순 사인 ~ 1=풍부한 하모닉)
- [ ] AC-3.5: detune: 2-voice detuned VOsc for stereo width
- [ ] AC-3.6: NRT Score 내 Buffer 할당 메시지 (`b_alloc` + `b_gen sine1`) 생성 함수 제공
- [ ] AC-3.7: NRT 호환

### US-4: Granular Pad 합성
**As a** 프로듀서, **I want** 그래뉼러 합성 기반 텍스처/앰비언스를 재현하기를.

**Acceptance Criteria:**
- [ ] AC-4.1: `granular_pad` SynthDef — GrainBuf 기반. demucs stem 또는 사전 로드된 Buffer 사용
- [ ] AC-4.2: 파라미터: `freq, amp, dur, pan, buf(buffer index), density(1-40), grainDur(0.01-0.5), rate(0.5-2.0), posRand(0-1), panWidth(0-1)`
- [ ] AC-4.3: density → Impulse.kr trigger, posRand → TRand position randomization
- [ ] AC-4.4: rate = pitch scatter (1.0=원본, <1 낮음, >1 높음). LFNoise1 기반 미세 변화
- [ ] AC-4.5: ADSR envelope (attack=dur*0.2, sustain=dur*0.6, release=dur*0.2)
- [ ] AC-4.6: LeakDC.ar 필수 (DC offset 제거)
- [ ] AC-4.7: NRT 호환. Buffer는 Score 내 사전 할당

### US-5: Layered Kick 합성
**As a** 프로듀서, **I want** 3-layer 킥 드럼 (sub + body + click)으로 프로 수준 킥을 재현하기를.

**Acceptance Criteria:**
- [ ] AC-5.1: `layered_kick` SynthDef — 3-layer: sub(sine+pitchEnv) + body(filtered noise) + click(HP noise burst)
- [ ] AC-5.2: 파라미터: `freq, amp, dur, pan, subDecay(0.1-0.8), bodyDecay(0.05-0.3), clickAmp(0-1), bodyFreq(100-500), drive(0-1), punch(0-1)`
- [ ] AC-5.3: Sub layer: SinOsc + pitch envelope (freq*8 → freq, 50ms)
- [ ] AC-5.4: Body layer: WhiteNoise → BPF(bodyFreq, rq=0.5) → percussive env
- [ ] AC-5.5: Click layer: WhiteNoise → HPF(4000) → ultra-short env (1ms attack, 5ms decay)
- [ ] AC-5.6: punch 파라미터: 킥 초기 피크 부스트 (transient shaper)
- [ ] AC-5.7: `.tanh` distortion stage (drive 파라미터)
- [ ] AC-5.8: NRT 호환

### US-6: Squelch 이펙트
**As a** 프로듀서, **I want** resonant filter sweep 이펙트로 acid/psytrance 특유의 squelch 사운드를 재현하기를.

**Acceptance Criteria:**
- [ ] AC-6.1: `squelch` SynthDef — 레조넌트 필터 스위프 (noise/saw 소스 → BPF/LPF sweep)
- [ ] AC-6.2: 파라미터: `freq, amp, dur, pan, sweepStart(200-8000), sweepEnd(200-8000), sweepCurve(-4~4), resonance(0.1-0.95), source(0=noise,1=saw,2=pulse), lfoRate(0-20), lfoDepth(0-4000)`
- [ ] AC-6.3: EnvGen 기반 주파수 스위프 (sweepStart → sweepEnd, 커브 조절 가능)
- [ ] AC-6.4: 높은 resonance에서 self-oscillation 효과
- [ ] AC-6.5: NRT 호환

### US-7: 피치 추적 + 노트 이벤트
**As a** 프로듀서, **I want** 레퍼런스 트랙의 bass line 피치를 추적하여 노트 시퀀스를 추출하기를.

**Acceptance Criteria:**
- [ ] AC-7.1: Python analyze_track.py에 피치 추적 추가 (crepe/torchcrepe 또는 librosa pyin)
- [ ] AC-7.2: demucs bass stem에서 프레임 단위 pitch + confidence 추출
- [ ] AC-7.3: pitch contour → 노트 이벤트 변환: `[{time, freq, duration, velocity}]`
- [ ] AC-7.4: slide 감지: 연속 프레임 간 pitch 변화 > **1.5 semitones** 시 slide=1 마킹. 비교 단위: `12 * log2(f1/f2)` (cents 기반, 옥타브 무관)
- [ ] AC-7.5: 노트 이벤트 → Tidal 패턴 또는 SC Score 이벤트로 변환
- [ ] AC-7.6: 분석 JSON에 `pitch_contour` 필드 추가
- [ ] AC-7.7: 피치 추적은 US-12의 3단 폴백 체인을 따른다 (torchcrepe → PESTO → pyin). 전부 미설치 시 skip + warning

### US-8: Temporal Dynamics 매핑
**As a** 프로듀서, **I want** 분석된 섹션별 특성에 따라 파라미터가 시간에 따라 변화하는 프리셋을 생성하기를.

**Acceptance Criteria:**
- [ ] AC-8.1: 프리셋 스키마에 `sections` 필드 추가 (선택적, 하위 호환):
  ```
  sections: [{label, start, end, synthOverrides: Partial<synthParams>, fxOverrides: Partial<fxDefaults>}]
  ```
- [ ] AC-8.2: 분석된 structure segments별 독립 매핑 (drop → 강한 kick/bass, break → pad/ambient, build → riser/filter sweep)
- [ ] AC-8.3: envelope following: RMS envelope 기반 동적 파라미터 (compress, drive 등)
- [ ] AC-8.4: accent pattern 추출: onset strength envelope에서 accent 위치 감지 → acid_bass accent 패턴으로 변환
- [ ] AC-8.5: 기존 generatePreset 함수와 하위 호환 (sections 미지원 시 단일 프리셋으로 동작)
- [ ] AC-8.6: **NRT 렌더 경로**: sections[] → NRT Score에서 섹션 전환 시 파라미터 오버라이드 메시지 생성. `osc-to-nrt.ts`에서 sections 읽고 시간 기반 `n_set` 메시지 삽입
- [ ] AC-8.7: **Tidal 렌더 경로**: sections[] → 섹션별 Tidal 코드 블록 생성 (drop 패턴, break 패턴 등 분리). `patterns.tidal` 출력에 섹션 주석 포함

### US-9: 캘리브레이션 프레임워크
**As a** 프로듀서, **I want** 생성된 사운드와 레퍼런스를 객관적으로 비교하여 재현 품질 점수를 받기를.

**Acceptance Criteria:**
- [ ] AC-9.1: `npm run calibrate <reference.wav> <synthesized.wav>` CLI 커맨드. **두 입력 파일 모두 `validateFilePath(path, PROJECT_ROOT, ['.wav', '.flac'])` 통과 필수**
- [ ] AC-9.1a: 무음/극저에너지 입력 시 `score=0 + warning` 반환. `norm(S_ref) < epsilon` 시 early return (division by zero 방지)
- [ ] AC-9.2: 복합 유사도 **이중 스코어** (0-100):

| 지표 | 가중치 | 알고리즘 |
|------|--------|----------|
| MFCC + DTW | 30% | librosa mfcc(n=13) + dtw(metric='cosine') → normalized |
| Spectral Convergence | 20% | Frobenius norm(S_ref - S_synth) / Frobenius norm(S_ref) |
| RMS Envelope Correlation | 20% | Pearson correlation of normalized RMS envelopes |
| Onset Pattern F1 | 15% | Onset timing match (50ms tolerance) → precision/recall/F1 |
| Chroma DTW | 15% | chroma_cqt + dtw(metric='cosine') → normalized |

- [ ] AC-9.3: 결과 JSON 스키마 (dual-score 통일):
  ```json
  {
    "synthesis_only_score": 78.5,
    "hybrid_score": 96.2,
    "mode": "hybrid",
    "breakdown": {
      "synthesis_only": {"mfcc": 72, "spectral": 65, "envelope": 80, "attacks": 85, "chroma": 70},
      "hybrid": {"mfcc": 95, "spectral": 97, "envelope": 96, "attacks": 98, "chroma": 94}
    },
    "weights": {"mfcc": 0.30, "spectral": 0.20, "envelope": 0.20, "attacks": 0.15, "chroma": 0.15},
    "lufs_normalized": true,
    "benchmark_track": "void-acid-carousel"
  }
  ```
- [ ] AC-9.4: 저장: `out/analysis/{filename}/calibration.json`
- [ ] AC-9.5: per-stem 비교 (demucs 출력 가용 시): drums, bass, vocals, other 개별 스코어
- [ ] AC-9.6: **이중 스코어 체계**:
  - `synthesis_only_score`: 합성 SynthDef만 사용한 출력 vs 레퍼런스. 목표 **75-85**
  - `hybrid_score`: 합성 + 샘플 하이브리드 출력 vs 레퍼런스. 목표 **98**
  - hybrid >= 95 = "Production Ready", >= 85 = "Good", < 85 = "Needs Work"
- [ ] AC-9.7: **벤치마크 프로토콜**: 최소 5곡 고정 세트 (psytrance, techno, acid, trance, progressive). **LUFS 정규화** (EBU R128 -14 LUFS) 후 비교. 인간 청취 평가(MOS 1-5) 병행
- [ ] AC-9.8: 캘리브레이션 결과에 `mode: "synthesis_only" | "hybrid"` + `lufs_normalized: boolean` 필드 포함

### US-10: presetSchema + synth-stem-map 확장
**As a** 개발자, **I want** 신규 7종 SynthDef가 기존 프리셋 + NRT 파이프라인과 호환되기를.

**Acceptance Criteria:**
- [ ] AC-10.1: SYNTHDEF_PARAMS에 7종 추가:
  ```
  acid_bass: [cutoff, resonance, envDepth, envDecay, accent, slide, slideTime, wave, dist]
  fm_lead: [mRatio, cRatio, index, iScale, vibrato, drive]
  wavetable_pad: [morph, attack, release, filterCutoff, filterRes, detune]
  granular_pad: [buf, density, grainDur, rate, posRand, panWidth]
  layered_kick: [subDecay, bodyDecay, clickAmp, bodyFreq, drive, punch]
  squelch: [sweepStart, sweepEnd, sweepCurve, resonance, source, lfoRate, lfoDepth]
  sample_player: [buf, rate, startPos, attack, release, hpFreq, lpFreq]
  ```
- [ ] AC-10.2: presetSchema.synthParams에 7종 추가 (`.optional()` — 하위 호환)
- [ ] AC-10.3: stemGroups 기본값 확장 (하이브리드 지원):
  ```
  drums: [kick, layered_kick, hat, clap, "sample_player:kick_001", "sample_player:snare_001"]
  bass: [bass, acid_bass, "sample_player:bass_001"]
  synth: [lead, fm_lead, supersaw, arp_pluck, squelch]
  pad: [pad, wavetable_pad, granular_pad]
  fx: [riser, "sample_player:fx_001"]
  ```
- [ ] AC-10.4: 기존 5종 장르 프리셋(psytrance.json 등) + 생성 프리셋 하위 호환 유지
- [ ] AC-10.5: generatePreset 함수에서 bass_profile.type=acid 시 acid_bass 파라미터 자동 매핑
- [ ] AC-10.6: stemGroups에서 `"sample_player:kick_001"` 형태의 하이브리드 레퍼런스 파싱 지원
- [ ] AC-10.7: **synth-stem-map.ts 완전 계약**: (1) `SYNTH_STEM_MAP`에 7종 추가 (acid_bass→bass:2, fm_lead→synth:4, wavetable_pad→synth:4, granular_pad→synth:4, layered_kick→drums:0, squelch→synth:4, sample_player→동적). (2) `SUPPORTED_SYNTHDEFS` size=16. (3) `normalizeParams` 화이트리스트에 신규 파라미터 전부 추가. (4) `mapSamplePlayerBus(hitType)` 함수 추가 (kick/snare/hat→0, bass→2, fx→6, default→4). (5) 기존 E2E 테스트의 하드코딩 assertion (`size).toBe(9)` 등) 업데이트

### US-11: 샘플 하이브리드 (demucs stem 직접 샘플링)
**As a** 프로듀서, **I want** 레퍼런스 트랙의 실제 킥/스네어/보컬 샘플을 추출하여 합성과 병행 사용하기를.

**Acceptance Criteria:**
- [ ] AC-11.1: `sample_player` SynthDef — PlayBuf 기반 원샷 샘플 재생기
- [ ] AC-11.2: 파라미터: `buf(buffer index), amp, dur, pan, rate(0.5-2.0), startPos(0-1), attack(0-0.1), release(0.01-1.0), hpFreq(20-500), lpFreq(500-20000)`
- [ ] AC-11.3: demucs drums stem에서 개별 킥/스네어/하이햇 히트 자동 추출:
  - onset detection → 개별 히트 세그먼트 분리 (onset ~ 다음 onset 또는 silence)
  - 각 히트를 개별 WAV 파일로 저장: `out/analysis/{name}/samples/kick_001.wav`, `snare_001.wav` 등
  - 히트 분류: 주파수 스펙트럼 기반 (kick: <200Hz dominant, snare: 200-2kHz peak, hat: >5kHz dominant)
- [ ] AC-11.4: demucs bass stem → bass 원샷 또는 루프 샘플 추출 (pitched segments)
- [ ] AC-11.5: demucs other stem → FX/atmosphere 샘플 추출 (에너지 기반 세그먼트)
- [ ] AC-11.6: 추출 샘플을 NRT Score에 Buffer로 로드하여 sample_player 또는 granular_pad에서 재생
- [ ] AC-11.7: 합성+샘플 하이브리드 모드: stemGroups에서 합성 SynthDef와 sample_player 혼합 가능
  ```
  stemGroups: {
    drums: ["layered_kick", "sample_player:kick_001"],  // 합성 + 샘플 병행
    bass: ["acid_bass", "sample_player:bass_loop"],
    pad: ["wavetable_pad", "granular_pad:other_stem"],
  }
  ```
- [ ] AC-11.8: 샘플 추출 결과 메타데이터: `out/analysis/{name}/samples/manifest.json`. **명명 규약**: 키는 단수형 (`kick`, `snare`, `hat`, `bass`, `fx`), 파일명은 `{type}_{NNN}.wav` (예: `kick_001.wav`). stemGroups 레퍼런스 형식: `"sample_player:{type}_{NNN}"` (예: `"sample_player:kick_001"`).
  ```json
  {
    "kick": [{"file": "kick_001.wav", "duration": 0.35, "peak_freq": 62}],
    "snare": [{"file": "snare_001.wav", "duration": 0.28, "peak_freq": 220}],
    "hat": [{"file": "hat_001.wav", "duration": 0.08, "peak_freq": 8500}],
    "bass": [{"file": "bass_001.wav", "duration": 1.2, "pitch": 110}],
    "fx": [{"file": "fx_001.wav", "duration": 2.5}]
  }
  ```

### US-12: 피치 추적 3단 폴백
**As a** 프로듀서, **I want** 가장 정확한 피치 추적기를 자동 선택하여 acid bass 피치 contour를 추출하기를.

**Acceptance Criteria:**
- [ ] AC-12.1: 3단 폴백 체인: torchcrepe → PESTO → librosa pyin
- [ ] AC-12.2: torchcrepe: Viterbi decoder, 5ms hop, fmin=30 fmax=1000, model='full' (CPU 가능)
- [ ] AC-12.3: PESTO: `pip install pesto-pitch`, 120KB 모델, 12x 실시간 속도
- [ ] AC-12.4: pyin: librosa 내장, fmin=C1(32.7Hz) fmax=C5(523Hz), 무의존
- [ ] AC-12.5: 각 추적기의 periodicity/confidence 기반 품질 자가 평가 → 결과에 `tracker_used` 필드
- [ ] AC-12.6: 글라이드 감지: 프레임 간 pitch delta > **1.5 semitones** = slide 마킹. 단위: `12 * log2(f1/f2)`. AC-7.4와 동일 기준
- [ ] AC-12.7: 스케일 양자화: 분석된 key에 맞는 스케일로 pitch 양자화 (옵션)
- [ ] AC-12.8: Basic Pitch (Spotify) 옵션: pitch bend 네이티브 캡처 + MIDI 직접 출력 (추가 설치 시)

## 4. Technical Design

### 4.1 Architecture Overview

```
[Phase 1 기존]                              [Phase 2 확장]

analyze_track.py                            analyze_track.py (확장)
├── 18종 지표 (유지)                         ├── 18종 + pitch_contour (US-7)
├── demucs stems (유지)                      ├── per-stem pitch tracking
└── analysis.json                            └── analysis.json (확장)

track-analyzer.ts                           track-analyzer.ts (재설계)
├── 정적 룩업 매핑 (유지)                    ├── temporal dynamics 매핑 (US-8)
├── generatePreset (유지)                    ├── generatePreset (확장: sections + 신규 SynthDef)
└── generateSceneAudio (유지)                ├── accent/slide 패턴 생성
                                            └── NRT wavetable buffer commands

SynthDefs (9종)                              SynthDefs (9 + 7 = 16종)
├── bass, kick, hat, clap                   ├── acid_bass (US-1)
├── supersaw, pad, lead                     ├── fm_lead (US-2)
├── arp_pluck, riser                        ├── wavetable_pad (US-3)
                                            ├── granular_pad (US-4)
                                            ├── layered_kick (US-5)
                                            ├── squelch (US-6)
                                            └── sample_player (US-11)

                                            calibrate.py (신규, US-9)
                                            └── 복합 유사도 스코어

                                            sample_extract.py (신규, US-11)
                                            └── demucs stem → 개별 히트/루프 추출

genre-preset.ts                             genre-preset.ts (확장)
├── presetSchema (9종)                      ├── presetSchema (16종, optional)
├── SYNTHDEF_PARAMS (9종)                   ├── SYNTHDEF_PARAMS (16종)
└── stemGroups                              └── stemGroups (확장, 하이브리드)

synth-stem-map.ts (NRT 핵심)               synth-stem-map.ts (확장)
├── SYNTH_STEM_MAP (9종)                    ├── SYNTH_STEM_MAP (16종 + 동적 라우팅)
├── SUPPORTED_SYNTHDEFS (9)                 ├── SUPPORTED_SYNTHDEFS (16)
├── normalizeParams (화이트리스트)           ├── normalizeParams (신규 파라미터 추가)
└── mapSynthDef (정적)                      └── mapSynthDef (sample_player 동적 bus)
```

### 4.2 SynthDef 기술 설계

#### 4.2.1 acid_bass (핵심 — 품질 영향도 최대)

```supercollider
SynthDef(\acid_bass, { |out=0, freq=110, amp=0.7, dur=0.3, pan=0,
    cutoff=800, resonance=2.0, envDepth=4000, envDecay=0.2,
    accent=0, slide=0, slideTime=0.1, wave=0, dist=0.3|

    var sig, fenv, aenv, lagFreq, accentMul;

    // Accent: boosts filter depth + resonance + decay
    accentMul = 1 + accent;

    // Slide (portamento) — Lag.kr 기반
    lagFreq = Lag.kr(freq, slide * slideTime);

    // Oscillator: saw(0) or pulse(1)
    sig = Select.ar(wave, [Saw.ar(lagFreq), Pulse.ar(lagFreq, 0.5)]);

    // Filter envelope — accent increases depth and extends decay
    fenv = EnvGen.kr(
        Env.perc(0.01, envDecay * accentMul, curve: -4),
        doneAction: 0
    );

    // MoogFF (core SC, always available) — gain 0-4 for resonance
    // If SC3-plugins available, RLPFD is preferred (see runtime check)
    sig = MoogFF.ar(sig,
        (cutoff + (fenv * envDepth * accentMul)).clip(20, 20000),
        (resonance + (accent * 0.5)).clip(0, 3.9)
    );

    // Distortion stage
    sig = (sig * (1 + (dist * 4))).tanh;

    // Amplitude envelope
    aenv = EnvGen.kr(
        Env.perc(0.005, dur * accentMul, curve: -4),
        doneAction: 2
    );

    sig = sig * aenv * amp;
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
```

**필터 전략**:
- 기본: `MoogFF` (core SC, 설치 보장)
- 업그레이드: `RLPFD` (SC3-plugins BhobUGens — TB303 전용 필터, dist 내장)
- 대안: `DFM1` (SC3-plugins — self-oscillation + inputgain overdrive)
- 런타임 감지: TS에서 `sclang -e "RLPFD"` 실행 → 성공 시 RLPFD 버전 SynthDef 로드

#### 4.2.2 fm_lead (2-operator FM)

```supercollider
SynthDef(\fm_lead, { |out=0, freq=440, amp=0.5, dur=0.5, pan=0,
    mRatio=2, cRatio=1, index=3, iScale=5,
    vibrato=0.3, drive=0.2|

    var car, mod, env, iEnv, vib;

    // Modulation index envelope (bright attack → mellow sustain)
    iEnv = EnvGen.kr(
        Env.new([index, index * iScale, index], [0.01, dur * 0.8], [4, -4])
    );

    // Vibrato
    vib = SinOsc.kr(5) * vibrato * freq * 0.02;

    // Modulator → Carrier
    mod = SinOsc.ar((freq + vib) * mRatio, mul: (freq + vib) * mRatio * iEnv);
    car = SinOsc.ar((freq + vib) * cRatio + mod);

    // Drive
    car = (car * (1 + (drive * 3))).tanh;

    // Amplitude envelope
    env = EnvGen.kr(Env.perc(0.01, dur), doneAction: 2);
    car = car * env * amp;

    car = Pan2.ar(car, pan);
    Out.ar(out, car);
}).add;
```

#### 4.2.3 wavetable_pad (VOsc morphing)

```supercollider
// Buffer 할당은 NRT Score에서 사전 수행 (see 4.3)
SynthDef(\wavetable_pad, { |out=0, freq=220, amp=0.4, dur=4, pan=0,
    morph=0.5, attack=1, release=1.5,
    filterCutoff=4000, filterRes=0.4, detune=0.005,
    bufBase=0|  // 8개 연속 버퍼의 시작 인덱스

    var sig, sig2, env, fenv, bufPos;

    // morph → buffer position (0-7 range)
    bufPos = morph.linlin(0, 1, bufBase, bufBase + 7);

    // 2-voice detuned for stereo width
    sig = VOsc.ar(bufPos, freq);
    sig2 = VOsc.ar(bufPos, freq * (1 + detune));

    sig = [sig, sig2];

    // Filter
    fenv = EnvGen.kr(Env.new([200, filterCutoff, filterCutoff * 0.5],
        [attack, dur - attack]));
    sig = RLPF.ar(sig, fenv.clip(20, 20000), filterRes);

    // Amplitude envelope
    env = EnvGen.kr(
        Env.new([0, 1, 1, 0], [attack, dur - attack - release, release]),
        doneAction: 2
    );

    sig = sig * env * amp;
    Out.ar(out, sig);
}).add;
```

#### 4.2.4 granular_pad (GrainBuf)

```supercollider
SynthDef(\granular_pad, { |out=0, freq=220, amp=0.4, dur=4, pan=0,
    buf=0, density=8, grainDur=0.1, rate=1.0,
    posRand=0.5, panWidth=0.5|

    var sig, env, trig, pos;

    // Grain trigger
    trig = Impulse.kr(density);

    // Random position within buffer
    pos = TRand.kr(0.1, 0.9, trig) * posRand + ((1 - posRand) * 0.5);

    // Granular synthesis
    sig = GrainBuf.ar(2, trig, grainDur, buf,
        rate + LFNoise1.kr(4).range(-0.05, 0.05),  // subtle pitch scatter
        pos,
        2,  // interp
        pan: LFNoise1.kr(2).range(panWidth.neg, panWidth),
        envbufnum: -1
    );

    // Amplitude envelope
    env = EnvGen.kr(
        Env.new([0, 1, 1, 0], [dur * 0.2, dur * 0.6, dur * 0.2]),
        doneAction: 2
    );

    sig = sig * env * amp;
    sig = LeakDC.ar(sig);
    Out.ar(out, sig);
}).add;
```

#### 4.2.5 layered_kick (3-layer — Nathan Ho kick_electro 참고)

> 리서치 출처: SCLOrkSynths `kick_electro` (Nathan Ho/Snappizz), `kickBlocks`, `kick3`

```supercollider
SynthDef(\layered_kick, { |out=0, freq=50, amp=0.8, dur=0.5, pan=0,
    subDecay=0.4, bodyDecay=0.1, clickAmp=0.6,
    bodyFreq=200, drive=0, punch=0.5|

    var sub, body, click, sig;

    // Layer 1: Sub — multi-stage pitch envelope (261→120→freq Hz)
    // Nathan Ho 패턴: 단순 2-stage 대신 3-stage로 더 리얼한 킥
    sub = SinOsc.ar(
        EnvGen.kr(Env.new(
            [freq * 5, freq * 2.4, freq],
            [dur / 8.57, dur / 3.75],
            \exp
        ))
    ) * EnvGen.kr(Env.linen(0.001, subDecay / 3, subDecay));

    // Layer 2: Body — Formant UGen (WhiteNoise→BPF보다 풍부한 스펙트럼)
    // + Hasher deterministic noise (NRT 안전)
    body = LPF.ar(
        Formant.ar(bodyFreq * 0.5, bodyFreq * 2, bodyFreq * 4),
        bodyFreq * 3
    ) * EnvGen.kr(Env.perc(0.001, bodyDecay, level: 0.15));

    // Layer 3: Click — Impulse + BPF (깨끗한 트랜지언트)
    click = BPF.ar(
        Impulse.ar(0) * SampleRate.ir / 48000,
        6100, 1.0
    ) * clickAmp;

    // Mix + punch transient
    sig = sub + body + click;
    sig = sig * (1 + (punch * EnvGen.kr(Env.perc(0.001, 0.01)) * 3));

    // Distortion (.tanh — psytrance 필수)
    sig = (sig * (1 + (drive * 4))).tanh;

    sig = sig * amp;
    DetectSilence.ar(sig, doneAction: 2);
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
```

#### 4.2.6 squelch (resonant filter sweep + self-oscillation)

> 리서치 출처: DFM1 self-oscillation (res > 1.0), RLPF XLine accelerating sweep

```supercollider
SynthDef(\squelch, { |out=0, freq=440, amp=0.5, dur=0.5, pan=0,
    sweepStart=200, sweepEnd=4000, sweepCurve=(-4),
    resonance=0.8, source=0, lfoRate=0, lfoDepth=0|

    var sig, fenv, env, lfo;

    // Source: noise(0), saw(1), pulse(2)
    sig = Select.ar(source, [WhiteNoise.ar, Saw.ar(freq), Pulse.ar(freq, 0.5)]);

    // Filter frequency sweep
    fenv = EnvGen.kr(
        Env.new([sweepStart, sweepEnd], [dur], [sweepCurve])
    );

    // Optional LFO modulation (wobble/evolving squelch)
    lfo = SinOsc.kr(lfoRate) * lfoDepth;

    // MoogFF for self-oscillation at high resonance (gain approaching 4.0)
    // RLPF 대신 MoogFF — gain 3.5+ 에서 self-oscillation 가능
    sig = MoogFF.ar(sig,
        (fenv + lfo).clip(20, 20000),
        (resonance * 4).clip(0, 3.95)  // 0-1 → 0-4 MoogFF gain range
    );

    // Amplitude envelope
    env = EnvGen.kr(Env.perc(0.01, dur), doneAction: 2);
    sig = sig * env * amp;
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
```

**SC3-plugins 가용 시 DFM1 업그레이드** (self-oscillation + 내장 overdrive):
```supercollider
// DFM1: resonance > 1.0에서 self-oscillation. inputgain으로 내장 overdrive.
sig = DFM1.ar(sig, fenv.clip(20, 20000), resonance * 1.5,
    inputgain: 1 + (resonance * 2), noiselevel: 0.0003);
```

#### 4.2.7 sample_player (PlayBuf 기반 샘플 재생기)

```supercollider
SynthDef(\sample_player, { |out=0, buf=0, amp=0.8, dur=1, pan=0,
    rate=1.0, startPos=0, attack=0.005, release=0.05,
    hpFreq=20, lpFreq=20000|

    var sig, env, frames;

    frames = BufFrames.kr(buf);

    // PlayBuf with rate and start position
    sig = PlayBuf.ar(1, buf,
        BufRateScale.kr(buf) * rate,
        startPos: startPos * frames,
        doneAction: 0  // envelope handles free
    );

    // HP/LP filter for isolation
    sig = HPF.ar(sig, hpFreq);
    sig = LPF.ar(sig, lpFreq);

    // Amplitude envelope
    env = EnvGen.kr(
        Env.new([0, 1, 1, 0], [attack, dur - attack - release, release]),
        doneAction: 2
    );

    sig = sig * env * amp;
    sig = Pan2.ar(sig, pan);
    Out.ar(out, sig);
}).add;
```

### 4.2.8 샘플 추출 파이프라인 (sample_extract.py)

```python
# audio/analyzer/sample_extract.py
def extract_hits(stem_path, output_dir, stem_type, sr=22050):
    """Extract individual hits from demucs drum/bass/other stems."""
    y, _ = librosa.load(stem_path, sr=sr, mono=True)

    # Onset detection
    onsets = librosa.onset.onset_detect(y=y, sr=sr, units='samples',
                                         backtrack=True)

    hits = []
    for i, start in enumerate(onsets):
        # End: next onset or +0.5s (whichever first)
        end = onsets[i + 1] if i + 1 < len(onsets) else min(start + int(0.5 * sr), len(y))

        segment = y[start:end]
        if len(segment) < int(0.01 * sr):  # skip < 10ms
            continue

        # Classify hit by spectral centroid
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=segment, sr=sr)))
        if stem_type == 'drums':
            if centroid < 200:
                hit_type = 'kick'
            elif centroid < 2000:
                hit_type = 'snare'
            else:
                hit_type = 'hat'
        elif stem_type == 'bass':
            hit_type = 'bass'
        else:
            hit_type = 'fx'

        # Save individual WAV
        fname = f"{hit_type}_{i:03d}.wav"
        sf.write(os.path.join(output_dir, fname), segment, sr)

        hits.append({
            'file': fname,
            'type': hit_type,
            'duration': round(len(segment) / sr, 3),
            'peak_freq': round(centroid, 1),
            'onset_time': round(start / sr, 3),
        })

    # Write manifest — 단수형 키 (AC-11.8 명명 규약)
    manifest = {}
    for h in hits:
        key = h['type']  # kick, snare, hat, bass, fx (단수형)
        manifest.setdefault(key, []).append(h)

    with open(os.path.join(output_dir, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)

    return manifest
```

### 4.3 Buffer Allocation Strategy (NRT)

> **[P1-2 fix]** wavetable, granular, sample_player가 Buffer index를 경쟁 사용. 충돌 방지를 위한 range partition.

```typescript
// scripts/lib/buffer-allocator.ts
const BUFFER_RANGES = {
  wavetable: { start: 0, end: 7 },       // 8 buffers (VOsc consecutive)
  samples:   { start: 100, end: 299 },   // 200 buffers (extracted hits/loops)
  granular:  { start: 300, end: 319 },   // 20 buffers (grain sources)
  reserved:  { start: 320, end: 1023 },  // future use
} as const;

const MAX_BUFFERS = 1024;  // SC default

export class BufferAllocator {
  private allocated = new Map<number, string>();

  allocate(range: keyof typeof BUFFER_RANGES, label: string): number {
    const { start, end } = BUFFER_RANGES[range];
    for (let i = start; i <= end; i++) {
      if (!this.allocated.has(i)) {
        this.allocated.set(i, label);
        return i;
      }
    }
    throw new Error(`Buffer range '${range}' exhausted (${start}-${end})`);
  }

  allocateConsecutive(range: keyof typeof BUFFER_RANGES, count: number, label: string): number {
    const { start, end } = BUFFER_RANGES[range];
    for (let i = start; i <= end - count + 1; i++) {
      const available = Array.from({ length: count }, (_, j) => !this.allocated.has(i + j)).every(Boolean);
      if (available) {
        for (let j = 0; j < count; j++) this.allocated.set(i + j, `${label}[${j}]`);
        return i;
      }
    }
    throw new Error(`Cannot allocate ${count} consecutive buffers in '${range}'`);
  }
}
```

### 4.3.1 Sample Buffer NRT 로드 (b_allocRead)

```typescript
// scripts/lib/sample-utils.ts
export const generateSampleBufferCommands = (
  manifestPath: string,
  allocator: BufferAllocator,
): NrtCommand[] => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const commands: NrtCommand[] = [];

  for (const [type, hits] of Object.entries(manifest)) {
    for (const hit of hits as { file: string }[]) {
      const bufNum = allocator.allocate('samples', hit.file);
      const filePath = path.join(path.dirname(manifestPath), hit.file);
      commands.push({
        time: 0,
        msg: ["/b_allocRead", bufNum, filePath, 0, 0], // full file
      });
    }
  }

  return commands;
};
```

### 4.3.2 synth-stem-map.ts 확장 (NRT 핵심)

> **[P1-1 fix]** 신규 7종 매핑 없이는 NRT에서 전부 무시됨

```typescript
// 기존 SYNTH_STEM_MAP에 추가
export const SYNTH_STEM_MAP: Record<string, StemMapping> = {
  // ... 기존 9종 유지 ...
  // Phase 2 신규 7종
  acid_bass:     { synthDef: "acid_bass",     stem: "bass",  bus: 2 },
  fm_lead:       { synthDef: "fm_lead",       stem: "synth", bus: 4 },
  wavetable_pad: { synthDef: "wavetable_pad", stem: "synth", bus: 4 },
  granular_pad:  { synthDef: "granular_pad",  stem: "synth", bus: 4 },
  layered_kick:  { synthDef: "layered_kick",  stem: "drums", bus: 0 },
  squelch:       { synthDef: "squelch",       stem: "synth", bus: 4 },
  sample_player: { synthDef: "sample_player", stem: "drums", bus: 0 }, // 동적 재라우팅 아래 참조
};

// sample_player 동적 bus 라우팅 — hit type 기반
export const mapSamplePlayerBus = (hitType: string): number => {
  switch (hitType) {
    case 'kick': case 'snare': case 'hat': return 0;  // drums bus
    case 'bass': return 2;                              // bass bus
    case 'fx': return 6;                                // fx bus
    default: return 4;                                  // synth bus
  }
};

// normalizeParams 화이트리스트에 신규 파라미터 추가
// "envDepth", "envDecay", "accent", "slide", "slideTime", "wave", "dist",
// "mRatio", "cRatio", "index", "iScale",
// "morph", "filterCutoff", "filterRes", "detune", "bufBase",
// "buf", "density", "grainDur", "rate", "posRand", "panWidth",
// "subDecay", "bodyDecay", "clickAmp", "bodyFreq", "punch",
// "sweepStart", "sweepEnd", "sweepCurve", "source", "lfoRate", "lfoDepth",
// "startPos", "hpFreq", "lpFreq"
```

### 4.3.3 Wavetable Buffer NRT 파이프라인

```typescript
// NRT Score에 wavetable buffer 할당 메시지 생성
export const generateWavetableCommands = (bufBase: number): NrtCommand[] => {
  const commands: NrtCommand[] = [];
  const bufSize = 2048; // wavetable format = 2x signal size (1024)

  for (let i = 0; i < 8; i++) {
    const bufNum = bufBase + i;
    const numHarmonics = (i + 1) ** 2; // 1, 4, 9, 16, 25, 36, 49, 64

    // b_alloc + b_gen sine1
    commands.push({
      time: 0,
      msg: ["/b_alloc", bufNum, bufSize, 1],
    });

    // Decaying harmonic amplitudes
    const amps = Array.from({ length: numHarmonics }, (_, j) =>
      ((numHarmonics - j) / numHarmonics) ** 2
    );

    commands.push({
      time: 0,
      msg: ["/b_gen", bufNum, "sine1", 7, ...amps], // 7 = normalize + wavetable + clear
    });
  }

  return commands;
};
```

### 4.4 Python 분석 확장 (피치 추적 — 3단 폴백)

> 리서치 출처: torchcrepe (Viterbi decoder, 5ms hop), PESTO (120KB), librosa pyin

```python
# analyze_track.py 확장
def extract_pitch_contour(audio_path, sr=22050):
    """3-tier pitch extraction: torchcrepe → PESTO → pyin."""
    tracker_used = None

    # Tier 1: torchcrepe (최고 정확도, Viterbi 303 글라이드 캡처)
    try:
        import torchcrepe
        import torch
        audio, sr_loaded = torchcrepe.load.audio(audio_path)
        hop_length = int(sr_loaded / 200)  # 5ms hop — 빠른 포르타멘토 디테일

        pitch, periodicity = torchcrepe.predict(
            audio, sr_loaded, hop_length,
            fmin=30, fmax=1000,        # TB-303 + bass range
            model='full',              # 최고 정확도
            device='cpu',              # CUDA 불필요
            batch_size=256,
            return_periodicity=True,
            decoder=torchcrepe.decode.viterbi,  # 303 글라이드 자연 캡처
        )

        # Post-processing
        periodicity = torchcrepe.filter.median(periodicity, win_length=3)
        pitch = torchcrepe.threshold.At(0.21)(pitch, periodicity)
        pitch = torchcrepe.filter.mean(pitch, win_length=3)

        tracker_used = 'torchcrepe'
        return pitch.numpy().flatten(), periodicity.numpy().flatten(), tracker_used
    except ImportError:
        pass

    # Tier 2: PESTO (경량 ML — 120KB 모델, 12x 실시간)
    try:
        import pesto
        import torchaudio
        audio, sr_loaded = torchaudio.load(audio_path)
        timesteps, pitch, confidence, _ = pesto.predict(audio, sr_loaded)
        tracker_used = 'pesto'
        return pitch.numpy().flatten(), confidence.numpy().flatten(), tracker_used
    except ImportError:
        pass

    # Tier 3: librosa pyin (무의존, 내장)
    try:
        audio, sr_loaded = librosa.load(audio_path, sr=sr, mono=True)
        f0, voiced_flag, voiced_probs = librosa.pyin(
            audio, fmin=30, fmax=600, sr=sr,
            frame_length=2048, hop_length=512,
        )
        tracker_used = 'pyin'
        return f0, voiced_probs, tracker_used
    except Exception:
        return None, None, None


def pitch_to_note_events(pitch, confidence, sr=22050, hop_length=512,
                         conf_threshold=0.5, semitone_threshold=1.5):
    """Convert pitch contour to note events with slide detection.
    Uses cents-based comparison (log2) instead of Hz absolute — consistent across octaves."""
    if pitch is None:
        return []

    def semitone_diff(f1, f2):
        """Semitone distance between two frequencies (log2 scale)."""
        if f1 <= 0 or f2 <= 0:
            return float('inf')
        return abs(12 * np.log2(f1 / f2))

    events = []
    current_note = None
    note_start = 0

    for i, (freq, conf) in enumerate(zip(pitch, confidence)):
        time = i * hop_length / sr
        is_voiced = conf > conf_threshold and freq > 0 and not np.isnan(freq)

        if is_voiced:
            if current_note is None:
                current_note = freq
                note_start = time
            elif semitone_diff(freq, current_note) > semitone_threshold:
                # Note change — slide if < 4 semitones (303 glide range)
                is_slide = semitone_diff(freq, current_note) < semitone_threshold * 3
                events.append({
                    "time": round(note_start, 3),
                    "freq": round(current_note, 1),
                    "duration": round(time - note_start, 3),
                    "velocity": round(float(np.mean(confidence[max(0,i-5):i])), 2),
                    "slide": is_slide,
                })
                current_note = freq
                note_start = time
        elif current_note is not None:
            events.append({
                "time": round(note_start, 3),
                "freq": round(current_note, 1),
                "duration": round(time - note_start, 3),
                "velocity": round(float(np.mean(confidence[max(0,i-5):i])), 2),
                "slide": False,
            })
            current_note = None

    return events
```

### 4.5 캘리브레이션 엔진 (calibrate.py)

```python
# audio/analyzer/calibrate.py — 복합 유사도 스코어
def composite_similarity(ref_path, synth_path, sr=22050):
    """Multi-dimensional similarity score. Returns 0-100."""
    y_ref, _ = librosa.load(ref_path, sr=sr)
    y_synth, _ = librosa.load(synth_path, sr=sr)

    scores = {}

    # 1. MFCC + DTW (timbral) — 30%
    mfcc_ref = librosa.feature.mfcc(y=y_ref, sr=sr, n_mfcc=13)
    mfcc_synth = librosa.feature.mfcc(y=y_synth, sr=sr, n_mfcc=13)
    D, wp = librosa.sequence.dtw(X=mfcc_ref, Y=mfcc_synth, metric='cosine')
    scores['mfcc'] = max(0, 1.0 - D[-1, -1] / len(wp)) * 100

    # 2. Spectral convergence — 20%
    min_len = min(len(y_ref), len(y_synth))
    S_ref = np.abs(librosa.stft(y_ref[:min_len]))
    S_synth = np.abs(librosa.stft(y_synth[:min_len]))
    sc = np.linalg.norm(S_ref - S_synth, 'fro') / np.linalg.norm(S_ref, 'fro')
    scores['spectral'] = max(0, (1.0 - sc)) * 100

    # 3. RMS envelope correlation — 20%
    rms_ref = librosa.feature.rms(y=y_ref)[0]
    rms_synth = librosa.feature.rms(y=y_synth)[0]
    min_r = min(len(rms_ref), len(rms_synth))
    env_corr = np.corrcoef(
        rms_ref[:min_r] / (np.max(rms_ref[:min_r]) + 1e-10),
        rms_synth[:min_r] / (np.max(rms_synth[:min_r]) + 1e-10)
    )[0, 1]
    scores['envelope'] = max(0, env_corr) * 100

    # 4. Onset F1 — 15%
    ref_onsets = librosa.onset.onset_detect(y=y_ref, sr=sr, units='time')
    synth_onsets = librosa.onset.onset_detect(y=y_synth, sr=sr, units='time')
    matched = sum(1 for r in ref_onsets
                  if any(abs(r - s) < 0.05 for s in synth_onsets))
    prec = matched / max(len(synth_onsets), 1)
    rec = matched / max(len(ref_onsets), 1)
    f1 = 2 * prec * rec / max(prec + rec, 1e-10)
    scores['attacks'] = f1 * 100

    # 5. Chroma DTW — 15%
    chroma_ref = librosa.feature.chroma_cqt(y=y_ref, sr=sr)
    chroma_synth = librosa.feature.chroma_cqt(y=y_synth, sr=sr)
    D_c, wp_c = librosa.sequence.dtw(X=chroma_ref, Y=chroma_synth, metric='cosine')
    scores['chroma'] = max(0, 1.0 - D_c[-1, -1] / len(wp_c)) * 100

    weights = {'mfcc': 0.30, 'spectral': 0.20, 'envelope': 0.20, 'attacks': 0.15, 'chroma': 0.15}
    total = sum(scores[k] * weights[k] for k in weights)

    return {'total_score': round(total, 1), 'breakdown': scores, 'weights': weights}
```

### 4.6 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 303 필터 | RLPF, MoogFF, RLPFD, DFM1 | **MoogFF + RLPFD 런타임 감지** | MoogFF는 core SC (무조건 가용). RLPFD는 303 전용이나 SC3-plugins 필요. 런타임 감지로 최적 선택 |
| FM 합성 | FM7 (6-op), 2-op SinOsc | **2-op SinOsc** | Core SC만으로 충분. FM7은 SC3-plugins 필수이고 6-op은 과도. 2-op으로 lead 충분 |
| Wavetable | Osc 단일, VOsc morphing | **VOsc 8-buffer morphing** | VOsc가 morph 파라미터 하나로 timbral 변화 제공. NRT Buffer 할당 필수이나 처리 가능 |
| Granular | GrainBuf, GrainSin, TGrains | **GrainBuf** | Buffer 기반으로 demucs stem 재활용 가능. density/dur/rate 독립 제어 |
| 피치 추적 | crepe, torchcrepe, PESTO, pyin, SPICE, Basic Pitch | **torchcrepe → PESTO → pyin 3단 폴백** | torchcrepe: Viterbi 303 글라이드, 최고 정확도. PESTO: 120KB/12x속도. pyin: 무의존 |
| 샘플 하이브리드 | 전체 stem 재생, 개별 히트 추출 | **개별 히트 추출 + sample_player** | onset detection으로 킥/스네어 개별 분리 → 정밀한 합성+샘플 혼합 |
| Kick 합성 | 단순 sine, 3-layer, 5-layer | **3-layer (Formant click + multi-stage env)** | Nathan Ho kick_electro 패턴. Formant click이 noise→HPF보다 풍부 |
| 캘리브레이션 | MFCC only, FAD, MCD, 복합 | **복합 스코어 (5 metrics)** | 단일 지표로 불충분. MFCC(timbre) + spectral(frequency) + envelope(dynamics) + onset(rhythm) + chroma(harmony) |
| presetSchema 확장 | 필수 필드, optional 필드 | **optional (`.optional()`)** | 기존 9종 프리셋 JSON 하위 호환 필수. 신규 SynthDef 파라미터만 optional 추가 |

### 4.7 디렉토리 구조 (변경/신규)

```
audio/
├── sc/synthdefs/
│   ├── bass.scd            # (기존 유지)
│   ├── kick.scd            # (기존 유지)
│   ├── acid_bass.scd       # (신규) MoogFF 303 acid bass
│   ├── fm_lead.scd         # (신규) 2-op FM lead
│   ├── wavetable_pad.scd   # (신규) VOsc morphing pad
│   ├── granular_pad.scd    # (신규) GrainBuf texture
│   ├── layered_kick.scd    # (신규) 3-layer kick (Nathan Ho 패턴)
│   ├── squelch.scd         # (신규) resonant filter sweep + self-oscillation
│   └── sample_player.scd   # (신규) PlayBuf 샘플 재생기
│
├── analyzer/
│   ├── analyze_track.py    # (수정) + pitch_contour 3단 폴백
│   ├── calibrate.py        # (신규) 복합 유사도 스코어
│   ├── sample_extract.py   # (신규) demucs stem → 개별 히트/루프 추출
│   └── requirements.txt    # (수정) + torchcrepe, pesto-pitch 추가

scripts/
├── calibrate.ts            # (신규) CLI — npm run calibrate
├── lib/
│   ├── track-analyzer.ts   # (수정) temporal dynamics + 신규 SynthDef 매핑
│   ├── genre-preset.ts     # (수정) SYNTHDEF_PARAMS 16종 + presetSchema 확장
│   ├── wavetable-utils.ts  # (신규) NRT wavetable buffer commands
│   └── sample-utils.ts     # (신규) 샘플 manifest 파싱 + NRT buffer 로드

out/
└── analysis/{filename}/
    ├── analysis.json       # (기존) + pitch_contour 추가
    ├── samples/            # (신규) 추출된 개별 히트/루프
    │   ├── manifest.json   # 샘플 메타데이터
    │   ├── kick_000.wav
    │   ├── snare_000.wav
    │   ├── hat_000.wav
    │   ├── bass_000.wav
    │   └── fx_000.wav
    ├── calibration.json    # (신규) 복합 유사도 스코어
    └── ...                 # (기존) stems/, preset.json, patterns.tidal
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | SC3-plugins 미설치 | MoogFF 폴백. acid_bass 정상 동작 (품질 다소 저하) | P2 |
| E2 | torchcrepe + PESTO + pyin 3단 폴백 전부 미설치 | pitch_contour=null + warning. 노트 이벤트 생성 skip | P2 |
| E3 | VOsc 버퍼 할당 실패 (NRT) | wavetable_pad skip + warning. pad SynthDef로 폴백 | P2 |
| E4 | GrainBuf buffer 미로드 | granular_pad skip + warning. pad SynthDef로 폴백 | P2 |
| E5 | demucs bass stem 부재 | pitch contour를 원본 오디오에서 추출 (정확도 저하) | P3 |
| E6 | 캘리브레이션 입력 길이 불일치 | min length로 자동 정렬 | P3 |
| E7 | accent 패턴 추출 실패 | 모든 노트 accent=0 (기본값) | P3 |
| E8 | MoogFF resonance > 4.0 | clip(0, 3.9) — self-oscillation 방지 | P2 |
| E9 | 기존 프리셋 JSON에 신규 SynthDef 필드 없음 | optional이므로 정상 로드. 신규 SynthDef는 기본값 사용 | P3 |
| E10 | pitch contour에 unvoiced 구간 과다 | confidence threshold (0.5) 이하 프레임 무시 | P3 |
| E11 | wavetable morph=0 또는 1 정확히 | bufBase 또는 bufBase+7 정확히 매핑 (경계값 안전) | P3 |
| E12 | calibrate 무음/극저에너지 입력 | score=0 + warning. `norm(S_ref) < 1e-10` 시 early return | P2 |
| E13 | sample_player buf 미할당 (buf=sentinel -1) | PlayBuf skip + warning. 합성 SynthDef 폴백 | P2 |
| E14 | drum stem에서 onset 0개 (빈 스템) | 빈 manifest + sample_player skip. 합성 100% 폴백 | P2 |
| E15 | Buffer index 충돌 (wavetable vs sample) | BufferAllocator range partition으로 방지 (§4.3) | P1 |
| E16 | bufBase > 1016 (VOsc 8개 초과 가능 범위) | `bufBase + 7 >= MAX_BUFFERS` 가드. 에러 throw | P2 |
| E17 | 샘플 추출 수백 개 (긴 드럼 스템) | MAX_HITS_PER_TYPE=32 제한. 초과 시 에너지 상위 32개만 보존 | P2 |

## 6. Security & Permissions

- SynthDef `.scd` 파일: 로컬 전용, execFile array-form 호출 (기존 패턴)
- calibrate.py: 로컬 전용, 외부 네트워크 접근 없음
- torchcrepe: PyTorch 의존. pip install 시 사용자 확인 권장
- wavetable Buffer: NRT Score 내 메시지로만 생성 (실시간 서버 불필요)
- 기존 validateFilePath 재사용

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| acid_bass NRT 렌더 (1 bar, 8 notes) | < 2초 | time 측정 |
| wavetable Buffer 할당 (8 buffers) | < 0.5초 | NRT Score 시작 시간 |
| pitch contour 추출 (5분 stem, torchcrepe) | < 30초 (CPU) | time 측정 |
| pitch contour 추출 (5분 stem, pyin 폴백) | < 10초 | time 측정 |
| 캘리브레이션 (5분 트랙 pair) | < 20초 | time 측정 |
| 전체 분석 + pitch (demucs 제외) | < 90초 | time 측정 |
| 메모리 (torchcrepe tiny model) | < 500MB | Activity Monitor |

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- **SynthDef 파라미터 검증**: 각 신규 SynthDef의 SYNTHDEF_PARAMS 등록 + synthParamSchema 통과
- **presetSchema 확장**: 기존 프리셋 하위 호환 + 신규 필드 optional 검증
- **매핑 함수**: mapAcidBass, mapFmLead, mapWavetable, mapGranular, mapLayeredKick, mapSquelch
- **temporal dynamics**: 섹션별 파라미터 분기 (drop→bass heavy, break→pad dominant)
- **accent 패턴**: onset strength → accent position 변환
- **wavetable commands**: generateWavetableCommands 출력 형식 검증
- **pitch → note events**: pitch contour → note event 변환 + slide 감지

### 8.2 Integration Tests
- **SynthDef NRT 렌더**: 각 6종 SynthDef로 NRT 렌더 → WAV 출력 존재 + > 0 bytes
- **acid_bass + MoogFF**: 실제 sclang 실행 + MoogFF SynthDef 컴파일 확인
- **wavetable NRT**: Buffer 할당 + VOsc 렌더 → WAV 출력
- **granular NRT**: Buffer 로드 + GrainBuf 렌더 → WAV 출력
- **캘리브레이션**: 동일 파일 pair → score ≈ 100. 무관 파일 → score < 50
- **기존 1332+ 테스트 regression 0**

### 8.3 Edge Case Tests
- SC3-plugins 미설치 시 MoogFF 폴백 동작
- torchcrepe/pyin 미설치 시 graceful skip
- 기존 프리셋 JSON (신규 필드 없음) 로드 성공
- VOsc morph 경계값 (0, 1) 정상 동작

## 9. Rollout Plan

| Step | 내용 | Size | 의존 |
|------|------|------|------|
| T1 | presetSchema 확장 + **synth-stem-map.ts** 확장 + **BufferAllocator** (SYNTHDEF_PARAMS 16종, SYNTH_STEM_MAP 16종, normalizeParams 화이트리스트, Buffer range partition) | L | — |
| T2 | acid_bass SynthDef + MoogFF/RLPFD 런타임 감지 | L | T1 |
| T3 | fm_lead SynthDef | S | T1 |
| T4 | layered_kick SynthDef (Nathan Ho 3-layer: Formant click + multi-stage env) | M | T1 |
| T5 | squelch SynthDef (MoogFF self-oscillation + DFM1 업그레이드) | S | T1 |
| T6 | wavetable_pad SynthDef + NRT Buffer 파이프라인 (VOsc 8-buf) | M | T1 |
| T7 | granular_pad SynthDef + Buffer 로드 | M | T1 |
| T8 | sample_player SynthDef + sample_extract.py (demucs stem → 개별 히트 추출) | L | T1 |
| T9 | pitch contour 추출 (torchcrepe → PESTO → pyin 3단 폴백) | M | — |
| T10 | temporal dynamics 매핑 재설계 (섹션별 분기 + envelope following + accent 추출) | L | T1, T2, T9 |
| T11 | 캘리브레이션 프레임워크 (calibrate.py + calibrate.ts, 5-metric 복합 스코어) | M | — |
| T12 | 기존 장르 프리셋 업데이트 (신규 SynthDef + 샘플 하이브리드 파라미터) | S | T1-T8 |
| T13 | sample-utils.ts (manifest 파싱 + NRT buffer 로드 + 하이브리드 stemGroup 해석) | M | T8 |
| T14 | E2E: 레퍼런스 분석 → 샘플 추출 → 프리셋 생성 → NRT 렌더 → 캘리브레이션 | L | ALL |

### 9.1 Rollback Plan
1. 신규 SynthDef `.scd` 파일 삭제 (7개)
2. genre-preset.ts: SYNTHDEF_PARAMS에서 7종 제거, presetSchema optional 필드 제거
3. track-analyzer.ts: temporal dynamics 코드 revert
4. analyze_track.py: pitch_contour 코드 제거
5. calibrate.py / sample_extract.py / calibrate.ts / wavetable-utils.ts / sample-utils.ts 삭제
6. package.json에서 calibrate 스크립트 제거
7. out/analysis/*/samples/ 디렉토리 제거

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Type | Status | Risk if Missing |
|-----------|------|--------|-----------------|
| MoogFF UGen | Core SC | 내장 | 없음 (항상 가용) |
| RLPFD/DFM1 | SC3-plugins (선택) | 설치 필요 | MoogFF 폴백. 품질 소폭 저하 |
| torchcrepe | pip (선택) | 설치 필요 | PESTO → pyin 2단 폴백. 정확도 점진 저하 |
| PESTO | pip (선택) | 설치 필요 | pyin 폴백. 120KB 경량 ML |
| librosa pyin | librosa 내장 | 가용 | 없음 |
| VOsc/GrainBuf | Core SC | 내장 | 없음 |
| Phase 1 완료 | PRD-track-analyzer | 완료 | 없음 |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| MoogFF 음질이 RLPFD 대비 부족 | 중간 | 중간 | SC3-plugins 설치 가이드 + 런타임 감지 |
| torchcrepe 설치 복잡 (PyTorch) | 중간 | 낮음 | PESTO (120KB) → pyin (librosa 내장) 3단 폴백 |
| NRT wavetable Buffer 타이밍 이슈 | 낮음 | 중간 | Score 시작 시 (time=0) 모든 Buffer 사전 할당 |
| 캘리브레이션 스코어가 주관적 품질과 불일치 | 중간 | 중간 | 가중치 조정 가능. A/B 테스트로 검증 |
| granular_pad buffer 메모리 부족 | 낮음 | 낮음 | Buffer 크기 제한 (10초 / 44100Hz) |
| 기존 테스트 regression | 낮음 | 높음 | optional 필드 + 하위 호환 설계 |
| acid_bass accent 패턴이 원곡과 불일치 | 높음 | 중간 | onset strength threshold 조정 가능 |

## 11. Success Metrics

| Metric | Baseline (Phase 1) | Target (Phase 2) | Measurement |
|--------|-------------------|-------------------|-------------|
| `synthesis_only_score` | 30-50 (추정) | **75-85** | composite_similarity(mode='synthesis') |
| `hybrid_score` | N/A | **98** | composite_similarity(mode='hybrid') |
| SynthDef 종류 | 9종 | **16종** (9 기존 + 7 신규) | `ls audio/sc/synthdefs/*.scd` |
| 사운드 소스 | 합성만 | **합성 + 샘플 하이브리드** | stemGroups 하이브리드 |
| acid bass 재현 | 불가 (SynthDef 없음) | **가능** (MoogFF 303 + accent + slide) | NRT 렌더 + 청취 |
| FM lead 재현 | 불가 | **가능** (2-op FM + mod index env) | NRT 렌더 + 청취 |
| 킥 품질 | 단순 sine | **3-layer** (Formant click + multi-stage) | NRT 렌더 + 청취 |
| 피치 추적 | 불가 | **3단 폴백** (torchcrepe/PESTO/pyin) | note events JSON |
| 매핑 방식 | 정적 (전곡 평균) | **동적** (섹션별 + envelope + accent + NRT 적용) | sections[] + n_set |
| 샘플 활용 | 없음 | **demucs stem → 개별 히트 추출 + PlayBuf** | manifest.json |
| 벤치마크 | 없음 | **5곡 고정 세트 + LUFS 정규화 + MOS** | calibration report |
| 테스트 | 64 (Phase 1) | **64 + 100+ (신규)** = 164+ | vitest 결과 |

## 12. Open Questions

- [ ] OQ-1: SC3-plugins 설치 가이드 — macOS (Homebrew? 수동 빌드?) 최적 경로 결정 필요
- [ ] OQ-2: 캘리브레이션 가중치 최적화 — 실제 A/B 테스트로 조정 필요 (현재 가중치는 문헌 기반 초기값)
- [ ] OQ-3: granular_pad에 demucs stem 직접 로드 vs 별도 sample buffer — 메모리/성능 트레이드오프
- [ ] OQ-4: torchcrepe 'tiny' vs 'full' 모델 — 정확도 vs 속도 트레이드오프 (실측 필요)
- [ ] OQ-5: temporal dynamics 매핑의 sections granularity — 4섹션(intro/build/drop/outro) vs 더 세분화

---

## Changelog
### v0.4 (2026-03-27) — Boomer 수렴 루프 Round 2 (5건 스펙 일관성 수정)
- **[fix]** AC-9.3 dual-score 스키마 통일: `{synthesis_only_score, hybrid_score, mode, breakdown, lufs_normalized}`
- **[fix]** slide 감지 단위 통일: AC-7.4 + AC-12.6 + §4.4 모두 `1.5 semitones` (cents 기반 `12*log2(f1/f2)`)
- **[fix]** edge case E2 + risk 테이블 + dependencies 전부 3단 폴백 (torchcrepe→PESTO→pyin) 반영
- **[fix]** manifest naming 규약: 키 단수형 (`kick`, `snare`, `hat`, `bass`, `fx`). stemGroups 레퍼런스 `"sample_player:{type}_{NNN}"`
- **[fix]** AC-10.7 신규: synth-stem-map.ts 완전 계약 (SYNTH_STEM_MAP 16종, SUPPORTED_SYNTHDEFS 16, normalizeParams, mapSamplePlayerBus, E2E assertion 업데이트)

### v0.3 (2026-03-27) — Phase 2 팀 리뷰 Round 1 수정 (P0×1 + P1×6 + P2×6 해결)
- **[P0-1 fix]** 캘리브레이션 이중 스코어: `synthesis_only_score` (75-85) + `hybrid_score` (**98** 목표). 벤치마크 5곡 + LUFS 정규화 + MOS 청취 평가
- **[P1-1 fix]** `synth-stem-map.ts` 완전 추가 — SYNTH_STEM_MAP 16종, SUPPORTED_SYNTHDEFS 16, normalizeParams 화이트리스트, sample_player 동적 bus 라우팅
- **[P1-2 fix]** Buffer Allocation Strategy — BufferAllocator 클래스 + range partition (wavetable:0-7, samples:100-299, granular:300-319)
- **[P1-3 fix]** calibrate.ts validateFilePath 명시 + 무음 입력 early return
- **[P1-4 fix]** Temporal dynamics NRT 렌더 경로 — sections → osc-to-nrt.ts n_set 메시지 + Tidal 섹션별 블록
- **[P1-5 fix]** 벤치마크 프로토콜: 5곡 고정 세트 + LUFS 정규화 (EBU R128 -14) + 인간 청취 평가 MOS
- **[P2-1 fix]** sample_player 동적 bus: mapSamplePlayerBus(hitType) — kick→0, bass→2, fx→6
- **[P2-2 fix]** NRT b_allocRead 명세: generateSampleBufferCommands() + BufferAllocator 연동
- **[P2-3 fix]** slide 감지 Hz → semitone 기반 (12 * log2(f1/f2) > threshold)
- **[P2-4 fix]** US-7 AC-7.7 → US-12 3단 폴백 위임
- **[P2-5 fix]** AC-6.2 squelch 파라미터 lfoRate/lfoDepth 추가
- **[P2-6 fix]** calibrate 무음 입력 edge case E12 추가
- Edge cases E12-E17 추가 (6건)
- T1 범위 확장: synth-stem-map.ts + BufferAllocator 포함

### v0.2 (2026-03-27) — 리서치 보강 + 샘플 하이브리드
- **US-11 추가**: 샘플 하이브리드 — demucs stem → 개별 히트/루프 추출 + sample_player SynthDef
- **US-12 추가**: 피치 추적 3단 폴백 (torchcrepe → PESTO → pyin)
- **SynthDef 7종** (6→7): sample_player 추가. 기존 9 + 신규 7 = 16종 총합
- **layered_kick 보강**: Nathan Ho kick_electro 패턴 (Formant click, multi-stage pitch env, Hasher NRT-safe noise)
- **squelch 보강**: MoogFF self-oscillation + DFM1 SC3-plugins 업그레이드 옵션 + LFO 모듈레이션
- **14 티켓** rollout plan (T1-T14)
- 디렉토리 구조: sample_extract.py, sample-utils.ts, out/samples/ 추가

### v0.1 (2026-03-27) — 초안
- Phase 2 범위 정의: SynthDef 6종 + 피치 추적 + 매핑 재설계 + 캘리브레이션
- 웹 리서치 기반 기술 설계: MoogFF(303), 2-op FM, VOsc wavetable, GrainBuf, 복합 스코어
- 12 티켓 rollout plan (T1-T12)
