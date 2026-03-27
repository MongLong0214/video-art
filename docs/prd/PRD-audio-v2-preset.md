# PRD: Audio System v2 — B-PRESET (Multi-Genre Presets)

**Version**: 0.4
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-27
**Status**: Draft
**Size**: XL
**Scope**: 장르 프리셋 5종. SynthDef 파라미터 + FX 체인 + BPM + 스템 그룹 per genre. Tidal 런타임 전환.
**Prereq**: B-LIVE (FX 4종, 184 tests) + B-PROD (스템 라우팅, 253 tests)

---

## 1. Problem Statement

### 1.1 Background
B-LIVE + B-PROD로 라이브 퍼포먼스 + 프로덕션 파이프라인이 완성되었다. 그러나 현재 사운드는 단일 톤 — 장르별 특화된 사운드 디자인이 없다. 하드 테크노의 aggressive 사운드와 사이트랜스의 멜로딕 사운드는 완전히 다른 SynthDef 파라미터, FX 세팅, BPM 범위가 필요하다.

### 1.2 Problem Definition
1. 장르 전환 시 모든 파라미터를 수동 변경 필요 — 10+ 파라미터 × 9 SynthDef = 비현실적
2. FX 체인 세팅이 장르별로 다름 — 하드 테크노는 heavy compression, 트랜스는 wide reverb
3. BPM 범위가 장르마다 다름 — 프리셋 없이는 매번 수동 설정
4. 라이브 퍼포먼스 중 장르 전환 불가

### 1.3 Impact of Not Solving
- 장르 다양성 없이 단일 사운드에 갇힘
- 라이브 세트에서 장르 전환 불가 → 단조로운 퍼포먼스
- 프로덕션 시 매번 파라미터 수동 설정 → 생산성 저하

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: 장르 프리셋 5종 — hard_techno, melodic_techno, industrial, psytrance, progressive_trance
- [ ] G2: Tidal 런타임 전환 — `setPreset "hard_techno"` → SynthDef + FX 일괄 변경 (라이브 중)
- [ ] G3: 프리셋 저장/로드 — 커스텀 프리셋 생성 + JSON 저장 + 로드
- [ ] G4: NRT 호환 — B-PROD 스템 렌더 시 장르 프리셋 FX 파라미터 적용
- [ ] G5: Phase A scene-schema 통합 — **2계층 분리: `genre` (BPM/NRT scene 유지) + `preset` (사운드 디자인, 신규)**. 기존 genre enum 무변경 (breaking change 방지)

### 2.2 Non-Goals
- NG1: 새로운 SynthDef 추가 (기존 9종 파라미터 변형만)
- NG2: 새로운 FX 추가 (기존 4종 comp/sidechain/sat/eq 세팅 변형만)
- NG3: MIDI 컨트롤러 매핑
- NG4: AI 기반 프리셋 추천
- NG5: 프리셋 마켓플레이스/공유

## 3. User Stories & Acceptance Criteria

### US-1: 장르 프리셋 정의
**As a** 프로듀서, **I want** 장르별로 최적화된 사운드 프리셋을 선택할 수 있기를, **so that** 장르 특성에 맞는 사운드를 빠르게 얻을 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: 5종 프리셋 JSON 파일. 각 프리셋에 포함: SynthDef 파라미터 오버라이드, FX 기본값, BPM 범위, 스템 그룹 매핑
- [ ] AC-1.2: 프리셋 스키마 Zod 검증. 필수 필드 누락 시 명확한 에러
- [ ] AC-1.3: 프리셋 로드 시 Phase A SynthDef 파라미터와 merge (프리셋 값이 우선, 미지정 파라미터는 기본값 유지)
- [ ] AC-1.4: 각 장르 BPM 범위:

| Genre | BPM | 특성 |
|-------|-----|------|
| hard_techno | 140-155 | heavy kick, aggressive distortion, minimal melody |
| melodic_techno | 120-130 | warm pads, melodic leads, subtle FX |
| industrial | 130-145 | harsh noise, distorted bass, metallic percussion |
| psytrance | 138-148 | rolling basslines, acid leads, wide reverb |
| progressive_trance | 128-138 | layered pads, evolving textures, long builds |

