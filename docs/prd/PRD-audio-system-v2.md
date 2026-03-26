# PRD: Audio System v2 — Live Performance + Production Pipeline

**Version**: 0.1
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-26
**Status**: Draft
**Size**: XL (Phase B = 실시간 + 프로덕션 듀얼 모드)

---

## 1. Problem Statement

### 1.1 Background
video-art Phase A에서 SuperCollider NRT 기반 오디오 시스템을 구축했다. 9종 SynthDef, 유클리드 패턴, 에너지 씬, `npm run render:audio` 원커맨드 파이프라인이 작동한다. 그러나 생성되는 오디오는 "프로그래밍된 드럼머신" 수준 — scene.json의 5개 파라미터(genre/key/scale/bpm/energy)로는 프로 수준 전자음악에 필요한 표현력에 한참 못 미친다.

레퍼런스 아티스트: Amelie Lens (하드 테크노), Charlotte de Witte (인더스트리얼 테크노), Daniel Levak (멜로딕 테크노), Astrix (사이트랜스), Ace Ventura (프로그레시브 사이트랜스).

### 1.2 Problem Definition
1. **음질 부족**: 이펙트 체인(reverb/delay/comp/sidechain/EQ) 없이 raw 오실레이터 출력 → 아마추어 사운드
2. **실시간 피드백 없음**: NRT 렌더만 가능. 수정 → 렌더 → 듣기 사이클이 느려 창작 흐름 단절
3. **라이브 퍼포먼스 불가**: 실시간 오디오 합성/패턴 조작 모드가 없음
4. **패턴 표현력 부족**: SC Pdef는 장황. 즉흥적 패턴 변형, 실시간 레이어 조합이 어려움
5. **프로덕션 파이프라인 미완**: 스템 분리, DAW 워크플로우, 마스터링 자동화 없음

### 1.3 Impact of Not Solving
- 생성 오디오가 상업적 가치 없음 (판매 불가)
- 라이브 퍼포먼스 활동 불가
- 비디오 아트 + 오디오 통합 작품이 "데모" 수준에 머무름

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: 프로페셔널 이펙트 체인 — Reverb, Delay, Compressor, Sidechain, EQ, Saturator를 SC Bus 아키텍처로 구현. 개별 on/off + 파라미터 실시간 제어
- [ ] G2: SuperDirt 통합 — 프로급 드럼 샘플팩 + 커스텀 SynthDef을 SuperDirt에 등록. 샘플 + 합성 혼합 사용
- [ ] G3: TidalCycles 라이브 코딩 — 실시간 패턴 작성/수정, 즉흥 연주, 라이브 퍼포먼스 가능
- [ ] G4: 듀얼 모드 아키텍처 — LIVE MODE (실시간 재생) + PRODUCTION MODE (NRT → 스템 → DAW)
- [ ] G5: 라이브 퍼포먼스 시스템 — 노트북 1대로 TidalCycles + SuperDirt + 비주얼(선택) 통합 퍼포먼스
- [ ] G6: 프로덕션 파이프라인 — Tidal 세션 → OSC 캡처 → NRT 렌더 → 스템 WAV → DAW 임포트 → 마스터링
- [ ] G7: 멀티 장르 지원 — 하드 테크노, 멜로딕 테크노, 인더스트리얼, 사이트랜스, 프로그레시브 트랜스

### 2.2 Non-Goals
- NG1: DAW 자체 개발 (Ableton/Logic 사용)
- NG2: GUI 컨트롤러/미디 매핑 (Phase C)
- NG3: 멀티 플레이어 라이브 잼 (솔로 퍼포먼스만)
- NG4: AI 자동 작곡 (Isaac이 직접 작곡. Claude는 도구/코드 지원)
- NG5: 비주얼 싱크 정밀 구현 (부가기능, 기본 OSC 브릿지만)
- NG6: iOS/모바일 지원

## 3. User Stories & Acceptance Criteria

