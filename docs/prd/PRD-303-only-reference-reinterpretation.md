# PRD: 303-Only Reference Reinterpretation Pipeline

**Version**: 0.2
**Author**: Isaac (via Codex)
**Date**: 2026-04-03
**Status**: Draft
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background
현재 오디오 파이프라인은 레퍼런스 오디오를 분석한 뒤 SuperCollider SynthDef와 샘플을 조합해 재합성한다. 그러나 사용 목표가 "어떤 레퍼런스를 넣어도 303 sample만 써서 재창작"이라면, 현 구조는 제품 정의부터 다시 맞춰야 한다.

이미 저장소에는 [`audio/samples/303`](/Users/isaac/WebstormProjects/video-art/audio/samples/303) 샘플 뱅크와 생성 스크립트 [`audio/samples/303/generate.py`](/Users/isaac/WebstormProjects/video-art/audio/samples/303/generate.py)가 존재한다. 다만 현재 뱅크는 Cm 기반의 제한된 음계, 부분적인 slide, 적은 FX만 제공하며, 현재 렌더 파이프라인은 여전히 `acid_bass`, `sample_player`, 기타 SynthDef 혼합 사용을 전제로 설계되어 있다.

### 1.2 Product Definition
이 기능은 "레퍼런스 트랙을 303로 정확 복제"하는 제품이 아니다. 제품 정의는 다음과 같다.

`임의의 레퍼런스 오디오를 303-only 사운드 언어로 번역하여, 원본의 groove, contour, energy, arrangement를 유지하되 결과물은 명확히 acid/303 aesthetic을 갖는 재해석 작품으로 출력한다.`

### 1.3 Problem Definition
현재 저장소에는 아래 공백이 있다.

1. 레퍼런스를 303가 표현 가능한 제어 신호로 압축하는 중간 표현(IR)이 없다.
2. 현재 분석기는 BPM, pitch, structure에서 상업 수준의 신뢰도를 보장하지 못한다.
3. 303 샘플 뱅크에 크로매틱 커버리지, 메타데이터, pseudo-percussion 계층이 부족하다.
4. 기존 sample manifest 소비자 코드는 단순 `type -> hit[]` 구조를 전제로 하며, rich 303 bank manifest와 직접 호환되지 않는다.
5. 현재 `sample_player`는 mono one-shot 재생기라 sustain, legato, crossfade release, slide semantics를 commercial 수준으로 보장하지 못한다.
6. "303 sample only"를 강제하는 렌더 모드가 없다.
7. 기존 `calibrate.py`는 full-spectrum 유사도 중심이라 303 재해석 품질을 올바르게 평가하지 못한다.

### 1.4 Impact of Not Solving
- 303-only 모드를 구현해도 결과물이 단순 bassline 또는 루프 수준에 머무른다.
- "어떤 레퍼런스든" 처리한다는 요구를 만족하지 못한다.
- 상업적 수준의 repeatability, explainability, quality gate를 확보할 수 없다.
- 창작물의 일관된 제품 정체성도 확보되지 않는다.

## 2. Goals & Non-Goals

### 2.1 Goals
- G1: 임의의 레퍼런스 오디오를 분석해 303-only 재해석에 필요한 추상 표현으로 변환한다.
- G2: 출력 오디오가 오직 [`audio/samples/303`](/Users/isaac/WebstormProjects/video-art/audio/samples/303) 기반 샘플 재생만 사용하도록 보장한다.
- G3: 원본의 BPM, 주요 phrase contour, section energy, rhythmic density를 유지한다.
- G4: bass, riff, chirp, pseudo-hat, fx 등 최소 4개 이상의 303 역할 레이어를 자동 생성한다.
- G5: 샘플 뱅크를 크로매틱/메타데이터 기반으로 확장해 모든 키에 대응한다.
- G6: rich 303 manifest를 도입하되 기존 hybrid/sample 경로와의 migration adapter를 제공한다.
- G7: 결과물을 기존 출력 체인과 연결 가능한 CLI 파이프라인으로 제공한다.
- G8: 303 playback semantics를 명시한 전용 sample player v2를 제공한다.
- G9: commercial gate를 위한 domain-specific 평가 지표와 golden benchmark를 구축한다.

### 2.2 Non-Goals
- NG1: 보컬, 코드 스택, 어쿠스틱 드럼을 원본 그대로 재현하지 않는다.
- NG2: 909, 외부 샘플팩, 외부 신디사이저, AU/VST를 사용하지 않는다.
- NG3: 실시간 performance/live engine을 목표로 하지 않는다. 우선순위는 offline render다.
- NG4: end-to-end 생성형 모델 학습을 이번 범위에 포함하지 않는다.
- NG5: 저작권 회피용 "복제 엔진"을 만들지 않는다. 결과물은 명확한 재해석이어야 한다.

