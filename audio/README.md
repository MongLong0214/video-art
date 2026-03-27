# Audio System v2 — Live Performance + Production Pipeline

SuperCollider + TidalCycles 기반 전자음악 시스템. 라이브 퍼포먼스(실시간 코딩) + 프로덕션 파이프라인(NRT 스템 렌더 + 마스터링) + 5종 장르 프리셋.

## Quick Start

```bash
# 0. 의존성 설치
npm run audio:setup

# 1. 라이브 모드 — 실시간 코딩 + 퍼포먼스
npm run live:start              # SC + SuperDirt + Tidal 스택 부팅
npm run live:start -- --log     # + OSC 이벤트 로깅 (프로덕션용)
npm run live:log                # 위와 동일 (shortcut)
npm run live:record             # 라이브 녹음 (master WAV)
npm run live:stop               # 전체 스택 종료

# 2. 프로덕션 모드 — 라이브 세션 → 상업 품질 트랙
npm run prod:convert <session.osclog>     # OSC 로그 → NRT Score
npm run render:stems <score.nrt.json>     # NRT Score → 4스템 WAV
npm run render:prod <session.osclog>      # 원커맨드 (변환→스템→마스터)

# 3. NRT 모드 — scene.json 기반 자동 생성
npm run render:audio            # scene.json → master.wav
npm run render:av               # 비디오 + 오디오 합성 → final.mp4

# 4. 프리셋
npm run preset:list             # 장르 프리셋 목록
npm run preset:save my_custom   # 현재 프리셋 저장

# 5. 테스트
npm run test                    # 338 vitest (전체)
npm run audio:test              # SC SynthDef NRT 검증
```

---

## 의존성

| Tool | 설치 | 용도 | 필수 |
|------|------|------|------|
| SuperCollider 3.13+ | `brew install --cask supercollider` | 신스 엔진 + NRT 렌더 | 필수 |
| ffmpeg 5+ | `brew install ffmpeg` | LUFS 마스터링 + AV 합성 + 스템 분리 | 필수 |
| sox | `brew install sox` | seamless loop 크로스페이드 | NRT만 |
| GHCup + GHC 9.6 | `brew install ghcup` | Haskell 툴체인 (TidalCycles) | 라이브만 |
| TidalCycles | `cabal install tidal` | 라이브 코딩 엔진 | 라이브만 |
| SuperDirt | SC Quarks.install("SuperDirt") | 샘플러 + 이펙트 | 라이브만 |
| VS Code + tidalvscode | marketplace | 에디터 Tidal 통합 | 라이브만 |

sclang PATH 설정 (macOS):
```bash
export PATH="/Applications/SuperCollider.app/Contents/MacOS:$PATH"
```

---

## 디렉토리 구조