### US-1: SC 이펙트 체인
**As a** 프로듀서, **I want** 각 SynthDef 출력에 프로페셔널 이펙트(reverb/delay/comp/sidechain/EQ/saturation)를 적용할 수 있기를, **so that** raw 오실레이터가 아닌 프로덕션급 사운드를 얻을 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: SC FX Bus 아키텍처 — 개별 SynthDef → 전용 Bus → FX Chain → Master Bus. 최소 4개 FX Bus (drums/bass/synth/fx)
- [ ] AC-1.2: 6종 FX SynthDef — `\fx_reverb`, `\fx_delay`, `\fx_compressor`, `\fx_sidechain`, `\fx_eq`, `\fx_saturator`. 각각 실시간 파라미터 제어 가능
- [ ] AC-1.3: Sidechain Compressor — kick 입력을 트리거로 bass/pad에 사이드체인. ratio/attack/release 조절 가능
- [ ] AC-1.4: Master Bus — limiter + stereo imager. 최종 출력 -14 LUFS 목표
- [ ] AC-1.5: FX 프리셋 — 장르별 FX 파라미터 프리셋 (hard_techno, melodic_techno, psytrance). SC 딕셔너리로 저장

### US-2: SuperDirt + 샘플 통합
**As a** 프로듀서, **I want** 프로급 드럼 샘플과 커스텀 SynthDef을 SuperDirt에서 함께 사용할 수 있기를, **so that** 합성음 + 샘플을 자유롭게 레이어링할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: SuperDirt 설치 + SC Quarks 연동. `SuperDirt.start` 시 에러 0
- [ ] AC-2.2: 기본 샘플팩 (Dirt-Samples) 로드 + 커스텀 샘플 디렉토리 (`audio/samples/`) 추가 가능
- [ ] AC-2.3: Phase A SynthDef 9종을 SuperDirt SynthDef으로 등록. Tidal에서 `s "kick"`, `s "supersaw"` 등으로 호출 가능
- [ ] AC-2.4: FX Chain이 SuperDirt 출력에도 적용 (orbit 기반 라우팅)

### US-3: TidalCycles 라이브 코딩
**As a** 라이브 퍼포머, **I want** TidalCycles로 실시간 패턴을 코딩하면서 즉시 소리를 들을 수 있기를, **so that** 라이브 퍼포먼스에서 즉흥적으로 음악을 만들 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: TidalCycles 설치 (GHCup + cabal + tidal). `import Sound.Tidal.Context` 에러 0
- [ ] AC-3.2: Tidal → SuperDirt OSC 통신 정상 (기본 포트 57120). `d1 $ s "bd"` 입력 시 소리 재생
- [ ] AC-3.3: 에디터 통합 — VS Code Tidal 확장 또는 Pulsar (Atom 후속) 또는 Vim/Neovim. 코드 블록 선택 + 실행
- [ ] AC-3.4: 커스텀 SynthDef를 Tidal에서 호출. `d1 $ s "supersaw" # n "0 4 7" # cutoff 2000`
- [ ] AC-3.5: 멀티 채널 — 최소 4개 d1~d4 독립 패턴 동시 실행

### US-4: Tidal 라이브 퍼포먼스 셋업
**As a** 라이브 퍼포머, **I want** 노트북 1대로 Tidal + SuperDirt + 비주얼 시스템을 운영할 수 있기를, **so that** 공연장에서 오디오비주얼 퍼포먼스를 할 수 있다.

**Acceptance Criteria:**
- [ ] AC-4.1: 원커맨드 라이브 부팅 — `npm run live:start` → SC 서버 부팅 + SuperDirt 시작 + Tidal 에디터 열기
- [ ] AC-4.2: 원커맨드 라이브 종료 — `npm run live:stop` → 모든 프로세스 정리 (좀비 없음)
- [ ] AC-4.3: CPU 사용률 < 50% (MacBook Pro M 시리즈 기준, 4개 패턴 + FX 동시 실행)
- [ ] AC-4.4: 오디오 레이턴시 < 20ms (SuperDirt default 설정)
- [ ] AC-4.5: 라이브 녹음 — 실시간 재생을 WAV로 동시 녹음. `npm run live:record` 토글

### US-5: 프로덕션 파이프라인 (Tidal → 음원)
**As a** 음악 프로듀서, **I want** Tidal 세션에서 작업한 패턴을 NRT 렌더링 + DAW 믹싱을 거쳐 상업용 음원으로 내보낼 수 있기를, **so that** 배포/판매 가능한 품질의 트랙을 제작할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: Tidal 패턴 → OSC 로깅 — 세션 중 모든 OSC 메시지를 타임스탬프와 함께 `.osclog` 파일로 저장
- [ ] AC-5.2: OSC 로그 → NRT 스코어 변환 — `.osclog` → SC Score 포맷 변환. SynthDef 매핑 + 타이밍 보정
- [ ] AC-5.3: 스템 렌더 — NRT 스코어를 Bus별 스템 WAV로 분리 렌더 (drums/bass/synth/fx 최소 4스템). 48kHz 32-bit float
- [ ] AC-5.4: DAW 프로젝트 생성 — Ableton Live Set (.als) 또는 범용 방식으로 스템 임포트 가이드
- [ ] AC-5.5: 마스터링 자동화 — ffmpeg loudnorm (-14 LUFS, TP ≤ -1 dBTP) + 스테레오 처리. `npm run master`