## 3. User Stories & Acceptance Criteria

### US-1: Reference Abstraction
**As a** creator, **I want** 레퍼런스 오디오가 303-friendly control signal로 분석되길 원한다, **so that** 렌더러가 악기 종류가 다른 곡도 일관되게 303로 번역할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: 분석 결과에 `bpm`, `key/root`, `sections`, `macro energy`, `role contours`, `accent`, `slide`, `density`가 포함된다.
- [ ] AC-1.2: benchmark set에서 BPM absolute error median <= 1.0 BPM.
- [ ] AC-1.3: synthetic mono pitch test에서 principal voice note-event F1 >= 0.90.
- [ ] AC-1.4: structure boundary mean error <= 1 bar on labeled benchmark.
- [ ] AC-1.5: 각 분석 필드는 `value`, `confidence`, `source`, `warnings` 또는 동등한 상태 정보를 가진다.

### US-2: 303 Sample Bank Readiness
**As a** renderer, **I want** 303 sample bank가 모든 키와 역할을 안정적으로 커버하길 원한다, **so that** nearest-note artifacts와 repetitive output을 줄일 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: 샘플 뱅크가 최소 `C1`~`C5` 크로매틱 커버리지를 제공한다.
- [ ] AC-2.2: 각 note에 대해 최소 `normal`, `accent`, `long`, `stab`, `squelch` articulation이 존재한다.
- [ ] AC-2.3: saw/square 모두 지원한다.
- [ ] AC-2.4: slide bank가 상행/하행 주요 interval을 커버하고, 미지원 interval은 deterministic fallback 규칙을 가진다.
- [ ] AC-2.5: pseudo-hat/click/zap/chirp/sweep 등 percussion/fx용 303-derived 샘플이 존재한다.
- [ ] AC-2.6: 샘플 메타데이터 manifest가 자동 생성되며 root note, waveform, articulation, role tags, duration, loudness를 포함한다.
- [ ] AC-2.7: manifest v2 reader가 기존 manifest v1 경로와 공존 가능하다.

### US-3: 303-Only Arrangement Compiler
**As a** producer, **I want** 레퍼런스가 bass/riff/fx 중심의 acid arrangement로 변환되길 원한다, **so that** 결과물이 단순 tone replacement가 아니라 음악적으로 완결된다.

**Acceptance Criteria:**
- [ ] AC-3.1: 컴파일 결과가 최소 `bass`, `riff`, `top/chirp`, `fx` 역할을 생성한다.
- [ ] AC-3.2: 에너지와 섹션에 따라 레이어 density가 달라진다.
- [ ] AC-3.3: `accent`와 `slide`가 pitch contour 또는 onset accent에서 파생된다.
- [ ] AC-3.4: pitch 정보가 약한 경우 root+5th 또는 root+octave fallback이 deterministic하게 적용된다.
- [ ] AC-3.5: 동일 입력에서 동일 seed 기준 완전히 동일한 이벤트 타임라인이 생성된다.

### US-4: 303-Only Rendering
**As a** developer, **I want** 렌더 모드가 non-303 synth를 완전히 배제하길 원한다, **so that** 제품 정체성이 무너지지 않는다.

**Acceptance Criteria:**
- [ ] AC-4.1: 303-only 모드에서는 `sample_player` 또는 전용 303 sample renderer만 사용하고 `acid_bass`, `layered_kick`, 기타 SynthDef를 사용하지 않는다.
- [ ] AC-4.2: 렌더 score/manifest에서 모든 소스 파일이 `audio/samples/303` 하위 경로만 참조한다.
- [ ] AC-4.3: role별 stem 또는 bus 분리가 가능하다.
- [ ] AC-4.4: 출력은 44.1kHz stereo master.wav와 optional stems를 생성한다.
- [ ] AC-4.5: playback engine은 transposition, long-note sustain, crossfade release, slide fallback semantics를 명시적으로 지원한다.

### US-5: Commercial Quality Gate
**As a** product owner, **I want** 결과물이 domain-appropriate quality gate를 통과하길 원한다, **so that** 반복적으로 품질을 관리할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: 303-domain evaluator가 groove, contour, section shape, density, filter-motion 유사도를 산출한다.
- [ ] AC-5.2: benchmark set에서 overall reinterpretation score >= 75/100.
- [ ] AC-5.3: 출력 loudness target은 -16 ~ -12 LUFS, peak <= -0.3 dBFS.
- [ ] AC-5.4: 3명 이상의 내부 청취자 평가에서 "usable / release-adjacent" 비율 >= 70%.
- [ ] AC-5.5: listening protocol, fixture set, rubric이 문서화되어 재실행 가능하다.

