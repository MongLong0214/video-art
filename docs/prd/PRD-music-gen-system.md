# PRD: Techno/Trance Music Generation System

**Version**: 0.3
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-26
**Status**: Approved
**Size**: XL (3-Phase 분할 배포)

---

## 1. Problem Statement

### 1.1 Background
video-art 프로젝트는 Three.js + GLSL 기반 루핑 비디오 아트를 생성한다. 현재 시각적 출력만 존재하며, 결과물에 어울리는 사운드트랙이 없다. 테크노/트랜스 전자음악은 반복적 루프 구조와 시각 아트의 사이키델릭 미학과 본질적으로 잘 맞는다.

### 1.2 Problem Definition
video-art 프로젝트의 비주얼에 동기화되는 테크노/트랜스 음악을 코드 기반으로 생성하는 프로덕션 급 시스템이 없다.

### 1.3 Impact of Not Solving
- 비디오 아트 결과물이 무음으로만 존재하여 완성도 부족
- 오디오-비주얼 통합 작품 제작 불가
- 라이브 퍼포먼스/설치 작품으로 확장 불가

## 2. Goals & Non-Goals

### 2.1 Goals (Phase A — SuperCollider Core)
- [ ] G1: SuperCollider 기반 신스 엔진으로 테크노/트랜스 음색 생성 (kick, bass, hat, clap, supersaw, pad, lead, arp_pluck, riser)
- [ ] G2: SC Pbind/Pdef 기반 테크노 패턴 시스템 (유클리드/확률/마이크로 변형)
- [ ] G3: SC Pbind/Routine 기반 트랜스 시퀀서 (코드 진행, 아르페지오, 프레이즈 구조)
- [ ] G4: SC NRT 렌더 파이프라인으로 스템 내보내기 + ffmpeg 믹스다운 (WAV)
- [ ] G5: video-art Clock과 동기화하여 루프 길이/BPM 일치
- [ ] G6: 곡 구조 에너지 씬 — 섹션(인트로/빌드/브레이크/드롭/아웃트로) 기반 매크로 오토메이션

### 2.2 Goals (Phase B — TidalCycles, 후속)
- [ ] G7: TidalCycles 기반 라이브 패턴 + OSC 캡처 → SC NRT 변환

### 2.3 Goals (Phase C — FAUST DSP, 후속)
- [ ] G8: FAUST 기반 커스텀 DSP 이펙트 (acid filter, trance gate, saturator, delay)

### 2.4 Non-Goals
- NG1: DAW GUI 구현 (외부 DAW 사용)
- NG2: JUCE 플러그인 패키징 (후속)
- NG3: Max/MSP/Pure Data 통합 (후속)
- NG4: 실시간 WebAudio API 브라우저 재생 (오프라인 NRT 렌더만)
- NG5: AI/ML 기반 자동 작곡 (규칙 기반 생성만)
- NG6: 스케치별 음악 프리셋 매핑 (Phase A에서는 단일 default 프리셋만 지원)

## 3. User Stories & Acceptance Criteria

### US-1: SuperCollider SynthDef 라이브러리
**As a** 음악 프로듀서, **I want** 테크노/트랜스 필수 음색을 SynthDef로 사용할 수 있기를, **so that** 코드로 음악을 조합할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: `sclang -i none` (headless)으로 모든 SynthDef 로드 시 에러 0, stdout에 "ERROR" 문자열 0
- [ ] AC-1.2: 최소 9종 SynthDef — kick, bass, hat, clap, supersaw, pad, lead, arp_pluck, riser
- [ ] AC-1.3: 각 SynthDef에 freq/amp/dur/pan + 음색별 커스텀 파라미터 (cutoff, resonance, drive 등) 노출
- [ ] AC-1.4: 각 SynthDef를 단독으로 NRT 렌더하는 테스트 스크립트 존재, 출력 WAV의 RMS > -60dBFS (무음 아님)