### US-6: 멀티 장르 프리셋
**As a** 프로듀서, **I want** 장르별로 최적화된 SynthDef + FX + 패턴 프리셋을 빠르게 전환할 수 있기를, **so that** 다양한 전자음악 장르를 효율적으로 작업할 수 있다.

**Acceptance Criteria:**
- [ ] AC-6.1: 장르 프리셋 5종 — `hard_techno`, `melodic_techno`, `industrial`, `psytrance`, `progressive_trance`
- [ ] AC-6.2: 각 프리셋에 SynthDef 파라미터 오버라이드 + FX 체인 설정 + BPM 범위 + 드럼 샘플 매핑 포함
- [ ] AC-6.3: Tidal에서 프리셋 전환: `setGenre "hard_techno"` → SynthDef + FX 일괄 변경
- [ ] AC-6.4: 프리셋 커스터마이징 + 저장 가능 (user_preset_name.scd)

## 4. Technical Design

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Audio System v2                            │
│                                                                 │
│  ┌──────────────────────┐    ┌────────────────────────────────┐│
│  │     LIVE MODE        │    │     PRODUCTION MODE            ││
│  │                      │    │                                ││
│  │  Editor (VS Code)    │    │  .osclog (captured session)    ││
│  │       │              │    │       │                        ││
│  │  TidalCycles (GHCi)  │    │  osclog2nrt.ts (converter)    ││
│  │       │ OSC :57120   │    │       │                        ││
│  │  SuperDirt (SC)      │    │  scsynth -N (NRT render)      ││
│  │       │              │    │       │                        ││
│  │  FX Chain (SC Bus)   │    │  Stem WAVs (48kHz 32f)        ││
│  │       │              │    │       │                        ││
│  │  Master Bus          │    │  DAW (Ableton)                ││
│  │       │              │    │       │                        ││
│  │  Audio Output        │    │  Master WAV (-14 LUFS)        ││
│  │  + OSC Logger        │    │                                ││
│  └──────────────────────┘    └────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Shared Layer                                   ││
│  │                                                             ││
│  │  SynthDefs (9+ custom) ──→ SuperDirt SynthDef 등록          ││
│  │  FX SynthDefs (6종) ────→ SC Bus FX Chain                  ││
│  │  Samples (Dirt-Samples + custom) ──→ SuperDirt 로드         ││
│  │  Genre Presets (5종) ───→ SynthDef + FX + BPM 프리셋       ││
│  │  scales/chords/arp lib ─→ 유지 (NRT 렌더용)                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Optional: Visual Sync                          ││
│  │  SC → OSC :9000 → Node.js bridge → Three.js WebSocket      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 SC Bus Architecture (FX Chain)

```
SynthDef 출력 → Private Bus → FX Insert → Master Bus → Out

Bus 할당:
  0-1:    Hardware Output (스피커)
  10-11:  Drums Bus (kick, hat, clap)
  12-13:  Bass Bus (bass, sub_bass)
  14-15:  Synth Bus (supersaw, pad, lead, arp_pluck)
  16-17:  FX Bus (riser, fx returns)
  18-19:  Master Bus (pre-limiter)

FX Chain (Group ordering):
  Group 100: SynthDefs (소스)
  Group 200: Insert FX (EQ, Saturator)
  Group 300: Send FX (Reverb, Delay)
  Group 400: Dynamics (Compressor, Sidechain)
  Group 500: Master (Limiter, Stereo Imager)
```

### 4.3 TidalCycles ↔ SuperDirt IPC

```
TidalCycles (Haskell, GHCi)
    │
    │ OSC messages (:57120)
    │   /dirt/play { s: "kick", n: 0, orbit: 0, ... }
    │
    ▼
SuperDirt (SC Quark)
    │
    │ Triggers SynthDef or plays sample
    │ Routes to orbit-based Bus
    │
    ▼
FX Chain (SC Groups/Buses)
    │
    ▼
Master Out + OSC Logger
```

