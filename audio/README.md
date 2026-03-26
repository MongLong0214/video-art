# Audio System — Techno/Trance Music Generation

SuperCollider 기반 코드 생성 음악 시스템. video-art 비주얼에 동기화되는 테크노/트랜스 사운드트랙을 NRT(Non-Realtime) 렌더링합니다.

## Quick Start

```bash
# 1. 의존성 설치 (SuperCollider, ffmpeg, sox)
npm run audio:setup

# 2. 오디오 렌더 (scene.json → master.wav)
npm run render:audio
# → out/audio/master/master.wav (48kHz 16-bit, -14 LUFS)

# 3. 비디오 + 오디오 합성 (→ final.mp4)
npm run render:av
```

## 의존성

| Tool | 설치 | 용도 |
|------|------|------|
| SuperCollider 3.13+ | `brew install --cask supercollider` | 신스 엔진 + NRT 렌더 |
| ffmpeg 5+ | `brew install ffmpeg` | LUFS 믹스다운 + AV 합성 |
| sox | `brew install sox` | seamless loop 크로스페이드 |

## 디렉토리 구조

```
audio/
├── sc/                         # SuperCollider 소스
│   ├── synthdefs/              # SynthDef 정의 (9종)
│   │   ├── kick.scd            # 사인파 + pitch env + distortion
│   │   ├── bass.scd            # 톱니파 + LP filter + amp env
│   │   ├── hat.scd             # 노이즈 + BP filter + short decay
│   │   ├── clap.scd            # 노이즈 버스트 + short reverb
│   │   ├── supersaw.scd        # 7-voice detuned saw + LP filter
│   │   ├── pad.scd             # Saw/Pulse mix + slow attack + LP sweep
│   │   ├── lead.scd            # Saw + vibrato + drive
│   │   ├── arp_pluck.scd       # Saw + fast decay + brightness
│   │   └── riser.scd           # XLine pitch sweep + noise blend
│   ├── patterns/               # Pbind/Pdef 시퀀스
│   │   ├── techno-kick.scd     # Bjorklund(4,16) + Pwrand 확률 트리거
│   │   ├── techno-hat.scd      # Bjorklund(7,16) + Pseg density 변형
│   │   ├── techno-clap.scd     # Bjorklund(3,8) + Prand position shift
│   │   ├── techno-master.scd   # 3종 Ppar 조합
│   │   ├── trance-layers.scd   # 6레이어 독립 Pbind (sub_bass/rolling_bass/arp/pad/lead/riser)
│   │   ├── trance-macro.scd    # filter/reverb/width Env 자동화 (32bars)
│   │   └── trance-master.scd   # 코드 진행 + 아르페지오 + macro wiring
│   ├── lib/                    # SC 라이브러리
│   │   ├── bjorklund.scd       # 유클리드 리듬 알고리즘 (Euclidean rhythm)
│   │   ├── scales.scd          # 스케일 정의 (5종) + MIDI 매핑 (24키)
│   │   ├── chords.scd          # 다이어토닉 코드 진행 엔진
│   │   ├── arp.scd             # 아르페지에이터 (up/down/random + octave span + gate)
│   │   └── scene-score.scd     # SceneScore: 에너지 → 파라미터/레이어 자동 매핑
│   ├── scenes/                 # SceneScore 프리셋
│   │   ├── techno-default.scd  # 5섹션 48bars (intro→build→drop→break→outro)
│   │   └── trance-default.scd  # 5섹션 64bars (intro→build→break→main→outro)
│   ├── scores/
│   │   └── render-nrt.scd      # NRT 스코어 생성기 (config → SceneScore → scsynth -N)
│   ├── startup.scd             # SC 부팅 + SynthDef 자동 로더
│   ├── test-synthdefs.scd      # SynthDef 로드 + NRT + RMS > 0.001 검증
│   ├── test-patterns.scd       # Bjorklund + Pwrand/Pseg 소스 검증 (11 tests)
│   └── test-trance.scd         # 코드/아르페지오/레이어/macro 검증 (12 tests)
├── render/                     # 렌더 파이프라인 스크립트
│   ├── loop-crossfade.sh       # sox tail 2s → head 2s crossfade → exact trim
│   ├── merge-av.sh             # ffmpeg -c:v copy -c:a aac -b:a 320k
│   └── test-output/            # NRT 테스트 출력
├── setup.sh                    # brew 의존성 설치 + SC headless 부팅 검증
└── README.md
```