```
audio/
├── sc/                              # SuperCollider 소스
│   ├── synthdefs/                   # SynthDef 9종
│   │   ├── kick.scd                 # 사인파 + pitch env + distortion
│   │   ├── bass.scd                 # 톱니파 + LP filter + envAmount
│   │   ├── hat.scd                  # 노이즈 + openness/tone
│   │   ├── clap.scd                 # 노이즈 버스트 + spread(FreeVerb mix)
│   │   ├── supersaw.scd             # 7-voice detuned saw + mix + LP
│   │   ├── pad.scd                  # slow attack/release + filterEnv
│   │   ├── lead.scd                 # vibrato + portamento + drive
│   │   ├── arp_pluck.scd            # fast decay + brightness
│   │   └── riser.scd                # sweepRange + noiseAmount
│   ├── superdirt/                   # SuperDirt 설정 (라이브 모드)
│   │   ├── boot.scd                 # SuperDirt.start + SynthDef 로드 + FX + Presets + Logger
│   │   ├── custom-fx.scd            # FX 4종: compressor, sidechain, saturator, EQ (addModule)
│   │   ├── genre-presets.scd        # SC 프리셋 로더 + OSC 핸들러 (setPreset/getPreset)
│   │   └── osc-logger.scd           # OSC 이벤트 JSONL 캡처 (--log 시 활성)
│   ├── lib/                         # SC 라이브러리
│   │   ├── bjorklund.scd            # 유클리드 리듬 알고리즘
│   │   ├── scales.scd               # 5종 스케일 + 24키 MIDI 매핑
│   │   ├── chords.scd               # 다이어토닉 코드 진행
│   │   ├── arp.scd                  # 아르페지에이터 (up/down/random)
│   │   └── scene-score.scd          # 에너지 → 파라미터/레이어 매핑
│   ├── patterns/                    # NRT 패턴 시퀀스
│   │   ├── techno-*.scd             # 테크노 킥/햇/클랩/마스터
│   │   └── trance-*.scd             # 트랜스 레이어/매크로/마스터
│   ├── scenes/                      # SceneScore 프리셋
│   │   ├── techno-default.scd       # 48bars: intro→build→drop→break→outro
│   │   └── trance-default.scd       # 64bars: intro→build→break→main→outro
│   ├── scores/
│   │   ├── render-nrt.scd           # NRT 스코어 생성 (scene.json → scsynth -N)
│   │   └── render-stems-nrt.scd     # NRT 멀티스템 렌더 (8ch, 14 SynthDef + Buffer.read)
│   ├── startup.scd                  # SC 부팅 + SynthDef 자동 로더
│   ├── test-synthdefs.scd           # SynthDef NRT + RMS 검증 (9종)
│   ├── test-patterns.scd            # Bjorklund + 패턴 검증 (11 tests)
│   └── test-trance.scd              # 코드/arp/레이어/매크로 (12 tests)
├── tidal/                           # TidalCycles
│   ├── BootTidal.hs                 # Tidal 부트: 127.0.0.1:57120, d1-d8, pF 31개, setPreset/getPreset
│   └── sessions/                    # 라이브 세션 .tidal 파일
├── presets/                         # 장르 프리셋
│   ├── genres/                      # 기본 5종
│   │   ├── hard_techno.json         # BPM 140-155, heavy comp/sat, aggressive kick
│   │   ├── melodic_techno.json      # BPM 120-130, warm pads, subtle FX
│   │   ├── industrial.json          # BPM 130-145, harsh distortion, dark EQ
│   │   ├── psytrance.json           # BPM 138-148, acid bass, bright top
│   │   └── progressive_trance.json  # BPM 128-138, lush pads, wide supersaw
│   └── user/                        # 유저 커스텀 프리셋
├── samples/                         # 커스텀 샘플 (audio/samples/ 하위만 허용)
├── render/                          # 렌더 파이프라인 스크립트
│   ├── loop-crossfade.sh            # sox seamless loop
│   └── merge-av.sh                  # ffmpeg AV 합성
├── setup.sh                         # 의존성 설치 + SC 검증
└── README.md                        # 이 파일
```

---

## 모드별 상세 사용법

### 1. 라이브 모드

```bash
# 전체 스택 부팅 (SC + SuperDirt + 8 orbits)
npm run live:start

# 라이브 + OSC 로깅 (프로덕션 변환용)
npm run live:log
```

부팅 후:
1. VS Code에서 `.tidal` 파일 열기
2. `Ctrl+Enter`로 코드 블록 실행
3. `audio/tidal/sessions/` 에 세션 파일 저장

**Tidal 기본 사용:**
```haskell
-- 킥 패턴
d1 $ s "kick" # drive 0.5 # click 0.7

-- 하이햇 + 커스텀 파라미터
d2 $ s "hat" # openness 0.3 # tone 0.5

-- 슈퍼소우 + FX
d3 $ s "supersaw" # n "0 4 7" # cutoff 3000 # compress 0.7 # sawMix 0.8

-- 프리셋 전환 (라이브 중 즉시)
setPreset "hard_techno"
setPreset "psytrance"
getPreset  -- 현재 프리셋 확인

-- 모든 정지
hush
```

**사용 가능한 Tidal 파라미터:**