**OSC 로깅**: SuperDirt의 OSC 수신을 후킹하여 모든 `/dirt/play` 메시지를 타임스탬프와 함께 파일로 저장. 이 로그를 NRT Score로 변환하여 오프라인 렌더 가능.

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 라이브 코딩 엔진 | TidalCycles vs Sonic Pi vs FoxDot | **TidalCycles** | 패턴 표현력 최고, SC 네이티브 통합(SuperDirt), 프로 퍼포머 표준 |
| 샘플 엔진 | SuperDirt vs 커스텀 SynthDef | **SuperDirt** | Tidal 표준 백엔드, 샘플+합성 혼합, orbit 라우팅, 커뮤니티 샘플팩 |
| FX 구현 | SC 내장 UGen vs VST 플러그인 | **SC UGen** | 외부 의존성 없음, NRT 호환, 실시간+오프라인 동일 코드 |
| DAW | Ableton vs Logic vs FL Studio | **Ableton Live** | 전자음악 업계 표준, 스템 임포트 우수, 라이브 퍼포먼스 기능 |
| 에디터 | VS Code vs Pulsar vs Vim | **VS Code** (tidalvscode 확장) | Isaac 기존 IDE, 확장 성숙, Claude Code 연동 |
| OSC 로깅 | SC 내부 vs 외부 프록시 | **SC 내부** (OSCFunc) | 추가 프로세스 불필요, 정확한 타이밍 |
| NRT 변환 | Python vs TS | **TS** (osclog2nrt.ts) | 기존 TS 스택 일관성, Zod 검증 재사용 |

### 4.5 디렉토리 구조 (v2 추가분)

```
audio/
├── sc/
│   ├── synthdefs/           # (기존) 9종 + (신규) SuperDirt 래퍼
│   ├── fx/                  # (신규) FX SynthDefs
│   │   ├── reverb.scd
│   │   ├── delay.scd
│   │   ├── compressor.scd
│   │   ├── sidechain.scd
│   │   ├── eq.scd
│   │   └── saturator.scd
│   ├── superdirt/           # (신규) SuperDirt 설정
│   │   ├── boot.scd         # SuperDirt.start + 커스텀 SynthDef 등록
│   │   └── fx-chain.scd     # Bus + Group + FX 초기화
│   ├── presets/             # (신규) 장르 프리셋
│   │   ├── hard-techno.scd
│   │   ├── melodic-techno.scd
│   │   ├── industrial.scd
│   │   ├── psytrance.scd
│   │   └── progressive-trance.scd
│   └── ...                  # (기존 유지)
├── tidal/                   # (신규) TidalCycles
│   ├── boot.hs              # Tidal 부트 설정 (SuperDirt 연결)
│   ├── presets.hs           # 장르 프리셋 Haskell 함수
│   └── sessions/            # 라이브 세션 .tidal 파일
├── samples/                 # (신규) 커스텀 샘플
│   ├── kicks/
│   ├── snares/
│   ├── hats/
│   └── fx/
├── logs/                    # (신규) OSC 로그
└── ...
scripts/
├── live-start.ts            # (신규) 라이브 부팅 오케스트레이터
├── live-stop.ts             # (신규) 라이브 종료
├── osclog2nrt.ts            # (신규) OSC 로그 → NRT 변환
├── render-stems.ts          # (신규) 스템별 NRT 렌더
├── render-audio.ts          # (기존 확장)
└── render-av.ts             # (기존 유지)
```

### 4.6 Build System Integration

| 도구 | 설치 | 용도 |
|------|------|------|
| GHCup | `curl --proto '=https' ... \| sh` | Haskell 툴체인 |
| cabal | GHCup 포함 | Haskell 패키지 매니저 |
| TidalCycles | `cabal install tidal` | 라이브 코딩 엔진 |
| SuperDirt | SC Quarks.install("SuperDirt") | 샘플러 + SC 이펙트 |
| Ableton Live Lite | 수동 설치 | DAW (스템 믹싱) |