### US-2: SC Pdef 테크노 패턴 엔진
**As a** 테크노 프로듀서, **I want** SC Pdef로 패턴 변형/확률 트리거/유클리드 리듬을 쓸 수 있기를, **so that** 테크노 특유의 미세 변형 루프를 만들 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: 유클리드 리듬 패턴 최소 3종 (kick, hat, clap) — Bjorklund 알고리즘 사용, SC Pbjorklund 또는 동등 구현
- [ ] AC-2.2: 확률 트리거 패턴 — 각 패턴에 최소 1개의 Pwrand/Prand 확률 요소 포함, 8~32마디 길이
- [ ] AC-2.3: 마이크로 변형 — 2/4/8마디마다 hat density, clap 위치, filter cutoff 중 최소 1개 파라미터가 Pseg/Penv로 변화
- [ ] AC-2.4: NRT 스코어 내에서 filter cutoff / delay feedback 파라미터를 시간축으로 Pseg 오토메이션 (sclang REPL 실시간 조작은 별도 프리뷰 모드)

### US-3: SC 트랜스 시퀀서
**As a** 트랜스 프로듀서, **I want** Pbind/Routine으로 코드 진행 + 아르페지오 + 레이어를 시퀀싱할 수 있기를, **so that** 트랜스 구조(인트로/빌드/브레이크/메인/아웃트로)를 코드로 만들 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: 코드 진행 엔진 — 지정된 스케일(예: Am)의 음만 사용하는 4~8코드 진행 생성. 검증: 생성된 모든 MIDI 노트가 해당 스케일에 속함을 테스트 스크립트에서 assert
- [ ] AC-3.2: 아르페지오 생성기 — direction(up/down/random), octave span(1~3), gate 패턴 지원
- [ ] AC-3.3: 레이어 매니저 — sub bass / rolling bass / arp / pad / lead / riser 6개 레이어를 독립 Bus에 라우팅, 개별 on/off 제어
- [ ] AC-3.4: 매크로 오토메이션 — filter open, reverb size, stereo width를 Env/Pseg로 32마디 단위 자동화

### US-4: 곡 구조 에너지 씬
**As a** 프로듀서, **I want** 곡 전체를 섹션 단위로 나누어 에너지 곡선을 자동화할 수 있기를, **so that** 인트로→빌드업→드롭→브레이크→아웃트로 같은 전개가 코드로 표현된다.

**Acceptance Criteria:**
- [ ] AC-4.1: SceneScore 포맷 — 섹션 배열 [{name, bars, layers: [...], energy: 0~1}] 정의, SC에서 파싱 가능
- [ ] AC-4.2: 에너지 값에 따라 레이어 on/off + 파라미터 매크로(openness, brightness, distortion) 자동 매핑
- [ ] AC-4.3: 최소 1개 완성 곡 구조 (5 섹션, 총 32~64마디) NRT 렌더 성공

### US-5: NRT 렌더 파이프라인
**As a** 크리에이터, **I want** 코드로 만든 음악을 WAV 스템 + 마스터 파일로 내보낼 수 있기를, **so that** 비디오와 합쳐 완성 작품을 만들 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: SC NRT 모드(`scsynth -N`)로 각 레이어 스템 WAV 내보내기. 포맷: WAV 48kHz 32-bit float. 렌더 시 `thisThread.randSeed_(42)` 고정으로 결정론적 출력
- [ ] AC-5.2: ffmpeg 기반 스템 믹스다운. 타겟: -14 LUFS integrated, true peak ≤ -1 dBTP. 최종 출력: WAV 48kHz 16-bit
- [ ] AC-5.3: 오디오 길이 = LOOP_DUR 정확 일치. Reverb tail 처리: NRT 스코어에 duration + 2초 tail padding으로 렌더 후, seamless loop crossfade (tail의 마지막 2초를 시작 2초에 mix) → 정확한 LOOP_DUR 길이로 trim. 검증: ffprobe duration 오차 ±1 sample (< 0.02ms at 48kHz)
- [ ] AC-5.4: `npm run render:audio` 원커맨드 실행. 렌더 전 디스크 공간 체크 (예상 출력 2배 이상 여유). 실패 시 partial WAV cleanup