## 렌더 파이프라인

```
npm run render:audio

scene.json (duration, audio config)
     │
     ▼
[1] Dependencies check (sclang, scsynth, ffmpeg, sox)
     │
     ▼
[2] BPM 역산 — bars × 4 × 60 / bpm = duration (±0.001s 정밀도)
    소수점 BPM 허용. SC TempoClock 소수점 지원.
     │
     ▼
[3] SC config 생성 → sclang render-nrt.scd
     ├── SynthDefs 로드 + writeDefFile (디스크 저장)
     ├── SceneScore 빌드 (에너지 기반 섹션 → NRT OSC 이벤트)
     ├── thisThread.randSeed_(42)  ← 결정론적 출력 보장
     ├── Score.write → binary OSC 파일
     └── scsynth -N → stem-master.wav (48kHz 32-bit float)
     │
     ▼
[4] loop-crossfade.sh (seamless loop)
     └── sox: tail 2s crossfade into head 2s → trim to exact duration
     │
     ▼
[5] ffmpeg mixdown
     └── loudnorm I=-14 TP=-1 LRA=11 → master.wav (48kHz 16-bit PCM)
     │
     ▼
[6] 검증 — ffprobe duration match + 디스크 공간 2x 사전 체크
     │
     ▼
out/audio/master/master.wav
```

## SynthDef 파라미터

모든 SynthDef는 공통 인터페이스를 공유합니다:

| 파라미터 | 기본값 | 설명 |
|---------|--------|------|
| `out` | 0 | 출력 버스 |
| `freq` | varies | 주파수 (Hz) |
| `amp` | 0.5-0.8 | 진폭 |
| `dur` | varies | 지속 시간 (초) |
| `pan` | 0 | 스테레오 패닝 (-1 ~ 1) |

각 SynthDef별 고유 파라미터:

| SynthDef | 파라미터 | 설명 |
|----------|---------|------|
| **kick** | `drive`, `click`, `decay` | 사인파 킥 + pitch envelope + 선택적 distortion |
| **bass** | `cutoff`, `resonance`, `envAmount` | 톱니파 + 레조넌트 LP 필터 |
| **hat** | `openness`, `tone` | 노이즈 하이햇 (0=closed, 1=open) |
| **clap** | `spread`, `decay` | 다중 노이즈 버스트 + reverb |
| **supersaw** | `detune`, `mix`, `cutoff` | 7-voice detuned saw (trance lead) |
| **pad** | `attack`, `release`, `filterEnv` | 느린 attack + LP sweep (ambient) |
| **lead** | `vibrato`, `portamento`, `drive` | 모노 리드 + SinOsc 비브라토 |
| **arp_pluck** | `decay`, `brightness` | 짧은 pluck (아르페지오용) |
| **riser** | `sweepRange`, `noiseAmount` | 상승 pitch sweep (빌드업용) |

## 에너지 씬 시스템

SceneScore는 곡 구조를 에너지 값(0~1)으로 제어합니다:

| Energy | 활성 레이어 | 캐릭터 |
|--------|-----------|--------|
| 0.0 | (없음) | 완전 무음 |
| 0.1 | sub_bass | 서브 베이스만 |
| 0.2 | + pad | 앰비언트 |
| 0.4 | + rolling_bass, hat | 리듬 시작 |
| 0.5 | + arp, kick | 메인 그루브 |
| 0.7 | + lead | 멜로디 추가 |
| 0.8 | + riser | 풀 에너지 |

에너지 → 파라미터 자동 매핑:

| 파라미터 | energy=0 | energy=1 | 커브 |
|---------|----------|----------|------|
| openness | 0.1 | 0.9 | linear |
| brightness | 0.2 | 1.0 | linear |
| distortion | 0.0 | 0.5 | linear |
| filterCutoff | 200 Hz | 8000 Hz | exponential |
| reverbSize | 0.6 | 0.2 | linear (inverse) |
| amp | 0.3 | 0.9 | linear |

## scene.json audio 필드

```jsonc
{
  "audio": {                    // optional — 없으면 기본값 적용
    "bpm": 128,                 // optional — 없으면 duration에서 자동 역산
    "key": "Am",                // 24키 지원 (C, Cm, C#, C#m, ... B, Bm). default: "Am"
    "scale": "minor",           // major | minor | dorian | phrygian | mixolydian
    "genre": "techno",          // "techno" (BPM 125-150) | "trance" (BPM 130-145)
    "energy": 0.7,              // 0~1, 전체 에너지 스케일링
    "preset": "techno-default"  // optional, /^[a-zA-Z0-9_-]+$/ (sanitized)
  }
}
```

audio 필드가 없으면: techno, Am, minor, energy 0.7, BPM은 duration에서 역산.

## 테스트

```bash
# 전체 vitest (106 tests)
npx vitest run

# SC SynthDef 로드 + NRT + RMS 검증 (9종)
npm run audio:test

# SC 개별 테스트
sclang -i none audio/sc/test-patterns.scd   # Bjorklund + Pwrand/Pseg (11 tests)
sclang -i none audio/sc/test-trance.scd     # 코드 + arp + layers + macro (12 tests)
```

### 테스트 커버리지

| 영역 | 테스트 수 | 검증 항목 |
|------|----------|----------|
| scene-schema | 30 | audio 필드 Zod 검증, 하위 호환, preset injection 방어 |
| bpm-calculator | 10 | duration invariant, 극단값 (0.5s~60s), genre 범위 |
| render-audio-utils | 11 | config 생성, lock file, disk space, invariant |
| render-av | 10 | merge-av args, shell safety, ffmpeg args, execFile 준수 |
| SC SynthDefs | 9 NRT | 9종 로드 + NRT 렌더 + RMS > 0.001 (무음 아님) |
| SC patterns | 11 | Bjorklund 4종, Pdef 로드, Pwrand/Pseg 소스 검증 |
| SC trance | 12 | 코드 스케일 검증, arp 5방향, 6레이어, macro Env |
| 결정론적 출력 | 1 | randSeed_(42) 2회 렌더 → 동일 프레임 수 |

## 보안

| 위협 | 방어 |
|------|------|
| Shell injection | `child_process.execFile` (array-form) 전용. `exec`/`spawn(shell:true)` 금지 |
| SC code injection | Zod enum 검증된 값만 SC config에 보간. 사용자 입력 직접 보간 없음 |
| Preset injection | `/^[a-zA-Z0-9_-]+$/` regex 검증 |
| Shell variable expansion | 모든 .sh 스크립트에서 `"$VAR"` 따옴표 + `set -euo pipefail` |
| Concurrent render | PID lock file (`out/audio/.render.lock`) + try/finally cleanup |
| Disk exhaustion | `df -k` 기반 2x 안전 마진 사전 체크 |

## 출력 스펙

| 항목 | 값 |
|------|---|
| 스템 포맷 | WAV 48kHz 32-bit float |
| 마스터 포맷 | WAV 48kHz 16-bit PCM |
| Loudness | -14 LUFS integrated |
| True peak | ≤ -1 dBTP |
| Duration 정밀도 | scene.json duration ± 0.001s |
| AV sync | < 50ms (ffprobe 검증) |
| 결정론적 출력 | `thisThread.randSeed_(42)` — 동일 입력 → 동일 WAV |

## Phase 로드맵

- **Phase A (현재)**: SuperCollider 코어 — 9종 SynthDef, 테크노/트랜스 패턴, 에너지 씬, NRT 렌더
- **Phase B (후속)**: TidalCycles 라이브 패턴 + OSC dump → SC NRT 변환
- **Phase C (후속)**: FAUST 커스텀 DSP 이펙트 (acid filter, trance gate, saturator)