**package.json 추가 scripts**:
```json
{
  "live:start": "tsx scripts/live-start.ts",
  "live:stop": "tsx scripts/live-stop.ts",
  "live:record": "tsx scripts/live-start.ts --record",
  "render:stems": "tsx scripts/render-stems.ts",
  "master": "tsx scripts/render-audio.ts --master-only"
}
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | GHCup/cabal 설치 실패 | 명확한 에러 + 수동 설치 가이드 | P1 |
| E2 | SuperDirt 설치 실패 (Quark 서버 다운) | 재시도 + 오프라인 설치 경로 | P1 |
| E3 | Tidal→SuperDirt OSC 연결 실패 | 포트 확인 + 재시작 안내 | P1 |
| E4 | FX Chain CPU 과부하 | CPU 모니터링 + FX 자동 bypass | P2 |
| E5 | OSC 로그 파일 용량 초과 (장시간 세션) | 10분 단위 파일 분할 + 압축 | P2 |
| E6 | NRT 변환 시 SynthDef 매핑 실패 | 미매핑 이벤트 skip + 경고 로그 | P2 |
| E7 | 라이브 녹음 중 디스크 부족 | 녹음 중단 + 기존 파일 보호 | P1 |
| E8 | Ableton 미설치 시 스템 워크플로우 | 스템 WAV만 생성 + DAW 없이 ffmpeg 믹스다운 폴백 | P2 |
| E9 | 좀비 sclang/scsynth 프로세스 | live:stop 시 PID 기반 강제 종료 | P1 |
| E10 | 커스텀 샘플 포맷 불일치 (mp3, aiff 등) | SuperDirt가 WAV/AIFF 자동 로드. 비지원 포맷 경고 | P3 |

## 6. Security & Permissions

### 6.1 Authentication
N/A — 로컬 전용.

### 6.2 Authorization
N/A — 단일 사용자.

### 6.3 Data Protection
- OSC 로그는 로컬 `audio/logs/`에만 저장
- 커스텀 샘플은 `audio/samples/`에만 저장 (git 추적 선택)
- execFile array-form 유지 (Phase A 보안 정책 계승)

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 오디오 레이턴시 | < 20ms | SC Server 설정 (blockSize 64) |
| CPU (라이브 4패턴+FX) | < 50% | SC `s.avgCPU` 모니터링 |
| 메모리 (SuperDirt+샘플) | < 2GB | SC `s.peakCPU` + Activity Monitor |
| NRT 렌더 속도 | 3분 트랙 < 60초 | `time npm run render:stems` |
| 스템 포맷 | WAV 48kHz 32-bit float | ffprobe 검증 |
| 마스터 품질 | -14 LUFS, peak ≤ -1 dBTP | ffmpeg loudnorm |

### 7.1 Monitoring & Alerting
- `live:start` 시 SC 서버 상태 대시보드 (CPU/synth count/UGen count)
- FX bypass 자동화: CPU > 70% → 가장 무거운 FX 자동 bypass + 경고
- OSC 로그 파일 크기 모니터링: 100MB 초과 시 자동 분할

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- OSC 로그 파서 (타임스탬프 정확도, SynthDef 매핑)
- 장르 프리셋 스키마 검증
- live-start/stop 프로세스 관리 로직

### 8.2 Integration Tests (SC + shell)
- SuperDirt 부팅 + 커스텀 SynthDef 로드 → 에러 0
- FX Chain 초기화 → 6종 FX SynthDef 로드 + Bus 라우팅 정상
- Tidal → SuperDirt → FX → 출력 → WAV 캡처 → RMS > -60dBFS
- OSC 로그 → NRT 변환 → 스템 렌더 → WAV 존재

### 8.3 Edge Case Tests
- CPU 과부하 시 FX bypass
- 장시간 OSC 로그 (10분+)
- 커스텀 샘플 로드 (다양한 포맷/채널/SR)

## 9. Rollout Plan

### 9.1 구현 순서

| Step | 내용 | 의존성 | 완료 시 가치 |
|------|------|--------|------------|
| B-1 | SC FX Chain (6종 + Bus 아키텍처) | Phase A | 소리 품질 프로급 |
| B-2 | SuperDirt 설치 + 커스텀 SynthDef 등록 | B-1 | 샘플 + 합성 혼합 |
| B-3 | TidalCycles 설치 + SuperDirt 연결 | B-2 | 실시간 코딩 가능 |
| B-4 | 라이브 부팅/종료 스크립트 | B-3 | 원커맨드 라이브 |
| B-5 | OSC 로깅 + NRT 변환 | B-3 | 라이브 → 프로덕션 |
| B-6 | 스템 렌더 + 마스터링 | B-5 | 배포 가능 음원 |
| B-7 | 장르 프리셋 5종 | B-1, B-3 | 멀티 장르 작업 |

### 9.2 Migration Strategy
- Phase A 코드 100% 유지. FX Chain은 기존 SynthDef에 Bus 라우팅 추가
- scene.json audio 필드 하위 호환 (기존 NRT 파이프라인 유지)
- 신규 디렉토리 추가만 (기존 파일 수정 최소)

### 9.3 Rollback Plan
1. `audio/sc/fx/` 삭제
2. `audio/sc/superdirt/` 삭제
3. `audio/tidal/` 삭제
4. `audio/samples/` 삭제
5. package.json에서 live:*/render:stems/master scripts 제거
6. TidalCycles/GHCup 삭제: `ghcup nuke`
7. SuperDirt 삭제: SC에서 `Quarks.uninstall("SuperDirt")`

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Install | Status | Risk if Delayed | Fallback |
|-----------|---------|--------|-----------------|----------|
| GHCup + GHC | `curl --proto '=https' ... \| sh` | 미설치 | Tidal 전체 차단 | SC Pdef (Phase A) |
| cabal | GHCup 포함 | 미설치 | Tidal 차단 | SC Pdef |
| TidalCycles | `cabal install tidal` | 미설치 | 라이브 모드 차단 | SC IDE 직접 |
| SuperDirt | SC Quarks | 미설치 | 샘플 재생 차단 | 합성음만 |
| Ableton Live | 수동 설치 | 미설치 | DAW 믹싱 차단 | ffmpeg 마스터링 |
| VS Code Tidal 확장 | marketplace | 미설치 | 에디터 불편 | 터미널 GHCi |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GHCup/Haskell arm64 빌드 실패 | 낮음 | 높음 | 공식 arm64 바이너리 사용 (GHCup 지원 확인) |
| SuperDirt↔FX Chain 충돌 | 중간 | 중간 | SuperDirt orbit → 커스텀 Bus 리매핑 테스트 |
| OSC→NRT 변환 타이밍 오차 | 중간 | 중간 | SuperDirt latency 보정 (기본 0.3초) |
| CPU 과부하 (FX + SuperDirt) | 중간 | 중간 | FX bypass 자동화 + 프로파일링 |
| 기존 NRT 파이프라인 regression | 낮음 | 높음 | Phase A 테스트 스위트 유지 (106 vitest) |

## 11. Success Metrics

| Metric | Baseline (Phase A) | Target (Phase B) | Measurement |
|--------|-------------------|-------------------|-------------|
| 이펙트 유무 | 0개 | 6종 FX Chain | SC FX SynthDef count |
| 실시간 피드백 | 불가 (NRT만) | < 20ms 레이턴시 | SC blockSize |
| 라이브 퍼포먼스 | 불가 | 30분+ 안정 세션 | CPU < 50%, 크래시 0 |
| 패턴 표현력 | SC Pdef (장황) | Tidal 1줄 패턴 | 코드 라인 수 비교 |
| 상업적 품질 | 드럼머신 수준 | 배포 가능 | 장르 프리셋 5종 + FX |
| 장르 커버리지 | techno/trance 2종 | 5종 전자음악 | 프리셋 + SynthDef |
| 스템 분리 | mono master만 | 4+ 스템 | Bus별 WAV 렌더 |

## 12. Open Questions

- [ ] OQ-1: SuperDirt의 orbit 시스템과 커스텀 FX Chain 공존 방법 — SuperDirt는 자체 FX를 orbit에 적용. 우리 FX Chain과 이중 적용 방지 필요
- [ ] OQ-2: Tidal 패턴에서 SC FX 파라미터 실시간 제어 가능 여부 — `# room 0.5` 같은 SuperDirt 내장 FX는 가능. 커스텀 FX는 OSC 매핑 필요할 수 있음
- [ ] OQ-3: Ableton Live Lite 제한 (트랙 수, 플러그인) — Lite 버전이 스템 임포트 + 기본 믹싱에 충분한지 확인 필요

---

## Changelog

### v0.1 (2026-03-26) — 초안
- 전 섹션 작성 (XL)
- Phase A 분석 기반 + Isaac 인터뷰 반영
- 레퍼런스 아티스트: Amelie Lens, Charlotte de Witte, Daniel Levak, Astrix, Ace Ventura