## 4. Technical Design

### 4.1 Architecture Overview

```text
Reference Audio
   ↓
Reference Abstractor
   - beat / bpm
   - root / key
   - structure
   - principal contour
   - accent / slide / density
   - macro energy / cutoff motion
   ↓
303 Composition IR
   - sections
   - roles: bass, riff, chirp, pseudo_hat, fx
   - note events
   - articulation tags
   - automation curves
   ↓
303 Sample Bank Selector
   - manifest lookup
   - nearest articulation selection
   - slide resolution
   - round robin / fallback
   ↓
303-Only Renderer
   - sample scheduling only
   - optional stems
   - mastering
   ↓
303 Domain Evaluator
   - groove / contour / density / shape
   - loudness / peak / technical checks
```

### 4.2 Core Principle
레퍼런스를 "소리의 정답"으로 다루지 않고, 아래 제어 신호로 분해한다.

- Rhythm: beat grid, syncopation, onset density, swing
- Pitch: monophonic principal contour, register, leap profile
- Articulation: accent probability, note length, slide probability
- Macro: section energy, build/drop intensity, centroid motion
- Role mapping: bass anchor, riff mover, chirp percussion, fx transition

### 4.3 Proposed Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| BPM hardener | `audio/analyzer/analyze_track.py` 또는 후속 분리 모듈 | BPM ensemble + confidence 안정화 |
| Pitch/structure hardener | `audio/analyzer/analyze_track.py` 또는 후속 분리 모듈 | principal contour / structure / macro 안정화 |
| 303 bank builder | `audio/samples/303/generate.py` + 신규 manifest generator | 샘플 생성/정규화/메타데이터 |
| Manifest adapter | `scripts/lib/sample-utils.ts`, `scripts/lib/hybrid-render.ts` | manifest v1/v2 dual-compat |
| 303 bank manifest | `audio/samples/303/manifest.json` | root/articulation/role lookup |
| 303 sample player v2 | `audio/sc/synthdefs/sample_player.scd` 또는 신규 모듈 | sustain / transposition / release / slide semantics |
| Composition IR compiler | 신규 TS 모듈 (`scripts/lib/303-compiler.ts`) | analysis -> 303 event plan |
| 303-only renderer | 신규 entry (`scripts/render-303.ts`) | sample scheduling only |
| Evaluator | 기존 `calibrate.py` 확장 또는 신규 모듈 | 303-specific scoring |

### 4.4 Data Model

#### Reference Abstraction JSON

```json
{
  "version": 1,
  "source": "audio/input/example.wav",
  "bpm": { "value": 142.1, "confidence": 0.94, "source": "ensemble" },
  "root": { "value": "C", "mode": "minor", "confidence": 0.71 },
  "sections": [
    { "start": 0.0, "end": 16.9, "label": "intro", "energy": 0.28 },
    { "start": 16.9, "end": 49.2, "label": "drop", "energy": 0.91 }
  ],
  "roles": {
    "bass": { "note_events": [], "confidence": 0.88 },
    "riff": { "note_events": [], "confidence": 0.64 },
    "top": { "density_curve": [], "confidence": 0.53 }
  },
  "macro": {
    "energy_curve": [],
    "cutoff_curve": [],
    "density_curve": []
  },
  "warnings": []
}
```

#### 303 Sample Manifest

```json
{
  "version": 2,
  "id": "C3_saw_accent_rr1",
  "file": "audio/samples/303/C3_saw_accent_rr1.wav",
  "root_note": "C3",
  "midi": 48,
  "waveform": "saw",
  "articulation": "accent",
  "role_tags": ["bass", "riff"],
  "duration_ms": 450,
  "lufs": -17.8,
  "centroid_hz": 1840,
  "slide": null,
  "round_robin": 1
}
```

#### Manifest Migration Principle

- manifest v2는 canonical 303 bank metadata 포맷이다.
- 기존 hybrid/sample path를 위해 v1 reader를 유지하거나 v2 -> v1 adapter를 제공한다.
- migration 기간 동안 `sample-utils`와 관련 호출부는 dual-compat여야 한다.

#### Composition IR