### US-2: Tidal 런타임 전환
**As a** 라이브 퍼포머, **I want** Tidal 코드에서 `setPreset "hard_techno"` 한 줄로 장르를 전환할 수 있기를, **so that** 라이브 중 즉시 사운드를 변경할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: Tidal에서 `once $ s "setpreset" # n "hard_techno"` → SC OSCFunc 캐치 → 프리셋 전환. **BootTidal.hs에 `setPreset name = once $ s "setpreset" # n name` 헬퍼 추가**
- [ ] AC-2.2: SC genre-presets.scd가 `/dirt/play` 중 `s "setpreset"` 이벤트를 감지 → `~loadPreset` 호출. `~dirt.orbits.do { |o| o.set(...) }` 로 전체 orbit 업데이트
- [ ] AC-2.3: 전환 시 현재 재생 중인 패턴은 유지. 다음 사이클부터 새 파라미터 적용
- [ ] AC-2.4: SC-side 이름 검증 `^[a-zA-Z0-9_-]+$`. 실패 시 경고 + 현재 프리셋 유지 (크래시 안 함). parseJSON 실패 시 try/catch로 보호
- [ ] AC-2.5: 현재 활성 프리셋: `~currentPreset` 변수. Tidal에서 `getPreset = once $ s "getpreset"` → SC stdout 출력
- [ ] AC-2.6: **BootTidal.hs에 누락 pF 바인딩 11개 추가**: openness, tone, filterEnv, vibrato, portamento, brightness, sweepRange, noiseAmount, envAmount, `clapSpread = pF "spread"` (Tidal 빌트인 `spread` 콤비네이터 충돌 회피), `sawMix = pF "mix"`. **`attack`/`release`는 Tidal 빌트인 — 추가 불필요**
- [ ] AC-2.7: **normalizeParams 화이트리스트 업데이트**: `scripts/lib/synth-stem-map.ts`에 11개 신규 파라미터 추가 (NRT 변환 시 경고 방지)

### US-3: 커스텀 프리셋
**As a** 프로듀서, **I want** 프리셋을 커스터마이즈하고 저장할 수 있기를, **so that** 내 고유 사운드를 재사용할 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: `npm run preset:save <name>` → **현재 활성 프리셋 JSON을 복사 + 유저 수정 가능** → `audio/presets/user/{name}.json`에 저장. 이름 regex 검증 후 경로 구성 → `validateFilePath()` 검증 후 쓰기
- [ ] AC-3.2: `npm run preset:list` → 기본 5종 + 유저 프리셋 목록 출력
- [ ] AC-3.3: 유저 프리셋도 `setPreset "my_custom"` 으로 Tidal에서 호출 가능
- [ ] AC-3.4: 프리셋 이름 검증: `/^[a-zA-Z0-9_-]+$/` (기존 preset sanitize 패턴)

### US-4: NRT 프리셋 통합
**As a** 프로듀서, **I want** B-PROD 스템 렌더 시 장르 프리셋이 자동 적용되기를, **so that** 프로덕션 결과물이 라이브 사운드와 동일하다.

**Acceptance Criteria:**
- [ ] AC-4.1: `prod:convert --preset hard_techno` → NRT 변환 시 프리셋 fxDefaults를 이벤트별 FX 파라미터에 merge (이벤트 값 우선, 미지정 시 프리셋 기본값)
- [ ] AC-4.2: .osclog에 `s "setpreset"` 이벤트가 있으면 자동 감지. 없고 `--preset` 미지정 시 프리셋 없이 진행 (기존 동작)
- [ ] AC-4.3: `render:stems --preset` 옵션 → 스템 그룹을 프리셋에 맞게 변경
- [ ] AC-4.4: session-info.json에 genre 필드 포함

## 4. Technical Design

### 4.1 프리셋 JSON 구조 + 5종 정의