| 카테고리 | 파라미터 | 설명 |
|---------|---------|------|
| **SynthDef 공통** | cutoff, resonance, detune, width, click, decay | Phase A 기본 |
| **SynthDef 확장** | openness, tone, filterEnv, vibrato, portamento, brightness, sweepRange, noiseAmount, envAmount | B-PRESET |
| **앨리어스** | clapSpread (→spread), sawMix (→mix) | Tidal 빌트인 충돌 회피 |
| **FX** | compress, threshold, ratio, compAttack, compRelease | 컴프레서 |
| **FX** | saturate, drive | 새츄레이터 |
| **FX** | loGain, midGain, hiGain, loFreq, hiFreq | EQ |
| **FX** | sideGain, sideRelease | 사이드체인 |
| **빌트인** | attack, release, room, size, delay, delaytime, delayfeedback | Tidal/SuperDirt 기본 |
| **프리셋** | presetName | setPreset 헬퍼용 |

> `attack`, `release`는 Tidal 빌트인 — 별도 pF 불필요. `spread`는 `clapSpread`, `mix`는 `sawMix`으로 사용 (Tidal 콤비네이터 충돌 방지).

**라이브 녹음:**
```bash
npm run live:record    # SC s.record 시작 → out/audio/{date}_{title}/live-recording.wav
npm run live:stop      # 녹음 종료 + 파일 finalize
```

**라이브 종료:**
```bash
npm run live:stop      # SIGTERM → 3초 대기 → SIGKILL. 좀비 0. 녹음 중이면 자동 finalize
```

---

### 2. 프로덕션 모드 (라이브 세션 → 트랙)

라이브 세션을 상업 품질 트랙으로 변환하는 3단계 파이프라인:

```bash
# Step 1: OSC 로그 → NRT Score 변환
npm run prod:convert out/osclog/session_2026-03-27_21-00_part0.osclog
# 디렉토리 입력도 가능 (멀티파트 자동 병합):
npm run prod:convert out/osclog/

# Step 2: NRT Score → 4스템 WAV
npm run render:stems out/osclog/nrt-score.nrt.json -- --title=my-track
# → out/audio/2026-03-27_my-track/stems/stem-{drums,bass,synth,fx}.wav

# Step 3: 스템 → 마스터 (loudnorm -14 LUFS)
# (render:prod는 1-3을 원커맨드로 실행)
npm run render:prod out/osclog/session.osclog
```

**프로덕션 출력 구조:**
```
out/audio/2026-03-27_my-track/
├── stems/
│   ├── stem-drums.wav       # 48kHz 32-bit float
│   ├── stem-bass.wav
│   ├── stem-synth.wav
│   └── stem-fx.wav
├── master.wav               # 48kHz 16-bit PCM, -14 LUFS, TP ≤ -2 dBTP
├── session-info.json         # BPM, key, duration, stems, event summary
├── IMPORT-GUIDE.md           # DAW 임포트 안내
└── raw/
    ├── session.osclog        # 원본 OSC 로그
    └── nrt-score.osc         # NRT 바이너리 Score
```

**OSC 로그 형식 (JSONL):**
```jsonl
{"ts":0.000,"s":"kick","n":0,"orbit":0,"amp":1.0,"compress":0.7}
{"ts":0.125,"s":"hat","n":0,"orbit":1,"openness":0.3,"tone":0.5}
{"ts":0.250,"s":"supersaw","n":4,"orbit":2,"cutoff":3000,"room":0.5}
```

10분마다 자동 분할: `session_YYYY-MM-DD_HH-MM_partN.osclog`

**NRT 스템 라우팅:**

| 스템 | Bus | SynthDefs |
|------|-----|-----------|
| drums | 0-1 | kick, hat, clap + Dirt-Samples (bd, sd, hh, cp...) |
| bass | 2-3 | bass |
| synth | 4-5 | supersaw, pad, lead, arp_pluck |
| fx | 6-7 | riser |

**NRT FX 체인** (각 스템에 적용):
```
sidechain → compressor → saturator → EQ → reverb → delay
```

**NRT 지원 SynthDef (14종):**
- Instruments 9종: kick, bass, hat, clap, supersaw, pad, lead, arp_pluck, riser
- FX 4종: customCompressor, customSaturator, customEQ, customSidechain
- NRT 전용: nrtPlayBuf (Dirt-Samples), nrtReverb (FreeVerb), nrtDelay (CombL), nrt_sidechain_send

**Dirt-Samples NRT** (v0.2):
- 라이브에서 사용한 Dirt-Samples (bd, sd, hh 등 15종)가 NRT에서도 재생
- Buffer.read + PlayBuf 방식으로 샘플 파일 해석
- n 파라미터 → 폴더 내 N번째 파일 (래핑)