```json
{
  "version": 1,
  "mode": "303_only",
  "bpm": 142,
  "root_midi": 48,
  "voices": [
    { "role": "bass", "events": [] },
    { "role": "riff", "events": [] },
    { "role": "pseudo_hat", "events": [] },
    { "role": "fx", "events": [] }
  ],
  "automation": {
    "master_energy": [],
    "filter_open": []
  }
}
```

### 4.5 Rendering Rules
- 기본 오디오 소스는 오직 303 sample manifest에서 선택한다.
- root mismatch가 발생하면 nearest-note selection + resample ratio를 적용한다.
- slide가 있으면 dedicated slide sample을 우선 사용한다.
- slide sample이 없으면 start note + end note overlap/crossfade + pitch-ramped resample fallback을 사용한다.
- percussion/top lane은 303-derived click/chirp/noise artifacts로 구성한다.
- 섹션별 density와 articulation 분포를 달리해 반복감을 줄인다.

### 4.6 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Product framing | clone / reinterpret | reinterpret | 303-only 조건에서는 원본 복제보다 번역형 제품 정의가 정확함 |
| Sound source | SC synth + samples / samples only | samples only | 사용자 요구를 명시적으로 충족 |
| Pitch strategy | full polyphony / principal monophonic reduction | principal reduction | 303는 본질적으로 monophonic voice에 적합 |
| Evaluation | 기존 full-spectrum similarity / 303-domain evaluator | 303-domain evaluator | 재해석 품질을 더 잘 측정 |
| Bank coverage | scale-limited + heavy resample / chromatic bank | chromatic bank | 상업 수준 일관성에 유리 |
| Manifest migration | big-bang replace / dual-compat adapter | dual-compat adapter | 기존 hybrid/sample tooling 회귀를 줄임 |
| Playback engine | current sample_player patch / player v2 contract | player v2 contract | one-shot 엔진으로는 phrase realism을 보장하기 어려움 |
| Analyzer stabilization | single catch-all task / split by metric family | split by metric family | regression 원인 추적이 쉬움 |

### 4.7 Implementation Order

| Step | File(s) | Description | Dependency |
|------|---------|-------------|------------|
| T1 | `scripts/lib/sample-utils.ts`, `scripts/lib/hybrid-render.ts` | manifest v2 계약 고정 + migration adapter | None |
| T2 | `audio/samples/303/generate.py` | chromatic 303 bank 확장 + loudness 정규화 | T1 |
| T3 | `audio/samples/303/generate.py` + manifest generator | percussion/fx bank + variation 레이어 | T1 |
| T4 | `audio/sc/synthdefs/sample_player.scd` 또는 신규 모듈 | 303 sample player v2 | T1 |
| T5 | `audio/analyzer/analyze_track.py` | BPM ensemble + confidence hardening | None |
| T6 | `audio/analyzer/analyze_track.py` | pitch/structure abstraction hardening | None |
| T7 | 신규 abstractor/IR compiler | reference abstraction JSON + composition IR | T1, T5, T6 |
| T8 | 신규 `scripts/render-303.ts` | deterministic 303 arranger + render-303 CLI | T2, T3, T4, T7 |
| T9 | mastering chain | 303-only 출력 loudness/peak normalization + technical QC | T8 |
| T10 | evaluator + benchmark | 303-domain score + regression suite | T7, T8 |
| T11 | release ops | commercial listening gate + release checklist | T9, T10 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | polyphonic reference with dense chords | principal line + density abstraction으로 축약, chord cloning 시도 금지 | Medium |
| E2 | pitch contour confidence low | root+5th deterministic fallback + warning | High |
| E3 | slide interval not present in bank | crossfade/pitch-ramp fallback + confidence 감소 기록 | Medium |
| E4 | unsupported key or modulation | nearest chromatic support + local transposition | Medium |
| E5 | reference is ambient/non-rhythmic | macro-texture mode로 전환, percussion lane 축소 | Low |
| E6 | sample manifest missing fields | renderer hard fail, build step에서 validation error | High |
| E7 | output becomes too repetitive | round robin/articulation alternation 적용, repetitive score warning | Medium |
| E8 | requested note out of bank range | octave-shift fallback 우선, 그 후 resample | Medium |
| E9 | manifest v2 rollout으로 기존 hybrid path가 깨짐 | dual-reader/adapter 유지, migration test 추가 | High |
| E10 | long note playback에서 클릭/부자연스러운 tail 발생 | player v2 contract에서 sustain/release semantics 강제 | High |

## 6. Security, Legal, and Product Boundaries