### US-6: Video-Audio 동기화
**As a** 오디오비주얼 아티스트, **I want** 비디오 루프와 오디오 루프가 정확히 동기화되기를, **so that** 통합 작품이 자연스럽다.

**Acceptance Criteria:**
- [ ] AC-6.1: scene.json의 duration에서 BPM 자동 역산. 알고리즘: 허용 마디 수 후보(8,16,32,64)와 BPM 범위(100~160)에서 `BPM = bars × 4 × 60 / duration`으로 최적 조합 선택. 정수 마디에 정확히 맞지 않는 경우 가장 가까운 유효 BPM을 선택하고 로그 출력
- [ ] AC-6.2: NRT 스코어의 total duration이 scene.json duration과 일치. 오차 ±1 sample (< 0.02ms at 48kHz). SC TempoClock만 사용 (마스터 클락)
- [ ] AC-6.3: ffmpeg로 비디오+오디오 합성. `ffmpeg -i video.mp4 -i audio.wav -c:v copy -c:a aac -b:a 320k output.mp4`

## 4. Technical Design

### 4.1 Architecture Overview

```
video-art/
├── src/                          # (기존) Three.js 비디오 아트
├── audio/                        # (신규) 오디오 시스템
│   ├── sc/                       # SuperCollider
│   │   ├── synthdefs/            # SynthDef 정의 (.scd)
│   │   ├── patterns/             # Pbind/Pdef 시퀀스 (.scd)
│   │   ├── lib/                  # SC 헬퍼 (scales.scd, chords.scd, utils.scd)
│   │   ├── scores/               # NRT 스코어 (.scd)
│   │   ├── scenes/               # SceneScore 정의 (.scd)
│   │   ├── startup.scd           # SC 부팅 + SynthDef 로드
│   │   └── test-synthdefs.scd    # SynthDef 단독 테스트
│   ├── render/                   # 렌더 파이프라인
│   │   ├── render-stems.scd      # NRT 스템 내보내기
│   │   ├── loop-crossfade.sh     # seamless loop tail crossfade (sox)
│   │   └── merge-av.sh           # ffmpeg 비디오+오디오 합성
│   ├── requirements.txt          # Python 의존성 (있을 경우)
│   └── setup.sh                  # 외부 도구 설치 + 검증 스크립트
├── scripts/
│   ├── render-audio.ts           # npm run render:audio 엔트리
│   └── render-av.ts              # npm run render:av (통합)
└── out/
    └── audio/                    # 렌더 출력
        ├── stems/                # 개별 스템 (WAV 48kHz 32f)
        └── master/               # 마스터 (WAV 48kHz 16bit)
```