---

### 3. NRT 모드 (scene.json 기반)

```bash
npm run render:audio
# scene.json → BPM 역산 → SC NRT → loop crossfade → loudnorm → master.wav
```

**scene.json audio 설정:**
```jsonc
{
  "audio": {
    "bpm": 128,                 // optional — 없으면 duration에서 자동 역산
    "key": "Am",                // 24키 (C, Cm, C#, C#m, ... B, Bm). default: "Am"
    "scale": "minor",           // major | minor | dorian | phrygian | mixolydian
    "genre": "techno",          // techno | trance | house | dnb | ambient
    "energy": 0.7,              // 0~1 전체 에너지
    "preset": "hard_techno"     // optional, 사운드 프리셋 (genre와 독립)
  }
}
```

**NRT 렌더 파이프라인:**
```
scene.json → [1] deps check → [2] BPM 역산 (bars×4×60/bpm = duration ±0.001s)
→ [3] SC config → sclang render-nrt.scd → scsynth -N → stem-master.wav
→ [4] loop-crossfade.sh (sox 2s crossfade) → [5] ffmpeg loudnorm (-14 LUFS)
→ [6] ffprobe 검증 → master.wav (48kHz 16-bit PCM)
```

---

### 4. 프리셋

**기본 5종:**

| 프리셋 | BPM | 특성 |
|--------|-----|------|
| `hard_techno` | 140-155 | aggressive kick (drive 0.8), heavy compression (0.85), saturation (0.65) |
| `melodic_techno` | 120-130 | warm pads (attack 2.5), subtle FX (compress 0.4), wide supersaw (mix 0.8) |
| `industrial` | 130-145 | max distortion (drive 0.95), harsh EQ (hiGain -1), extreme compression (0.9) |
| `psytrance` | 138-148 | acid bass (resonance 0.75, envAmount 0.85), bright top (hiGain 3), fast arp |
| `progressive_trance` | 128-138 | lush pads (attack 3.5), gentle FX (compress 0.3), wide supersaw (mix 0.9) |

**Tidal에서 전환:**
```haskell
setPreset "hard_techno"    -- 즉시 전환 (다음 사이클부터 적용)
setPreset "psytrance"
getPreset                  -- 현재 프리셋 확인
```

**커스텀 프리셋:**
```bash
npm run preset:save my_sound           # 현재 프리셋 → audio/presets/user/my_sound.json
npm run preset:save my_sound --force   # 덮어쓰기
npm run preset:list                    # 기본 5종 + 유저 프리셋 목록
```

Tidal에서 유저 프리셋도 동일하게 호출:
```haskell
setPreset "my_sound"
```

**프리셋 JSON 구조:**
```json
{
  "name": "hard_techno",
  "bpm": { "min": 140, "max": 155, "default": 145 },
  "synthParams": {
    "kick": { "drive": 0.8, "click": 0.7, "decay": 0.3 },
    "bass": { "cutoff": 1500, "resonance": 0.5, "envAmount": 0.7 },
    "...": "..."
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

---

## SynthDef 파라미터 레퍼런스

모든 SynthDef 공통: `out`, `freq`, `amp`, `dur`, `pan`

| SynthDef | 고유 파라미터 | 설명 |
|----------|-------------|------|
| **kick** | `drive` (0-1), `click` (0-1), `decay` (초) | 사인파 킥 + pitch env + distortion |
| **bass** | `cutoff` (Hz), `resonance` (0-1), `envAmount` (0-1) | 톱니파 + 레조넌트 LP 필터 |
| **hat** | `openness` (0=closed, 1=open), `tone` (0-1) | 노이즈 하이햇 |
| **clap** | `spread` (0-1, FreeVerb mix), `decay` (초) | 다중 노이즈 버스트 + reverb |
| **supersaw** | `detune` (0-1), `mix` (0-1), `cutoff` (Hz) | 7-voice detuned saw |
| **pad** | `attack` (초), `release` (초), `filterEnv` (0-1) | 느린 attack + LP sweep |
| **lead** | `vibrato` (0-1), `portamento` (초), `drive` (0-1) | 모노 리드 + 비브라토 |
| **arp_pluck** | `decay` (초), `brightness` (0-1) | 짧은 pluck (아르페지오) |
| **riser** | `sweepRange` (Hz), `noiseAmount` (0-1) | 상승 pitch sweep (빌드업) |

## FX 파라미터 레퍼런스

| FX | 파라미터 | 설명 |
|----|---------|------|
| **Compressor** | `compress` (0-1), `threshold` (dB), `ratio`, `compAttack` (초), `compRelease` (초) | 다이나믹 압축 |
| **Sidechain** | `sideGain` (0-2), `sideRelease` (초) | kick-driven ducking (cross-orbit bus 100) |
| **Saturator** | `saturate` (0-1), `drive` (0-1) | 웜 디스토션 |
| **EQ** | `loGain` (dB), `midGain` (dB), `hiGain` (dB), `loFreq` (Hz), `hiFreq` (Hz) | 3밴드 EQ |
| **Reverb** | `room` (0-1), `size` (0-1), `dry` (0-1) | FreeVerb (NRT: nrtReverb) |
| **Delay** | `delaytime` (초), `delayfeedback` (0-1), `dry` (0-1) | CombL (NRT: nrtDelay) |

---

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

---

## 테스트

```bash
# 전체 vitest (338 tests)
npm run test