- 외부 서비스/API 의존 없음. 로컬 처리만 가정.
- 결과물은 "재해석"이며, original arrangement detail의 무비판적 복제는 목표가 아니다.
- 303-only mode는 명시적으로 source limitation을 걸어 제품 정체성과 법적 설명 가능성을 높인다.

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 5분 reference abstraction | < 90s | analyzer wall time |
| 30초 render | < 20s | render-303 wall time |
| full pipeline (30초 output) | < 120s | end-to-end wall time |
| bank validation | < 5s | manifest build time |

### 7.1 Monitoring
- analyzer warnings count
- missing sample fallbacks count
- nearest-note fallback ratio
- slide fallback ratio
- rendered role count
- LUFS / peak / RMS
- manifest adapter fallback count
- long-note playback artifact count

## 8. Testing Strategy

### 8.1 Unit Tests
- manifest v1/v2 dual-reader compatibility
- BPM cross-validation: `70`, `90`, `124`, `140`, `174` BPM fixtures
- pitch-to-note-events: sustained final note flush, slide detection, silence handling
- structure detection: long-form techno, short clip, uniform energy, sparse ambient
- sample manifest validation: duplicate ids, missing tags, loudness bounds
- note selection: exact match, nearest note, slide fallback, octave fallback
- player v2: sustain, release, transposition, slide fallback

### 8.2 Integration Tests
- reference abstraction -> composition IR generation
- composition IR -> NRT score generation with 303-only sources
- render -> master loudness/peak gate
- manifest regeneration -> renderer compatibility
- manifest migration -> 기존 hybrid/sample path compatibility

### 8.3 End-to-End Tests
- `void-acid-carousel` style reference
- non-acid house reference
- DnB/high-tempo reference
- sparse ambient reference

### 8.4 Listening Tests
- internal 3-listener blind comparison:
  - groove preserved?
  - acid identity strong?
  - repetition acceptable?
  - release-adjacent quality?
- fixture set, rubric, fail 조건을 문서화하여 재실행 가능해야 한다.

## 9. Rollout Plan

### 9.1 Phase 1: Foundation
- manifest migration adapter
- expand 303 bank
- build sample manifest
- define sample player v2 contract
- split analyzer hardening

### 9.2 Phase 2: Product Path
- implement composition IR
- implement render-303 CLI
- add 303-only rendering gate

### 9.3 Phase 3: Quality
- domain evaluator
- benchmark automation
- listening loop and tuning

## 10. Dependencies & Risks

### 10.1 Dependencies

| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| `numpy/librosa/scipy/soundfile` | Python env | Existing | analyzer and bank tools blocked |
| `sample_player` SynthDef or equivalent NRT player | Audio pipeline | Existing but insufficient as-is | render-303 blocked |
| 303 sample generator | Local repo | Existing seed version | bank coverage insufficient |
| benchmark references + labels | Product/dev | Partial | quality gate weak |
| manifest migration adapter | Runtime tooling | Missing | existing hybrid/sample path regression risk |

### 10.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 303-only output sounds too repetitive | High | High | round robin, articulation variety, density automation |
| analyzer still overfits techno references | Medium | High | genre-diverse benchmark and no hard-coded BPM priors |
| sample bank expansion balloons file count | Medium | Medium | generated manifest + deterministic naming + validation |
| evaluator rewards cloning over reinterpretation | Medium | High | domain-specific metrics + listening tests |
| slide realism remains weak | Medium | Medium | dedicated slide bank + overlap fallback tuning |
| manifest migration breaks existing sample workflows | High | High | dual-compat adapter + migration regression suite |
| current player semantics cap commercial quality | High | High | player v2 contract + dedicated playback tests |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| BPM median absolute error | unstable | <= 1.0 BPM | benchmark |
| Principal pitch note F1 | unstable | >= 0.90 | synthetic + labeled clips |
| 303-only source purity | N/A | 100% | render artifact audit |
| Requested note exact match ratio | low | >= 85% | manifest selection logs |
| Reinterpretation score | N/A | >= 75 | domain evaluator |
| Listening test usable rate | N/A | >= 70% | internal panel |

## 12. Definition of Done

이 PRD는 아래 조건이 모두 충족될 때 완료로 본다.

- reference abstraction JSON이 안정적으로 생성된다.
- 303 bank manifest와 chromatic sample set이 존재한다.
- manifest v1/v2 migration path가 검증된다.
- `render-303` 경로가 오직 303 sample bank만 사용한다.
- player v2 semantics가 playback test를 통과한다.
- benchmark regression이 통과한다.
- 출력 품질이 loudness/peak/303-domain score 기준을 만족한다.
- 내부 청취에서 "이건 303-only 재해석 제품으로 납득 가능하다"는 평가를 얻는다.