> **Phase B 추가 시**: `audio/tidal/` 디렉토리 (boot.hs, techno/*.tidal, lib/)
> **Phase C 추가 시**: `audio/faust/` 디렉토리 (effects/*.dsp, build/, Makefile)

### 4.2 Data Model Changes

**scene.json 확장** (기존 sceneSchema에 audio 필드 추가):

```typescript
// 기존 sceneSchema에 optional audio 블록 추가
audio: z.object({
  bpm: z.number().int().min(60).max(200).optional(),  // 미지정 시 duration에서 자동 역산
  key: z.enum([
    "C", "Cm", "C#", "C#m", "D", "Dm", "D#", "D#m",
    "E", "Em", "F", "Fm", "F#", "F#m",
    "G", "Gm", "G#", "G#m", "A", "Am", "A#", "A#m", "B", "Bm"
  ]).default("Am"),
  scale: z.enum(["major", "minor", "dorian", "phrygian", "mixolydian"]).default("minor"),
  genre: z.enum(["techno", "trance"]).default("techno"),
  energy: z.number().min(0).max(1).default(0.7),
  preset: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),  // sanitized: alphanumeric + _ + - only
}).optional()
```

**주의**: scene-schema.ts에 audio 필드 추가 시, 현재 진행 중인 layered-v2-overhaul 브랜치의 schema와 충돌 여부를 반드시 확인.

### 4.3 Inter-Process Communication Design

**TS → SC 오케스트레이션 방식**: Shell Script 위임

```
render-audio.ts (thin Node.js wrapper)
  │
  ├─ 1. scene.json 읽기 (TS: Zod parse, BPM 역산)
  ├─ 2. SC config 파일 생성 (/tmp/audio-config-{PID}.scd, 렌더 완료 후 cleanup)
  │     ← duration, bpm, key, scale, genre, energy, output paths
  ├─ 3. child_process.execFile('sclang', ['-i', 'none', 'audio/sc/scores/render-nrt.scd'])
  │     ← sclang reads config, generates OSCScore, runs scsynth -N
  │     ← stdout/stderr 파이프로 진행 상태 + 에러 캡처
  │     ← exit code 0 확인, "ERROR" 문자열 감지 시 실패 처리
  ├─ 4. child_process.execFile('bash', ['audio/render/loop-crossfade.sh', ...])
  │     ← tail padding → crossfade → trim to exact duration
  ├─ 5. child_process.execFile('ffmpeg', [...mixdown args...])
  │     ← stems → master WAV (-14 LUFS, -1 dBTP)
  └─ 6. 출력 검증: ffprobe로 duration + RMS 체크
```

**핵심 결정**: TS는 오케스트레이션만 (config 생성 + 프로세스 실행 + 결과 검증). 모든 DSP/음악 로직은 SC 내부. **shell string interpolation 금지** — 모든 외부 프로세스는 `execFile` (array-form arguments) 사용으로 command injection 방지.

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 신스 엔진 | SuperCollider vs CSound vs WebAudio | SuperCollider | 테크노/트랜스 커뮤니티 표준, NRT 렌더, headless 지원 |
| 테크노 패턴 (Phase A) | Tidal vs SC Pdef | **SC Pdef** | NRT 호환, 설치 단순, 유클리드/확률 패턴 SC 자체 구현 가능 |
| 테크노 패턴 (Phase B) | Tidal live only | **Tidal live + OSC dump→NRT** | Tidal은 실시간 전용 → OSC 메시지 캡처 후 SC NRT 변환 필요 |
| 트랜스 시퀀서 | Tidal vs SC Pbind | SC Pbind/Routine | 코드 진행/아르페지오/레이어 정밀 제어, NRT 네이티브 |
| DSP 이펙트 (Phase A) | FAUST→SC vs SC UGen | **SC 내장 UGen** | 설치 없이 즉시 사용. FAUST는 Phase C |
| 렌더 방식 | 실시간 녹음 vs NRT | NRT (`scsynth -N`) | 결정론적(randSeed 고정), headless, 프레임 정확 |
| 믹스다운 | pydub/sox vs ffmpeg | **ffmpeg 직접** | 이미 AV 합성에 필요, 중복 의존성 제거 |
| AV 합성 | ffmpeg | ffmpeg | 표준 도구, 코덱 지원 |
| TS↔SC IPC | node-osc vs child_process | **child_process.execFile** | 단순, shell script 위임, NRT는 one-shot 프로세스 |
| 마스터 클락 | SC TempoClock vs Ableton Link | **SC TempoClock** (NRT) | NRT는 단일 프로세스, Link 불필요 |
| 오디오 포맷 | 32f AIFF vs 32f WAV vs 16bit WAV | **스템: WAV 48kHz 32f, 마스터: WAV 48kHz 16bit** | 스템은 고정밀, 마스터는 DAW/배포 호환 |
| Reverb tail | 단순 trim vs crossfade loop | **tail padding + seamless crossfade** | 루프 경계 아티팩트 방지 |
| BPM 산출 | 고정 BPM vs duration 역산 | **duration 기반 역산** | 비디오 길이에 정확히 맞는 정수 마디 보장 |

### 4.5 BPM Auto-Calculation Algorithm

```
input: duration (seconds), genre
output: { bpm, bars }

bpm_range = genre === "techno" ? [125, 150] : [130, 145]
bar_candidates = [8, 16, 32, 64]

for bars in bar_candidates (ascending):
  bpm = bars * 4 * 60 / duration
  if bpm_range[0] <= bpm <= bpm_range[1]:
    return { bpm: round(bpm, 2), bars }

// fallback: 가장 가까운 유효 조합
// bpm_range 밖이면 range 끝에서 가장 가까운 bars 선택
```

예시: duration=10s, techno → bars=8, bpm=192 (범위 초과) → bars=16, bpm=384 (초과) → 가장 가까운: bars=8, bpm=150 (range cap) → 실제 8bars@150bpm = 12.8s ≠ 10s. **이 경우**: bars=5.something → 정수 마디 불가 → BPM을 우선하여 `bpm=128, bars=round(duration*128/240) = round(5.33) = 5bars` → 5bars@128bpm = 9.375s. 오차 0.625s → fade로 처리.

**최종 결정**: BPM은 항상 역산 알고리즘으로 산출. 정수 마디에 정확히 떨어지지 않는 경우, BPM을 미세 조정하여 `bars × 4 × 60 / bpm = duration` 을 정확히 만족시킨다 (소수점 BPM 허용, 예: 128.57 BPM). 이 방식으로 AC-5.3의 ±1 sample 정확도를 항상 보장한다. SC TempoClock은 소수점 BPM을 지원하므로 구현 제약 없음.

### 4.6 Build System Integration

| 도구 | 패키지 매니저 | 빌드 방법 | 검증 |
|------|-------------|----------|------|
| SuperCollider | `brew install --cask supercollider` | N/A (인터프리터) | `sclang -i none -e "0.exit"` exit 0 |
| ffmpeg | `brew install ffmpeg` | N/A (바이너리) | `ffmpeg -version` exit 0 |
| sox | `brew install sox` | N/A (바이너리) | `sox --version` exit 0 |
| Node.js | 기존 | 기존 vite/tsc | 기존 |

**`audio/setup.sh`**: brew 설치 체인 + 버전 확인 + SC headless 부팅 테스트. 각 단계 실패 시 명확한 에러 메시지.

**package.json 추가 scripts**:
```json
{
  "audio:setup": "bash audio/setup.sh",
  "audio:test": "bash -c 'sclang -i none audio/sc/test-synthdefs.scd'",
  "render:audio": "tsx scripts/render-audio.ts",
  "render:av": "tsx scripts/render-av.ts"
}
```

**추가 npm 의존성**: 없음 (child_process는 Node 내장, tsx는 이미 devDependencies)

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | SuperCollider 미설치 | `render-audio.ts`에서 `which sclang` 체크 → 에러 메시지 + `npm run audio:setup` 안내 | P1 |
| E2 | ffmpeg 미설치 | `which ffmpeg` 체크 → 에러 메시지 + `brew install ffmpeg` 안내. 최소 버전: ffmpeg 5.x | P1 |
| E3 | sox 미설치 | `which sox` 체크 → 에러 메시지 + `brew install sox` 안내 | P1 |
| E4 | scene.json에 audio 필드 없음 | 기본값 적용 (techno, Am, minor, energy 0.7). BPM은 duration에서 역산 | P2 |
| E5 | NRT 렌더 중 SC 크래시 | sclang exit code ≠ 0 또는 stderr에 "ERROR" → 재시도 1회 → 실패 시 에러 로그 + partial cleanup | P1 |
| E6 | Reverb tail 잘림 | NRT에서 duration + 2s tail padding 렌더 → loop-crossfade.sh로 seamless crossfade → exact trim | P1 |
| E7 | BPM 역산 시 정수 마디 불가 | 소수점 BPM 허용 (예: 128.57). `bars × 4 × 60 / bpm = duration` 정확 일치. SC TempoClock 소수점 지원 | P2 |
| E8 | 디스크 공간 부족 | 렌더 전 예상 출력 2배 여유 확인. 부족 시 에러 + 필요 공간 안내 | P2 |
| E9 | 렌더 중복 실행 | PID lock file (`out/audio/.render.lock`) 체크. 이미 실행 중이면 에러 | P2 |
| E10 | NRT 출력 무음 | 렌더 후 ffprobe로 RMS 체크. RMS < -60dBFS 이면 경고 출력 | P2 |
| E11 | scene.json `key` 필드 잘못된 값 | Zod enum 검증으로 파싱 단계에서 거부 | P3 |
| E12 | scene.json `preset` 필드 injection 시도 | `z.string().regex(/^[a-zA-Z0-9_-]+$/)` 검증. 불일치 시 파싱 거부 | P1 |

## 6. Security & Permissions

### 6.1 Authentication
N/A — 로컬 전용 시스템. 네트워크 접근 없음.

### 6.2 Authorization
N/A — 단일 사용자 로컬 개발 환경.

### 6.3 Data Protection
- 생성된 오디오 파일은 `out/audio/`에만 저장
- 외부 전송 없음
- **Shell command injection 방지**: 모든 외부 프로세스 호출은 `child_process.execFile` (array-form) 사용. string interpolation으로 shell 명령 구성 금지
- **FAUST .dsp 보안 (Phase C)**: FAUST 컴파일은 native code 생성 → 프로젝트 소유 .dsp 파일만 컴파일. 모든 .dsp를 git 추적하여 무결성 검증

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| SynthDef 로드 시간 | < 5s (headless) | `time sclang -i none startup.scd` |
| NRT 렌더 속도 | 10초 곡 < 30초 렌더 | `time scsynth -N ...` |
| 스템 포맷 | WAV 48kHz 32-bit float | `ffprobe` |
| 마스터 포맷 | WAV 48kHz 16-bit, -14 LUFS | `ffmpeg loudnorm` |
| 마스터 duration | = LOOP_DUR ± 1 sample | `ffprobe duration` |
| 출력 RMS | > -60 dBFS (무음 아님) | `ffmpeg volumedetect` |

### 7.1 Monitoring & Alerting
- 렌더 스크립트 exit code + stderr ERROR 문자열 감지
- SC 프로세스 타임아웃: NRT 렌더 120초 초과 시 kill + 에러
- 출력 파일 존재 + duration + RMS 자동 검증
- SC headless 환경: `sclang -i none` 플래그 사용, GUI 의존성 없음. `scsynth -N` NRT 모드는 오디오 디바이스 불필요

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- scene.json audio 스키마 검증 (valid/invalid cases)
- BPM 역산 알고리즘 (다양한 duration + genre 조합)
- preset 필드 sanitization (injection 시도 거부)
- render-audio.ts 의존성 체크 로직

### 8.2 Integration Tests (sclang + shell)
- SC 부팅 → SynthDef 로드 → 에러 0 (`sclang -i none`, stdout "ERROR" 0)
- 각 SynthDef 단독 NRT 렌더 → WAV 존재 + RMS > -60dBFS
- 전체 파이프라인: scene.json → NRT 스템 → crossfade → mixdown → AV 합성
- 출력 duration 검증 (ffprobe, 오차 ±1 sample)

### 8.3 Edge Case Tests
- audio 필드 없는 scene.json 처리
- 극단적 duration (3s, 60s)
- SC/ffmpeg/sox 미설치 환경 graceful 실패
- 무음 스템 감지

### 8.4 SC Headless 환경 요구사항
- 모든 SC 테스트는 `sclang -i none` (headless, GUI 없음)으로 실행
- NRT 모드(`scsynth -N`)는 오디오 디바이스 불필요
- SSH 세션/CI에서 동작 보장

## 9. Rollout Plan

### 9.1 Phased Delivery

**Phase A (이번 XL 범위 — SC Core)**: 독립 가치 제공
- US-1 (SynthDefs) → US-2 (패턴) → US-3 (시퀀서) → US-4 (에너지 씬) → US-5 (렌더) → US-6 (AV 동기화)
- 의존성: SuperCollider + ffmpeg + sox만
- 완료 시: `npm run render:audio`로 테크노/트랜스 음악 WAV 생성 + `npm run render:av`로 비디오 합성

**Phase B (후속 — TidalCycles)**: Phase A 완료 후
- Tidal 설치 (GHCup + cabal + SuperDirt)
- Tidal 실시간 패턴 프리뷰
- OSC dump → SC NRT 변환 파이프라인
- Phase A의 SC Pdef 패턴과 공존 (Tidal은 라이브 전용 옵션)

**Phase C (후속 — FAUST DSP)**: Phase A 완료 후
- FAUST 설치 + faust2supercollider 빌드 체인
- 빌드 요구사항: faust2supercollider, SC 소스 헤더, Xcode CLT, cmake 3.x+
- 커스텀 이펙트 4종 → SC 플러그인으로 빌드
- Phase A의 SC 내장 UGen을 FAUST 이펙트로 교체 (하위 호환)

### 9.2 Migration Strategy
- scene-schema.ts에 `audio` optional 필드 추가 (하위 호환)
- 기존 scene.json 파일은 변경 불필요 (audio 없으면 기본값)
- layered-v2-overhaul 브랜치와 schema 충돌 확인 필수 (audio는 top-level optional이므로 충돌 가능성 낮음)

### 9.3 Feature Flag
N/A — 새 디렉토리/스크립트 추가. 기존 `tsc && vite build` 빌드에 영향 없음.

### 9.4 Rollback Plan
완전 롤백 체크리스트:
1. `audio/` 디렉토리 삭제
2. `scripts/render-audio.ts`, `scripts/render-av.ts` 삭제
3. `src/lib/scene-schema.ts`에서 audio 필드 제거
4. `package.json`에서 audio:*/render:audio/render:av scripts 제거
5. `out/audio/` 출력 디렉토리 삭제
6. `.gitignore`에서 audio 관련 항목 제거

## 10. Dependencies & Risks

### 10.1 Dependencies (Phase A)
| Dependency | Install | Status | Risk if Delayed | Fallback |
|-----------|---------|--------|-----------------|----------|
| SuperCollider 3.13+ | `brew install --cask supercollider` | 미설치 | **전체 차단** | 없음 (필수) |
| ffmpeg 5.x+ | `brew install ffmpeg` | 확인 필요 | 믹스다운 + AV 합성 차단 | 없음 (필수) |
| sox | `brew install sox` | 확인 필요 | crossfade 차단 | ffmpeg으로 대체 가능 |

### 10.2 Dependencies (Phase B/C — 후속)
| Dependency | Install | Fallback |
|-----------|---------|----------|
| GHCup + cabal | `curl --proto '=https' ... \| sh` | SC Pdef (Phase A) |
| TidalCycles | `cabal install tidal` | SC Pdef (Phase A) |
| FAUST | `brew install faust` | SC 내장 UGen (Phase A) |
| SC Source Headers | `brew install supercollider --HEAD` | Phase C 지연 |
| cmake 3.x+ | `brew install cmake` | Phase C 지연 |

### 10.3 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| SC arm64 호환 이슈 | 낮음 | 높음 | brew cask 최신 버전 + setup.sh 검증 |
| SC headless NRT 실패 | 낮음 | 높음 | `sclang -i none` + `scsynth -N` 테스트 우선 |
| NRT 랜덤 시드 비결정론성 | 낮음 | 중간 | `thisThread.randSeed_(42)` 강제 |
| BPM/마디 불일치 | 중간 | 중간 | 역산 알고리즘 + fade 처리 |
| Reverb tail 루프 아티팩트 | 중간 | 중간 | 2s tail padding + crossfade |
| layered-v2 schema 충돌 | 낮음 | 낮음 | audio는 top-level optional, 병합 전 확인 |
| 기존 빌드 깨짐 | 낮음 | 높음 | audio 코드는 `tsc && vite build` 범위 밖 (.scd/.sh), TS 변경은 schema만 |
| Phase B OSC→NRT 변환 복잡도 | 높음 | 중간 | Phase B 착수 전 PoC 검증 필수. SuperDirt latency 보정, synthDef 매핑, numChannels 설정 차이 사전 조사 |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| SynthDef 가용 수 | 0 | 9+ | `sclang -i none` 로드 테스트, ERROR 0 |
| 테크노 패턴 | 0 | 3+ Pdef | .scd 파일 존재 + NRT 렌더 RMS > -60dBFS |
| 트랜스 시퀀스 | 0 | 1+ 완성 곡 구조 | 5섹션 NRT 렌더 성공 |
| 원커맨드 렌더 | 불가 | `npm run render:audio` | exit 0 + WAV 존재 + duration 일치 |
| 마스터 품질 | N/A | -14 LUFS, peak ≤ -1dBTP | ffmpeg loudnorm 측정 |
| AV 통합 출력 | 불가 | `npm run render:av` → .mp4 | 파일 존재 + 재생 가능 |

## 12. Open Questions

- [x] ~~OQ-1: Tidal 설치 실패 시 SC Pdef만으로 충분한가?~~ → **해결: Phase A는 SC Pdef만 사용. Tidal은 Phase B 옵션**
- [x] ~~OQ-2: NRT reverb tail 처리?~~ → **해결: duration + 2s tail padding → seamless crossfade → trim (AC-5.3)**
- [x] ~~OQ-3: 스케치별 음악 프리셋 매핑?~~ → **해결: Phase A는 단일 default 프리셋. 스케치별 매핑은 Phase B/C에서 검토 (NG6)**

---

## Changelog

### v0.2 (2026-03-26) — Phase 2 Round 1 리뷰 반영
- **[P0 fix]** §4.3 Inter-Process Communication Design 신설 (TS↔SC execFile 방식)
- **[P0 fix]** TidalCycles를 Phase B로 분리 (NRT 구조적 불가능성 해소), Phase A는 SC Pdef 단독
- **[P0 fix]** FAUST를 Phase C로 분리. Phase A는 SC 내장 UGen
- **[P0 fix]** AC-2.4 "실시간" 모호성 해소 → NRT Pseg 오토메이션 명확화
- **[P1 fix]** §9.1 Phased Delivery (A/B/C) 추가
- **[P1 fix]** §4.6 Build System Integration + setup.sh 명세
- **[P1 fix]** E2(ffmpeg), E3(sox) 미설치 처리 추가
- **[P1 fix]** E12 command injection 방지 (preset regex 검증 + execFile)
- **[P1 fix]** AC-6.2 동기화 tolerance 명시 (±1 sample)
- **[P1 fix]** §4.5 BPM 역산 알고리즘 명세
- **[P1 fix]** US-4 에너지 씬 User Story + AC 신설 (G7 대응)
- **[P1 fix]** 오디오 포맷 표준 확정 (스템 32f, 마스터 16bit)
- **[P1 fix]** NRT randSeed 고정 정책 (AC-5.1)
- **[P1 fix]** AC-2.1~2.3 측정 가능 기준 구체화
- **[P1 fix]** AC-3.1 스케일 검증 명시
- **[P2 fix]** OQ-1,2,3 모두 해결
- **[P2 fix]** key 필드 z.enum 검증
- **[P2 fix]** 롤백 체크리스트 완성 (§9.4)
- **[P2 fix]** 디스크 공간 + 동시 렌더 + 무음 감지 edge case 추가
- **[P2 fix]** SC headless 환경 요구사항 (§8.4)
- **[P2 fix]** package.json 변경사항 명시
- **[P2 fix]** 성공 지표에 품질 게이트 추가 (RMS, LUFS, duration)

### v0.2.1 (2026-03-26) — Boomer 수렴 루프 Round 1
- **[P1 fix]** §4.5 BPM 역산: 소수점 BPM 허용으로 AC-5.3(±1 sample) 모순 해소. fade-out 제거
- **[P2 fix]** §4.3 임시 config 경로를 PID 기반(`/tmp/audio-config-{PID}.scd`)으로 변경 + cleanup 정책
- **[P2 fix]** §10.3 Phase B OSC→NRT 변환 복잡도 리스크 추가