**실제 SynthDef 파라미터 기반** (synthdefs/*.scd 검증 완료):

#### hard_techno (Amelie Lens, Charlotte de Witte)
```json
{
  "name": "hard_techno",
  "bpm": { "min": 140, "max": 155, "default": 145 },
  "synthParams": {
    "kick": { "drive": 0.8, "click": 0.7, "decay": 0.3 },
    "bass": { "cutoff": 1500, "resonance": 0.5, "envAmount": 0.7, "amp": 0.9 },
    "hat": { "openness": 0.05, "tone": 0.4, "freq": 9000, "amp": 0.7 },
    "supersaw": { "detune": 0.3, "mix": 0.5, "cutoff": 3000, "amp": 0.4 },
    "pad": { "attack": 2.0, "release": 2.0, "filterEnv": 0.2, "amp": 0.3 },
    "lead": { "drive": 0.7, "vibrato": 0.1, "portamento": 0, "amp": 0.5 },
    "clap": { "decay": 0.1, "spread": 0.2 },
    "arp_pluck": { "decay": 0.05, "brightness": 0.8 },
    "riser": { "sweepRange": 6000, "noiseAmount": 0.5, "amp": 0.6 }
  },
  "fxDefaults": {
    "compress": 0.85, "threshold": -8, "ratio": 6,
    "compAttack": 0.005, "compRelease": 0.05,
    "saturate": 0.65, "drive": 0.5,
    "loGain": 3, "midGain": -1, "hiGain": 1,
    "loFreq": 200, "hiFreq": 3500,
    "sideGain": 1.2, "sideRelease": 0.15
  },
  "stemGroups": {
    "drums": ["kick", "hat", "clap"],
    "bass": ["bass"],
    "synth": ["supersaw", "pad", "lead", "arp_pluck"],
    "fx": ["riser"]
  }
}
```

#### melodic_techno (Afterlife, Innervisions)
```json
{
  "name": "melodic_techno",
  "bpm": { "min": 120, "max": 130, "default": 124 },
  "synthParams": {
    "kick": { "drive": 0.15, "click": 0.4, "decay": 0.4 },
    "bass": { "cutoff": 700, "resonance": 0.3, "envAmount": 0.4, "amp": 0.8 },
    "hat": { "openness": 0.15, "tone": 0.5, "freq": 8000, "amp": 0.5 },
    "supersaw": { "detune": 0.45, "mix": 0.8, "cutoff": 5000, "amp": 0.5 },
    "pad": { "attack": 2.5, "release": 3.0, "filterEnv": 0.6, "amp": 0.6 },
    "lead": { "drive": 0.1, "vibrato": 0.45, "portamento": 0.05, "amp": 0.5 },
    "clap": { "decay": 0.15, "spread": 0.5 },
    "arp_pluck": { "decay": 0.1, "brightness": 0.6 },
    "riser": { "sweepRange": 4000, "noiseAmount": 0.2, "amp": 0.4 }
  },
  "fxDefaults": {
    "compress": 0.4, "threshold": -14, "ratio": 3,
    "compAttack": 0.015, "compRelease": 0.12,
    "saturate": 0.2, "drive": 0.15,
    "loGain": 1, "midGain": 0, "hiGain": 2,
    "loFreq": 180, "hiFreq": 4000,
    "sideGain": 0.8, "sideRelease": 0.2
  },
  "stemGroups": {
    "drums": ["kick", "hat", "clap"],
    "bass": ["bass"],
    "synth": ["supersaw", "pad", "lead", "arp_pluck"],
    "fx": ["riser"]
  }
}
```

#### industrial (Perc, Ansome, Surgeon)
```json
{
  "name": "industrial",
  "bpm": { "min": 130, "max": 145, "default": 138 },
  "synthParams": {
    "kick": { "drive": 0.95, "click": 0.8, "decay": 0.2 },
    "bass": { "cutoff": 1800, "resonance": 0.7, "envAmount": 0.8, "amp": 0.9 },
    "hat": { "openness": 0.1, "tone": 0.2, "freq": 6500, "amp": 0.65 },
    "supersaw": { "detune": 0.2, "mix": 0.3, "cutoff": 2000, "amp": 0.4 },
    "pad": { "attack": 1.5, "release": 1.5, "filterEnv": 0.15, "amp": 0.25 },
    "lead": { "drive": 0.85, "vibrato": 0.05, "portamento": 0, "amp": 0.5 },
    "clap": { "decay": 0.2, "spread": 0.6 },
    "arp_pluck": { "decay": 0.04, "brightness": 0.5 },
    "riser": { "sweepRange": 5000, "noiseAmount": 0.7, "amp": 0.5 }
  },
  "fxDefaults": {
    "compress": 0.9, "threshold": -6, "ratio": 8,
    "compAttack": 0.003, "compRelease": 0.04,
    "saturate": 0.8, "drive": 0.7,
    "loGain": 3, "midGain": 1, "hiGain": -1,
    "loFreq": 220, "hiFreq": 3000,
    "sideGain": 1.0, "sideRelease": 0.1
  },
  "stemGroups": {
    "drums": ["kick", "hat", "clap"],
    "bass": ["bass"],
    "synth": ["supersaw", "pad", "lead", "arp_pluck"],
    "fx": ["riser"]
  }
}
```

#### psytrance (Astrix, Ace Ventura)
```json
{
  "name": "psytrance",
  "bpm": { "min": 138, "max": 148, "default": 142 },
  "synthParams": {
    "kick": { "drive": 0.25, "click": 0.5, "decay": 0.4 },
    "bass": { "cutoff": 2500, "resonance": 0.75, "envAmount": 0.85, "amp": 0.9 },
    "hat": { "openness": 0.3, "tone": 0.6, "freq": 9500, "amp": 0.5 },
    "supersaw": { "detune": 0.4, "mix": 0.7, "cutoff": 4500, "amp": 0.45 },
    "pad": { "attack": 1.5, "release": 2.0, "filterEnv": 0.7, "amp": 0.5 },
    "lead": { "drive": 0.3, "vibrato": 0.5, "portamento": 0.03, "amp": 0.5 },
    "clap": { "decay": 0.12, "spread": 0.4 },
    "arp_pluck": { "decay": 0.08, "brightness": 0.9 },
    "riser": { "sweepRange": 5000, "noiseAmount": 0.4, "amp": 0.5 }
  },
  "fxDefaults": {
    "compress": 0.5, "threshold": -12, "ratio": 3,
    "compAttack": 0.008, "compRelease": 0.08,
    "saturate": 0.3, "drive": 0.2,
    "loGain": 2, "midGain": 0, "hiGain": 3,
    "loFreq": 180, "hiFreq": 5000,
    "sideGain": 1.2, "sideRelease": 0.15
  },
  "stemGroups": {
    "drums": ["kick", "hat", "clap"],
    "bass": ["bass"],
    "synth": ["supersaw", "pad", "lead", "arp_pluck"],
    "fx": ["riser"]
  }
}
```

#### progressive_trance (Above & Beyond, Tinlicker)
```json
{
  "name": "progressive_trance",
  "bpm": { "min": 128, "max": 138, "default": 132 },
  "synthParams": {
    "kick": { "drive": 0.1, "click": 0.3, "decay": 0.45 },
    "bass": { "cutoff": 550, "resonance": 0.2, "envAmount": 0.3, "amp": 0.8 },
    "hat": { "openness": 0.2, "tone": 0.55, "freq": 8500, "amp": 0.45 },
    "supersaw": { "detune": 0.55, "mix": 0.9, "cutoff": 6000, "amp": 0.55 },
    "pad": { "attack": 3.5, "release": 3.0, "filterEnv": 0.7, "amp": 0.6 },
    "lead": { "drive": 0.1, "vibrato": 0.3, "portamento": 0.05, "amp": 0.45 },
    "clap": { "decay": 0.18, "spread": 0.55 },
    "arp_pluck": { "decay": 0.12, "brightness": 0.55 },
    "riser": { "sweepRange": 4000, "noiseAmount": 0.2, "amp": 0.4 }
  },
  "fxDefaults": {
    "compress": 0.3, "threshold": -16, "ratio": 2,
    "compAttack": 0.02, "compRelease": 0.15,
    "saturate": 0.15, "drive": 0.1,
    "loGain": 1, "midGain": 0, "hiGain": 2,
    "loFreq": 150, "hiFreq": 4500,
    "sideGain": 0.6, "sideRelease": 0.25
  },
  "stemGroups": {
    "drums": ["kick", "hat", "clap"],
    "bass": ["bass"],
    "synth": ["supersaw", "pad", "lead", "arp_pluck"],
    "fx": ["riser"]
  }
}
```

**SynthDef 실제 파라미터 매핑 (검증 완료):**

| SynthDef | 사용 가능한 파라미터 |
|----------|-------------------|
| kick | freq, amp, dur, pan, **drive**, **click**, **decay** |
| bass | freq, amp, dur, pan, **cutoff**, **resonance**, **envAmount** |
| hat | freq, amp, dur, pan, **openness**, **tone** |
| clap | freq, amp, dur, pan, **spread**, **decay** |
| supersaw | freq, amp, dur, pan, **detune**, **mix**, **cutoff** |
| pad | freq, amp, dur, pan, **attack**, **release**, **filterEnv** |
| lead | freq, amp, dur, pan, **vibrato**, **portamento**, **drive** |
| arp_pluck | freq, amp, dur, pan, **decay**, **brightness** |
| riser | freq, amp, dur, pan, **sweepRange**, **noiseAmount** |

### 4.2 2계층 genre/preset 분리

```
기존 genre enum (techno/trance/house/dnb/ambient):
  → BPM 계산 (bpm-calculator.ts)
  → NRT scene 선택 (techno-default.scd / trance-default.scd)
  → 기존 scene.json 호환 유지

신규 preset (hard_techno/melodic_techno/industrial/psytrance/progressive_trance):
  → SynthDef 파라미터 + FX 기본값 + 스템 그룹
  → 라이브 사운드 디자인
  → genre→preset 매핑: techno→hard_techno, trance→psytrance (기본값)
```

scene-schema.ts에 `preset` 옵셔널 필드 추가. 기존 `genre` enum **무변경**.

### 4.3 프리셋 로드 흐름

```
[LIVE] Tidal: once $ s "setpreset" # n "hard_techno"
  → SuperDirt가 /dirt/play 수신 → SC OSCFunc 캐치
  → SC: 이름 검증 → JSON 로드 → orbit 기본값 업데이트

[NRT] prod:convert --preset hard_techno
  → TS: JSON 로드 → FX 기본값을 이벤트에 merge → NRT Score에 반영
  → 기본값: .osclog에 setpreset 이벤트 있으면 자동 감지. 없으면 --preset 또는 no preset (기존 동작)
```

### 4.4 SC 프리셋 관리

```supercollider
// genre-presets.scd (boot.scd에서 로드)
~presetDir = projectRoot +/+ "presets" +/+ "genres";
~userPresetDir = projectRoot +/+ "presets" +/+ "user";

~loadPreset = { |name|
  // SC-side input validation (path traversal prevention)
  if(name.asString.matchRegexp("^[a-zA-Z0-9_-]+$").not) {
    ("WARNING: Invalid preset name: " ++ name).postln;
  } {
    var path = ~presetDir +/+ name ++ ".json";
    // Check user presets too
    if(File.exists(path).not) {
      path = ~userPresetDir +/+ name ++ ".json";
    };
    if(File.exists(path)) {
      // Error-safe JSON parsing
      try {
        var json = File.read(path).parseJSON;
        ~currentPreset = json;
        // Apply FX defaults to ALL orbits
        ~dirt.orbits.do { |orbit|
          json.at("fxDefaults").keysValuesDo { |k, v|
            orbit.set(k.asSymbol, v);
          };
        };
        ("Preset loaded: " ++ name).postln;
      } { |err|
        ("ERROR: Failed to parse preset JSON: " ++ err.errorString).postln;
        // Keep current preset unchanged
      };
    } {
      ("WARNING: Preset not found: " ++ name).postln;
    };
  };
};

// OSC handler for Tidal preset switching
OSCFunc({ |msg|
  var name = msg[1].asString;
  ~loadPreset.(name);
}, '/preset/set');
```

**핵심 결정:**
- `~dirt.orbits.do { |o| o.set(...) }` 사용 (~~`~dirt.set()` 아님~~). OQ-2 해결
- SC-side regex 검증 (`matchRegexp`) — validateFilePath는 TS 전용이므로 SC 별도 방어
- `try { } { |err| }` — parseJSON 실패 시 크래시 방지
- Tidal 전환: `once $ s "setpreset" # n "hard_techno"` 패턴 기반 (GHCi IO 제약 회피)

### 4.4 Key Technical Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| 프리셋 포맷 | JSON vs SCD vs YAML | **JSON** | TS + SC 모두 파싱 가능, Zod 검증, 사람 편집 가능 |
| 프리셋 위치 | audio/presets/ | **audio/presets/genres/ + user/** | 기본/유저 분리 |
| Tidal 전환 | OSC 메시지 | **OSC /genre/set** | 기존 SuperDirt OSC 인프라 활용 |
| NRT 적용 | 별도 변환기 | **기존 osc-to-nrt 확장** | synth-stem-map.ts에 프리셋 FX defaults merge |

### 4.5 디렉토리 구조 (추가분)

```
audio/presets/
├── genres/
│   ├── hard_techno.json
│   ├── melodic_techno.json
│   ├── industrial.json
│   ├── psytrance.json
│   └── progressive_trance.json
├── user/                    # 유저 커스텀 프리셋
│   └── .gitkeep
└── schema.json              # Zod 스키마 참조

audio/sc/superdirt/
├── genre-presets.scd         # (신규) SC 프리셋 로더 + OSC 핸들러

audio/tidal/
├── BootTidal.hs              # (수정) setPreset, getPreset 함수 추가

scripts/
├── preset-save.ts            # (신규) npm run preset:save
├── preset-list.ts            # (신규) npm run preset:list
├── lib/
│   ├── genre-preset.ts       # (신규) 프리셋 로드/검증/merge 로직
│   └── genre-preset.test.ts  # (신규) vitest 테스트
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | 잘못된 장르명 setPreset | 경고 + 현재 프리셋 유지 | P2 |
| E2 | 손상된 프리셋 JSON | Zod 검증 실패 → 에러 + 기본 프리셋 fallback | P1 |
| E3 | 유저 프리셋 이름 특수문자 | `/^[a-zA-Z0-9_-]+$/` 검증 → 에러 | P2 |
| E4 | 프리셋 파일 삭제 중 setPreset | 파일 미존재 → 경고 + 현재 유지 | P2 |
| E5 | BPM 범위 밖 수동 설정 | 허용 (프리셋은 권장 범위, 강제 아님) | P3 |
| E6 | 동시 setPreset 호출 (빠른 연속) | 마지막 호출 wins (SC 단일 스레드) | P3 |
| E7 | NRT에서 .osclog에 장르 이벤트 없음 + --genre 미지정 | 기본 FX 값 (프리셋 없이) 사용 | P2 |
| E8 | 유저 프리셋 이름이 기본 프리셋과 충돌 | user/ 디렉토리 분리로 네임스페이스 충돌 방지 | P3 |
| E9 | 유저 커스텀 stemGroups가 기본과 다를 때 | 유저 프리셋 stemGroups 허용. NRT에서 동적 Bus 할당 | P3 |
| E10 | SC 부팅 완료 전 setpreset 호출 | ~loadPreset 미정의 상태 → OSCFunc 미등록 → 무시됨 | P3 |
| E11 | preset:save 기존 파일 덮어쓰기 | 파일 존재 시 경고 + `--force` 플래그 필요 | P2 |
| E12 | 프리셋 JSON > 64KB | 로드 전 파일 크기 체크. > 64KB 거부 | P3 |

## 6. Security & Permissions
- 프리셋 JSON 로드: `audio/presets/` 하위만 허용 (validateFilePath 재사용)
- 유저 프리셋 이름: sanitize `/^[a-zA-Z0-9_-]+$/`
- execFile array-form 정책 유지
- SC 프리셋 로드: File.exists 체크 + 프로젝트 범위 내 검증

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| setPreset 전환 시간 | < 50ms | SC 프로파일링 |
| 프리셋 JSON 파싱 | < 5ms | TS 벤치마크 |
| 메모리 (5 프리셋 로드) | < 1MB | 무시 가능 |

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- 프리셋 스키마 검증 (Zod)
- 프리셋 로드/merge/fallback
- 프리셋 이름 sanitize
- NRT 프리셋 통합 (FX defaults merge)
- Phase A + B-LIVE + B-PROD regression (253 기존 테스트 유지)

### 8.2 Integration Tests
- SC 프리셋 로드 → 에러 0
- Tidal setPreset → SC 파라미터 변경 확인
- NRT with genre → 스템에 FX 기본값 적용

## 9. Rollout Plan

| Step | 내용 | Size | 의존 |
|------|------|------|------|
| PR-1 | 프리셋 스키마 + JSON 5종 + 로드/검증 유틸 | M | None |
| PR-2 | SC genre-presets.scd + Tidal setPreset/getPreset | M | PR-1 |
| PR-3 | 커스텀 프리셋 save/list + NRT 통합 | M | PR-1, PR-2 |

### 9.1 Rollback Plan
1. `audio/presets/` 삭제
2. `audio/sc/superdirt/genre-presets.scd` 삭제
3. BootTidal.hs에서 setPreset/getPreset 제거
4. `scripts/preset-*.ts`, `scripts/lib/genre-preset.*` 삭제
5. package.json에서 preset:* scripts 제거

## 10. Dependencies & Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| SuperDirt ~dirt.set()이 런타임 파라미터 변경 불가 | 낮음 | 높음 | 대안: orbit별 SynthDef 재등록 |
| JSON 프리셋이 SC에서 파싱 어려움 | 낮음 | 중간 | SC parseJSON 내장 지원 확인 완료 |
| 프리셋 파라미터가 SynthDef 범위 초과 | 중간 | 낮음 | Zod 검증으로 범위 제한 |
| 기존 253 테스트 regression | 낮음 | 높음 | 신규 파일 분리, 기존 파일 최소 수정 |

## 11. Open Questions
- [ ] OQ-1: SC `parseJSON` 성능 — 대용량 프리셋에서 지연 여부. PR-1에서 벤치마크. try/catch 포함
- [x] ~~OQ-2: SuperDirt orbit 기본값 런타임 변경 메커니즘~~ → **해결: `~dirt.orbits.do { |o| o.set(...) }` 사용. `~dirt.set()` 아님**

---

## Changelog
### v0.1 (2026-03-27) — 초안
- B-LIVE + B-PROD 기반 프리셋 범위 정의
- 5종 장르 프리셋 (hard_techno, melodic_techno, industrial, psytrance, progressive_trance)
- JSON 프리셋 포맷 + Tidal setPreset + NRT 통합

### v0.2 (2026-03-27) — 전문가 사운드 디자인 리뷰 반영
- [BLOCKER fix] 팬텀 파라미터 전면 수정: hat(openness/tone), pad(attack/release/filterEnv), lead(vibrato/portamento), arp_pluck(brightness)
- [Critical fix] 누락 파라미터 추가: bass.envAmount, supersaw.mix, riser.sweepRange/noiseAmount, clap.spread
- [Critical fix] FX 누락 파라미터 추가: compAttack/compRelease, loFreq/hiFreq, sideGain/sideRelease
- 5종 프리셋 전부 실제 SynthDef 파라미터 기반으로 재작성
- 장르별 특성 반영: hard_techno(aggressive), melodic(warm), industrial(harsh), psy(acid), progressive(lush)
- SynthDef 실제 파라미터 매핑 테이블 추가

### v0.3 (2026-03-27) — Phase 2 팀 리뷰 반영
- [P0 fix] genre/preset 2계층 분리. 기존 scene-schema genre enum 무변경 (breaking change 방지)
- [P1 fix] `~dirt.orbits.do { |o| o.set(...) }` 사용 (OQ-2 해결)
- [P1 fix] SC-side 입력 검증: regex `^[a-zA-Z0-9_-]+$` + try/catch parseJSON
- [P1 fix] Tidal 전환: `once $ s "setpreset"` 패턴 기반 (GHCi IO 제약 회피)
- [P1 fix] BootTidal.hs pF 바인딩 12개 추가 (openness, tone, attack, release, filterEnv, vibrato, portamento, brightness, sweepRange, noiseAmount, envAmount, mix)
- [P1 fix] preset:save: "현재 활성 프리셋 복사" 방식 명확화 + validateFilePath 적용
- [P2 fix] NRT merge 흐름: 이벤트 FX 우선, 미지정 시 프리셋 기본값
- [P2 fix] Edge Case E9-E12 추가 (stemGroups 커스텀, 부팅 전 호출, 덮어쓰기, 파일 크기)
- [P2 fix] NRT 기본 fallback: osclog에 setpreset 없고 --preset 미지정 → 프리셋 없이 진행

### v0.4 (2026-03-27) — XL 엔터프라이즈 리뷰 반영
- [P0 fix] normalizeParams 화이트리스트 업데이트 요구 추가 (AC-2.7)
- [P0 fix] setGenre→setPreset 전체 통일 (naming consistency)
- [P1 fix] pF 12→11개: attack/release는 Tidal 빌트인, spread→clapSpread, mix→sawMix (빌트인 충돌 회피)
- [P1 fix] T3 분할: T3a (CLI, S) + T3b (NRT, M) — XL 단일 티켓 방지 + B-PROD regression 격리
- [P1 fix] validateFilePath 신규 파일: 디렉토리 검증 + regex 조합 (realpathSync 비호환 해소)
- [P1 fix] AC-4.4: "genre"→"preset" 필드명 통일
- [P2 fix] boot.scd Routine 내 로드 순서 명시 (AC-2.7)
- [P2 fix] Level 2 승인 체크포인트 추가 (T2: boot.scd/BootTidal.hs, T3b: osc-to-nrt.ts)