# SC SynthDef NRT + RMS 검증
npm run audio:test

# SC 개별 테스트
sclang audio/sc/test-synthdefs.scd   # SynthDef 9종 NRT + RMS (9 tests)
sclang audio/sc/test-patterns.scd    # Bjorklund + 패턴 (11 tests)
sclang audio/sc/test-trance.scd      # 코드/arp/레이어/매크로 (12 tests)
```

### 테스트 커버리지 (338 tests)

| 영역 | 파일 | 테스트 수 |
|------|------|----------|
| scene-schema | `src/lib/scene-schema.test.ts` | 30 |
| bpm-calculator | `src/lib/bpm-calculator.test.ts` | 10 |
| render-audio-utils | `scripts/lib/render-audio.test.ts` | 11 |
| render-av | `scripts/lib/render-av.test.ts` | 10 |
| scene-loader | `src/lib/scene-loader.test.ts` | 8 |
| osc-logger | `scripts/lib/osc-logger.test.ts` | 15 |
| osc-to-nrt | `scripts/lib/osc-to-nrt.test.ts` | 28 |
| stem-render | `scripts/lib/stem-render.test.ts` | 18 |
| prod-pipeline | `scripts/lib/prod-pipeline.test.ts` | 17 |
| genre-preset | `scripts/lib/genre-preset.test.ts` | 31 |
| e2e-integration | `scripts/lib/e2e-integration.test.ts` | 44 |
| 기타 (validators, shaders) | 여러 파일 | 나머지 |
| **SC SynthDefs** | test-synthdefs/patterns/trance.scd | 32 (별도) |

---

## 보안

| 위협 | 방어 |
|------|------|
| Shell injection | `execFile` (array-form) 전용. `exec`/`spawn(shell:true)` 금지. 정적 검증 테스트 |
| SC code injection | Zod enum 검증 값만 SC config 보간. 사용자 입력 직접 보간 없음 |
| Path traversal | `validateFilePath()` — realpathSync + startsWith(root + sep). SC: matchRegexp 입력 검증 |
| Preset injection | `/^[a-zA-Z0-9_-]+$/` regex. SC/TS 양쪽 독립 검증 |
| OSC binding | 127.0.0.1:57120 강제 (BootTidal.hs). 0.0.0.0 금지 |
| JSON parsing | SC: try/catch parseJSON (크래시 방지). TS: JSON.parse + Zod 이중 검증 |
| Concurrent execution | `.live.lock` + `.render.lock` + try/finally cleanup |
| Disk exhaustion | `df -k` 기반 2x 안전 마진 사전 체크 |
| Variable expansion | 모든 .sh: `"$VAR"` 따옴표 + `set -euo pipefail` |

---

## 출력 스펙

| 항목 | 값 |
|------|---|
| 스템 포맷 | WAV 48kHz 32-bit float |
| 마스터 포맷 | WAV 48kHz 16-bit PCM |
| Loudness | -14 LUFS integrated |
| True peak | ≤ -2 dBTP |
| Duration 정밀도 | scene.json duration ± 0.001s |
| AV sync | < 50ms (ffprobe 검증) |
| 결정론적 NRT | `thisThread.randSeed_(42)` — 동일 입력 → 동일 WAV |
| 스템 위상 정합 | RMS diff < -60dB (4스템 합산 = 원본) |

---

## npm scripts 전체

| Script | 설명 |
|--------|------|
| `audio:setup` | 의존성 설치 + SC 검증 |
| `audio:test` | SC SynthDef NRT 테스트 |
| `live:start` | SC + SuperDirt + Tidal 스택 부팅 |
| `live:stop` | 전체 스택 종료 (SIGTERM → SIGKILL) |
| `live:record` | 라이브 녹음 (SC s.record) |
| `live:log` | 라이브 + OSC 로깅 (= live:start --log) |
| `prod:convert` | OSC 로그 → NRT Score 변환 |
| `render:stems` | NRT Score → 4스템 WAV (sclang + ffmpeg) |
| `render:prod` | 원커맨드 프로덕션 (변환→스템→마스터) |
| `render:audio` | scene.json → master.wav (NRT) |
| `render:av` | 비디오 + 오디오 → final.mp4 |
| `preset:save` | 유저 프리셋 저장 |
| `preset:list` | 프리셋 목록 |

---

## 아키텍처

```
                    ┌─────────────────────────────────────────────┐
                    │            Audio System v2                   │
                    │                                             │
  ┌─────────────────┴─────────────────┐  ┌───────────────────────┴──┐
  │         LIVE MODE                  │  │    PRODUCTION MODE       │
  │                                    │  │                          │
  │  VS Code (tidalvscode)             │  │  .osclog (JSONL)         │
  │       │ Ctrl+Enter                 │  │       │ prod:convert     │
  │  TidalCycles (GHCi)               │  │  osclog2nrt.ts            │
  │       │ OSC 127.0.0.1:57120       │  │       │ SynthDef 매핑     │
  │  SuperDirt (SC)                   │  │  .nrt.json                │
  │       ├── Dirt-Samples             │  │       │ render:stems     │
  │       ├── SynthDefs (9종)          │  │  render-stems-nrt.scd    │
  │       ├── FX (comp/side/sat/eq)    │  │       │ scsynth -N -o 8  │
  │       ├── Genre Presets (5종)      │  │  8ch WAV → ffmpeg split  │
  │       └── OSC Logger (--log)       │  │       │                  │
  │       │                            │  │  stems/*.wav (4x 2ch)    │
  │  Audio Output + s.record           │  │       │ loudnorm         │
  │                                    │  │  master.wav (-14 LUFS)   │
  └────────────────────────────────────┘  └──────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │                        NRT MODE                                  │
  │  scene.json → BPM 역산 → render-nrt.scd → scsynth -N            │
  │  → loop-crossfade.sh → loudnorm → master.wav                    │
  └──────────────────────────────────────────────────────────────────┘
```

---

## 트러블슈팅

| 문제 | 해결 |
|------|------|
| `sclang not found` | `export PATH="/Applications/SuperCollider.app/Contents/MacOS:$PATH"` |
| `ffmpeg not found` | `brew install ffmpeg` |
| `SuperDirt not found` | SC에서 `Quarks.install("SuperDirt"); thisProcess.recompile` |
| `live:start` 실패 | `npm run live:stop` 후 재시도. `.live.lock` 수동 삭제 |
| `render:stems` 실패 | `.render.lock` 수동 삭제. sclang PATH 확인 |
| 포트 57120 사용 중 | `lsof -i :57120` 으로 확인 후 프로세스 종료 |
| OSC 로그 비어있음 | `live:log`로 시작했는지 확인 (일반 `live:start`는 로깅 안 함) |
| 프리셋 전환 안 됨 | `setPreset` 사용 (NOT `setGenre`). 프리셋명 확인: `npm run preset:list` |
| SC 크래시 | 자동 재시작 (live-start.ts onCrash). 10초 내 복구 |
| 디스크 부족 녹음 중단 | 녹음 자동 중단 + 기존 파일 보호. 디스크 정리 후 재시작 |
