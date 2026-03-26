# Audio System — Techno/Trance Music Generation

SuperCollider 기반 코드 생성 음악 시스템. video-art 비주얼에 동기화되는 테크노/트랜스 사운드트랙을 NRT(Non-Realtime) 렌더링합니다.

## Quick Start

```bash
# 1. 의존성 설치
npm run audio:setup

# 2. 오디오 렌더 (scene.json 기반)
npm run render:audio

# 3. 비디오 + 오디오 합성
npm run render:av
```

## 의존성

| Tool | 설치 | 용도 |
|------|------|------|
| SuperCollider 3.13+ | `brew install --cask supercollider` | 신스 엔진 + NRT 렌더 |
| ffmpeg 5+ | `brew install ffmpeg` | 믹스다운 + AV 합성 |
| sox | `brew install sox` | 루프 크로스페이드 |

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
│   │   ├── techno-kick.scd     # Bjorklund(4,16) + Pwrand
│   │   ├── techno-hat.scd      # Bjorklund(7,16) + density Pseg
│   │   ├── techno-clap.scd     # Bjorklund(3,8) + Prand position
│   │   ├── techno-master.scd   # 3종 Ppar 조합
│   │   ├── trance-layers.scd   # 6레이어 독립 Pbind
│   │   ├── trance-macro.scd    # filter/reverb/width Env 32bars
│   │   └── trance-master.scd   # 코드 진행 + 아르페지오 + 구조
│   ├── lib/                    # SC 라이브러리
│   │   ├── bjorklund.scd       # 유클리드 리듬 알고리즘
│   │   ├── scales.scd          # 스케일 정의 + MIDI 매핑
│   │   ├── chords.scd          # 다이어토닉 코드 진행 엔진
│   │   ├── arp.scd             # 아르페지에이터 (up/down/random/gate)
│   │   └── scene-score.scd     # SceneScore 에너지 → 파라미터 매핑
│   ├── scenes/                 # SceneScore 프리셋
│   │   ├── techno-default.scd  # 5섹션 48bars (intro→build→drop→break→outro)
│   │   └── trance-default.scd  # 5섹션 64bars (intro→build→break→main→outro)
│   ├── scores/
│   │   └── render-nrt.scd      # NRT 스코어 생성기 (config → scsynth -N)
│   ├── startup.scd             # SC 부팅 + SynthDef 로더
│   ├── test-synthdefs.scd      # SynthDef 로드 + NRT + RMS 검증
│   ├── test-patterns.scd       # Bjorklund + 패턴 로드 테스트
│   └── test-trance.scd         # 코드/아르페지오/레이어 테스트
├── render/                     # 렌더 파이프라인 스크립트
│   ├── loop-crossfade.sh       # sox tail 크로스페이드 → seamless loop
│   ├── merge-av.sh             # ffmpeg 비디오 + 오디오 합성
│   └── test-output/            # NRT 테스트 출력 (gitignored)
├── setup.sh                    # brew 의존성 설치 검증
└── README.md                   # 이 파일
```

## 렌더 파이프라인

```
scene.json (duration, audio config)
     │
     ▼
[1] BPM 역산 (duration → bars × 4 × 60 / bpm)
     │
     ▼
[2] SC config 생성 (bpm, key, scale, genre, energy)
     │
     ▼
[3] sclang → render-nrt.scd
     ├── SynthDefs 로드 + writeDefFile
     ├── SceneScore 빌드 (에너지 기반 섹션 → NRT 이벤트)
     ├── Score.write → binary OSC 파일
     └── scsynth -N → stem-master.wav (48kHz 32-bit float)
     │
     ▼
[4] loop-crossfade.sh
     └── sox: tail 2s → head 2s crossfade → trim to exact duration
     │
     ▼
[5] ffmpeg mixdown
     └── loudnorm -14 LUFS, peak ≤ -1 dBTP → master.wav (48kHz 16-bit)
     │
     ▼
[6] 검증 (ffprobe duration match)
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

- **kick**: `drive`, `click`, `decay`
- **bass**: `cutoff`, `resonance`, `envAmount`
- **hat**: `openness`, `tone`
- **clap**: `spread`, `decay`
- **supersaw**: `detune`, `mix`, `cutoff`
- **pad**: `attack`, `release`, `filterEnv`
- **lead**: `vibrato`, `portamento`, `drive`
- **arp_pluck**: `decay`, `brightness`
- **riser**: `sweepRange`, `noiseAmount`

## 에너지 씬 시스템

SceneScore는 곡 구조를 에너지 값(0~1)으로 제어합니다:

| Energy | 활성 레이어 | 캐릭터 |
|--------|-----------|--------|
| 0.0 | (없음) | 완전 무음 |
| 0.1~0.2 | sub_bass | 서브 베이스만 |
| 0.2~0.4 | + pad | 앰비언트 |
| 0.4~0.5 | + rolling_bass, hat | 리듬 시작 |
| 0.5~0.7 | + arp, kick | 메인 그루브 |
| 0.7~0.8 | + lead | 멜로디 추가 |
| 0.8~1.0 | + riser | 풀 에너지 |

에너지 값은 `openness`, `brightness`, `distortion`, `filterCutoff`, `reverbSize`, `amp` 파라미터에 자동 매핑됩니다.

## scene.json audio 필드

```jsonc
{
  "audio": {                    // optional — 없으면 기본값 적용
    "bpm": 128,                 // optional — 없으면 duration에서 역산
    "key": "Am",                // default: "Am"
    "scale": "minor",           // default: "minor"
    "genre": "techno",          // "techno" | "trance"
    "energy": 0.7,              // 0~1, 전체 에너지 스케일링
    "preset": "techno-default"  // optional, alphanumeric + dash + underscore만
  }
}
```

## 테스트

```bash
# SC SynthDef 로드 + NRT + RMS 검증
npm run audio:test

# SC 개별 테스트
sclang -i none audio/sc/test-patterns.scd   # Bjorklund + 패턴
sclang -i none audio/sc/test-trance.scd     # 코드 + 아르페지오

# vitest (schema + BPM + 파이프라인 유틸)
npx vitest run
```

## 보안

- 모든 외부 프로세스 호출은 `child_process.execFile` (array-form) 사용
- `exec`/`spawn(shell:true)` 금지 — shell injection 방지
- `preset` 필드: `/^[a-zA-Z0-9_-]+$/` regex 검증
- SC config: Zod enum 검증된 값만 보간

## Phase 로드맵

- **Phase A (현재)**: SuperCollider 코어 — SynthDefs, 패턴, NRT 렌더
- **Phase B (후속)**: TidalCycles 라이브 패턴 + OSC→NRT 변환
- **Phase C (후속)**: FAUST 커스텀 DSP 이펙트
