# PRD: Audio System v2 — B-PROD (NRT Production Pipeline)

**Version**: 0.3
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-27
**Status**: Draft
**Size**: L
**Scope**: 프로덕션 파이프라인만. Tidal 라이브 세션 → OSC 캡처 → NRT 스템 렌더 → 마스터링. 장르 프리셋은 B-PRESET PRD로 분리.
**Prereq**: B-LIVE 완료 (184 tests, Phase 7 Done)

---

## 1. Problem Statement

### 1.1 Background
B-LIVE로 실시간 라이브 코딩 + 퍼포먼스 환경이 완성되었다. SuperDirt + TidalCycles + 커스텀 FX(comp/sidechain/sat/eq)로 프로급 사운드를 실시간 생성할 수 있다. 그러나 라이브 세션 결과물은 단일 master WAV 녹음뿐 — 스템 분리, DAW 믹싱, 정밀 마스터링이 불가능하다.

### 1.2 Problem Definition
1. 라이브 세션의 패턴/파라미터를 재현 불가 — 녹음은 있지만 개별 트랙 편집 불가
2. 스템 분리 없음 — 단일 마스터 녹음만 존재. DAW에서 개별 악기/FX 조정 불가
3. NRT 고품질 렌더 불가 — 라이브 세션을 오프라인으로 재렌더하여 품질 향상 불가

### 1.3 Impact of Not Solving
- 라이브 세션 결과물이 "일회성" — 사후 편집/리믹스 불가
- 배포 가능 품질의 트랙 제작 불가 (스템 믹싱 필수)
- 프로덕션 워크플로우 단절 (라이브 → DAW 전환 불가)

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: OSC 로깅 — 라이브 세션 중 모든 SuperDirt OSC 이벤트를 `.osclog` 파일로 캡처
- [ ] G2: OSC → NRT 변환 — `.osclog`를 SC Score 포맷으로 변환. SynthDef 매핑 + 타이밍 보정
- [ ] G3: 멀티 스템 NRT 렌더 — Bus별 스템 WAV 분리 렌더 (drums/bass/synth/fx 최소 4스템). 48kHz 32-bit float
- [ ] G4: 마스터링 자동화 — 스템 믹스다운 + loudnorm (-14 LUFS, TP <= -1 dBTP). `npm run render:prod`
- [ ] G5: DAW 호환 출력 — 스템 WAV + 세션 메타데이터(BPM, key, duration)를 DAW 임포트 가능 형태로 출력

### 2.2 Non-Goals
- NG1: Ableton Live Set (.als) 자동 생성 (스템 WAV + README로 대체)
- NG2: 장르 프리셋 (B-PRESET 범위)
- NG3: GUI/웹 믹서 (DAW 사용)
- NG4: 실시간 스트리밍/배포
- NG5: AI 자동 작곡/어레인지
- NG6: 비주얼 싱크 (B-LIVE에 없으므로 로깅 대상 아님)
- NG7: Dirt-Samples NRT 재생 — SuperDirt의 샘플 해상도가 NRT에서 불가. 커스텀 9종 SynthDef만 지원. 샘플 NRT는 B-PROD v0.2에서 Buffer.read 방식으로 검토
- NG8: SuperDirt 내장 reverb/delay NRT 재생 — NRT에 SuperDirt 없음. room/delay 파라미터는 .osclog에 보존하되 NRT 변환 시 무시 + 경고. NRT reverb/delay는 B-PROD v0.2에서 커스텀 SynthDef으로 검토

## 3. User Stories & Acceptance Criteria

### US-1: OSC 로깅
**As a** 프로듀서, **I want** 라이브 세션 중 모든 OSC 이벤트가 자동 저장되기를, **so that** 세션을 나중에 NRT로 재현할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: `npm run live:start --log` 또는 `npm run live:log` → SuperDirt OSC 수신 후킹. 모든 `/dirt/play` 메시지를 타임스탬프 + 파라미터와 함께 `.osclog` 파일로 저장
- [ ] AC-1.2: `.osclog` 포맷: JSONL (1줄 = 1 이벤트). `{ ts: number, event: string, params: Record<string, number|string> }`
- [ ] AC-1.3: 10분 단위 파일 분할 (장시간 세션). `session_{YYYY-MM-DD}_{HH-MM}_part{N}.osclog`
- [ ] AC-1.4: OSC 로깅이 라이브 오디오에 영향 없음 (레이턴시 추가 < 1ms)
- [ ] AC-1.5: `npm run live:stop` 시 로그 자동 finalize + 세션 메타데이터(BPM, key, duration, event count) 기록

### US-2: OSC → NRT 변환
**As a** 프로듀서, **I want** OSC 로그를 SC NRT Score로 변환할 수 있기를, **so that** 라이브 세션을 오프라인 고품질로 재렌더할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: `npm run prod:convert <osclog_path_or_dir>` → `.osclog` 파일(단일) 또는 디렉토리(멀티파트 glob) → SC Score 포맷(`.osc`). 멀티파트 시 타임스탬프 순 자동 연결
- [ ] AC-2.2: SynthDef 매핑 — OSC `s` 파라미터 → SynthDef 이름. **커스텀 9종만 지원. Dirt-Samples(808 등)은 B-PROD v0.1 미지원 → skip + 경고** (NG 추가)
- [ ] AC-2.3: 타이밍 보정 — SuperDirt latency (기본 0.3초) 보상. 원본 타이밍 충실 재현
- [ ] AC-2.4: FX 파라미터 보존 — compress, saturate, eq 등 커스텀 FX 파라미터가 NRT Score에 포함
- [ ] AC-2.5: 미매핑 이벤트 처리 — 알 수 없는 SynthDef/Dirt-Samples은 skip + 경고 로그. 전체 변환 중단 안 함
- [ ] AC-2.6: 변환 결과 요약 — 총 이벤트, 매핑 성공/skip, 추정 duration 출력. **skip 비율 > 10% 시 WARNING, > 50% 시 ERROR + 중단**
- [ ] AC-2.7: OSC 파라미터 정규화 — SuperDirt 파라미터 별칭 자동 해석 (gain↔amp 등). 미인식 파라미터는 보존하되 NRT 변환 시 경고

### US-3: 멀티 스템 NRT 렌더
**As a** 프로듀서, **I want** NRT Score를 악기별 스템으로 분리 렌더할 수 있기를, **so that** DAW에서 개별 트랙을 편집/믹싱할 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: `npm run render:stems <score.osc>` → 스템별 WAV 렌더. 기본 4스템: drums (kick/hat/clap), bass, synth (supersaw/pad/lead/arp_pluck), fx (riser + FX returns)
- [ ] AC-3.2: 각 스템 48kHz 32-bit float WAV. 모든 스템 동일 길이 (패딩 포함)
- [ ] AC-3.3: SynthDef `\out` 파라미터를 스템별 Bus로 라우팅. NRT 전용 라우팅 (라이브 모드 영향 없음)
- [ ] AC-3.4: 스템 믹스 확인 — 모든 스템을 합산하면 원본 세션과 동일 (위상 정합)
- [ ] AC-3.5: 커스텀 스템 그룹 지정 가능 — `--stems "kick:kick bass:bass,sub_bass synth:supersaw,pad,lead,arp_pluck fx:riser"` 형태. B-PRESET 확장점
- [ ] AC-3.6: 출력 디렉토리: `out/audio/{date}_{title}/stems/` 하위에 `stem-drums.wav`, `stem-bass.wav` 등

### US-4: 마스터링 + DAW 출력
**As a** 프로듀서, **I want** 스템을 자동 믹스다운 + 마스터링하고 DAW 임포트 가능 형태로 내보낼 수 있기를, **so that** 배포 가능한 품질의 트랙을 얻을 수 있다.

**Acceptance Criteria:**
- [ ] AC-4.1: `npm run render:prod <osclog>` → 원커맨드: OSC 변환 → 스템 렌더 → 마스터링. 전체 파이프라인
- [ ] AC-4.2: 마스터링: 스템 믹스다운 → loudnorm (`loudnorm=I=-14:TP=-2:LRA=7`) → 48kHz 16-bit PCM `master.wav`. 검증: LUFS -14 +-0.5, TP <= -2 dBTP
- [ ] AC-4.3: 세션 메타데이터 파일 — `session-info.json` (BPM, key, duration, stem 목록, 이벤트 요약)
- [ ] AC-4.4: DAW README — `IMPORT-GUIDE.md` (스템 파일 목록 + BPM + 임포트 순서 안내)
- [ ] AC-4.5: 출력 구조:
```
out/audio/{date}_{title}/
├── stems/
│   ├── stem-drums.wav
│   ├── stem-bass.wav
│   ├── stem-synth.wav
│   └── stem-fx.wav
├── master.wav
├── session-info.json
├── IMPORT-GUIDE.md
└── raw/
    ├── session.osclog
    └── nrt-score.osc
```
- [ ] AC-4.6: Phase A 기존 `npm run render:audio` (scene.json → NRT) 파이프라인 regression 0

## 4. Technical Design

### 4.1 Architecture (PROD MODE)

```
[라이브 세션]
  TidalCycles → SuperDirt (OSC :57120)
                    │
              OSCFunc 후킹 ──→ .osclog (JSONL)
                    │
              Audio Output (실시간)

[프로덕션 변환]
  .osclog
    │ npm run prod:convert
  osclog2nrt.ts
    │ SynthDef 매핑 + 타이밍 보정
  nrt-score.osc (SC Score 포맷)
    │ npm run render:stems
  render-stems.ts
    │ scsynth -N (멀티 Bus 출력)
  stems/*.wav (4+ 스템, 48kHz 32f)
    │ npm run render:prod (마스터링)
  ffmpeg loudnorm
    │
  master.wav (-14 LUFS, 48kHz 16-bit)
```

### 4.2 OSC 로깅 구현

SuperDirt의 OSC 수신을 SC `OSCFunc`로 후킹:
```supercollider
~oscLogger = OSCFunc({ |msg, time|
    var event = msg[1..];  // /dirt/play 파라미터
    ~logFile.write(format("% %\n", time.asString, event));
}, '/dirt/play');
```

boot.scd에 조건부 로드 (--log 플래그 시만 활성화). 라이브 오디오 경로에 영향 없음.

### 4.3 .osclog JSONL 포맷 + 타이밍 모델

```jsonl
{"ts":0.000,"s":"kick","n":0,"orbit":0,"gain":1.0,"pan":0.5,"freq":55}
{"ts":0.125,"s":"hat","n":0,"orbit":1,"gain":0.8,"pan":0.5,"speed":1.0}
{"ts":0.250,"s":"supersaw","n":4,"orbit":2,"cutoff":2000,"compress":0.7,"saturate":0.3}
```

**필수 파라미터 (카테고리별):**
- **Instrument**: `s`, `n`, `freq`/`note`, `amp`/`gain`, `dur`, `pan`, `speed`
- **FX**: `compress`, `threshold`, `ratio`, `compAttack`, `compRelease`, `saturate`, `drive`, `loGain`, `midGain`, `hiGain`, `loFreq`, `hiFreq`, `room`, `size`, `dry`, `delay`, `delaytime`, `delayfeedback`
- **Routing**: `orbit`, `out`
- **Tidal context**: `cps`, `cycle`, `delta` (NRT 타이밍 보정용)
- **Grain**: `begin`, `end` (B-PROD v0.1에서는 SynthDef만 지원, grain은 참고 보존)

OSCFunc는 `/dirt/play` 메시지의 **모든 키-값 쌍**을 raw 캡처. 위 목록은 NRT 변환 시 필수 해석 대상.

**파라미터 정규화** (osclog2nrt 변환 시):
- SuperDirt 별칭 자동 해석: `gain`↔`amp`, `note`↔`midinote` 등 config 기반
- 미인식 파라미터: .osclog에 보존, NRT 변환 시 무시 + 경고
- Tidal context (`cps`, `cycle`, `delta`): 참조용 보존. NRT 변환에서는 미사용 (절대 시각 `ts` 기반). 향후 `--quantize` 옵션용 예비

**멀티파트 병합 알고리즘** (AC-2.1 디렉토리 입력 시):
1. 파일명 기준 정렬 (part 번호 순)
2. 각 part의 ts_max 추출 → 다음 part에 offset 적용
3. 모든 이벤트 타임스탬프 연속성 보장
4. 메타데이터: part 0 (최초 파일) 기준. 나머지 discard + 로그

**타이밍 모델:**
```
captured_ts = OSCFunc 수신 시각 (SC SystemClock, absolute)
session_start_ts = 첫 이벤트의 captured_ts
nrt_time = captured_ts - session_start_ts  (session-relative 초)
```
Tidal은 이벤트를 SuperDirt latency(기본 ~0.2s) 만큼 미리 전송하므로, OSCFunc 캡처 시각 ≈ intended play time. NRT 변환 시 추가 보정 불필요 (OQ-1에서 A/B 테스트로 검증).

**SynthDef → 스템 매핑 테이블 (`synth-stem-map`):**

| s (SynthDef name) | stem | NRT bus |
|-------------------|------|---------|
| kick | drums | 0-1 |
| hat | drums | 0-1 |
| clap | drums | 0-1 |
| bass | bass | 2-3 |
| supersaw | synth | 4-5 |
| pad | synth | 4-5 |
| lead | synth | 4-5 |
| arp_pluck | synth | 4-5 |
| riser | fx | 6-7 |

이 매핑은 `scripts/lib/stem-router.ts`에서 JSON config로 관리. `--stems` 커스텀 오버라이드 가능 (AC-3.5).

### 4.4 NRT 스템 라우팅 + FX 재구성

기존 SynthDef은 `Out.ar(out, sig)` → bus 0. NRT 스템용으로 `\out` 파라미터를 스템 Bus로 재매핑:

```
Bus 할당 (NRT 전용):
  0-1:   drums stem (kick, hat, clap)
  2-3:   bass stem (bass)
  4-5:   synth stem (supersaw, pad, lead, arp_pluck)
  6-7:   fx stem (riser)

scsynth -N nrt-score.osc _ output-8ch.wav 48000 WAV float -o 8
→ 8ch WAV를 sox/ffmpeg로 2ch 스템 4개로 분리
```

**NRT FX 재구성 전략:**

라이브 모드에서 FX는 SuperDirt `addModule` orbit chain으로 동작하지만, NRT에는 SuperDirt가 없음. NRT Score에서 FX를 재구성하는 방법:

1. 각 instrument `\s_new` 직후에 해당 Bus에 FX `\s_new`를 별도 노드로 삽입
2. FX SynthDef은 `In.ar(bus, 2)` + `ReplaceOut.ar(bus, sig)` 패턴 (기존 custom-fx.scd 동일)
3. Score에서 노드 순서 보장: `[\s_new, \customCompressor, fxNodeId, 1, instrumentNodeId, ...]` (addAfter)
4. FX 파라미터는 .osclog에서 추출하여 Score의 `\s_new` 인자로 전달
5. **Sidechain**: NRT에서는 `~sidechainBus` 대신 static bus 할당 (bus 100). kick → bus 100 write, 타 스템 compressor → bus 100 read. **AC-3.4 위상 정합 테스트에서 검증**
6. **SuperDirt 내장 reverb/delay**: NRT에서 사용 불가 → **B-PROD v0.1 미지원 (NG8)**. room/size/dry/delay 파라미터는 .osclog에 보존하되 NRT 변환 시 무시 + 경고

**NRT FX 체인 순서** (라이브 모드 동일):
```
sidechain → compressor → saturator → EQ
(reverb/delay는 v0.1 미지원 — NG8)
```

**NRT Score 노드 전략:**
SC Score의 `/s_new` 메시지는 `addAction` 인자로 노드 순서 지정 가능:
```
[time, [\s_new, defName, nodeID, addAction, targetNodeID, ...args]]
// addAction: 0=addToHead, 1=addToTail, 2=addBefore, 3=addAfter
```
노드 ID 할당:
- Instrument: 1000 + (eventIndex * 10) — 동시 최대 voicing 고려
- FX: 2000 + (fxTypeIndex * 100) — 스템당 1 FX 인스턴스
- Score 내 순서: instrument `/s_new` 먼저, FX `/s_new`는 addAfter(3)로 해당 instrument 뒤에 배치

**NRT SynthDef 로딩:**

`render-stems-nrt.scd`에서 instrument 9종 + FX 4종 SynthDef을 `writeDefFile`로 디스크에 쓴 후 scsynth가 자동 로드. 기존 `synthdefs/*.scd` + `superdirt/custom-fx.scd`에서 SynthDef 정의를 import.

### 4.5 Key Technical Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| OSC 로깅 위치 | SC 내부 (OSCFunc) vs 외부 프록시 | **SC 내부** | 추가 프로세스 불필요, 정확한 타이밍, 기존 boot.scd 확장 |
| 로그 포맷 | JSONL vs SC Score vs 바이너리 | **JSONL** | 사람 읽기 가능, TS 파싱 용이, 스트리밍 가능 |
| 스템 렌더 | 개별 scsynth 실행 vs 멀티채널 1회 | **멀티채널 1회** | 렌더 속도 4x 빠름, 타이밍 정합 보장 |
| 스템 분리 | scsynth 출력 후 split vs 개별 렌더 | **출력 후 sox split** | scsynth 1회 실행, 위상 정합 완벽 |
| NRT 스코어 | 기존 render-nrt.scd 확장 vs 신규 | **신규 render-stems-nrt.scd** | 기존 NRT 파이프라인 regression 방지 |
| 타이밍 보정 | 원본 타이밍 유지 vs 양자화 | **원본 유지** | 라이브 느낌 보존. 양자화는 DAW에서 |

### 4.6 디렉토리 구조 (추가분)

```
audio/sc/
├── superdirt/
│   ├── boot.scd             # (수정) --log 시 OSC 로거 조건부 로드
│   └── osc-logger.scd       # (신규) OSCFunc 로깅 로직
├── scores/
│   ├── render-nrt.scd        # (기존 유지)
│   └── render-stems-nrt.scd  # (신규) 멀티 Bus 스템 NRT
scripts/
├── prod-convert.ts           # (신규) osclog → NRT 변환 엔트리
├── render-stems.ts           # (신규) 스템 NRT 렌더 엔트리
├── render-prod.ts            # (신규) 원커맨드 전체 파이프라인
├── lib/
│   ├── osc-parser.ts         # (신규) .osclog JSONL 파서
│   ├── osc-to-nrt.ts         # (신규) OSC 이벤트 → SC Score 변환
│   ├── stem-router.ts        # (신규) SynthDef → Bus 매핑
│   └── stem-splitter.ts      # (신규) 멀티채널 WAV → 스템 분리
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | OSC 로그 파일 용량 초과 (장시간 세션) | 10분 단위 자동 분할 + 압축 | P2 |
| E2 | NRT 변환 시 미매핑 SynthDef | skip + 경고 로그. 변환 중단 안 함 | P2 |
| E3 | 스템 렌더 중 디스크 부족 | 렌더 중단 + 기존 파일 보호 (B-LIVE 패턴) | P1 |
| E4 | .osclog 파일 손상 (불완전 JSON) | 파싱 에러 라인 skip + 경고. 나머지 계속 | P2 |
| E5 | 0개 이벤트 .osclog (빈 세션) | 명확한 에러 "no events found" | P2 |
| E6 | scsynth NRT 렌더 크래시 | exit code 체크 + 에러 리포트 | P1 |
| E7 | 스템 믹스다운 위상 불일치 | 멀티채널 1회 렌더로 원천 방지 | P1 |
| E8 | 라이브 세션 없이 prod:convert 호출 | ".osclog 파일 경로 필요" 에러 | P3 |
| E9 | OSC 로깅이 라이브 성능에 영향 | 비동기 파일 쓰기 + 버퍼링 (기본 1초) | P1 |
| E10 | 동시 live:start --log 실행 | .live.lock 기반 거부. 이미 로깅 활성 시 에러 | P2 |
| E11 | render:prod 중 live:start 호출 | .render.lock 파일로 동시 렌더 방지. NRT는 네트워크 포트 미사용이므로 scsynth 인스턴스 충돌 없음 | P2 |
| E12 | .osclog 파일 경로 특수문자/심볼릭링크 | realpath 정규화 + 프로젝트 범위 내 검증. 공백/유니코드 정상 처리 | P3 |
| E13 | 10분 분할 경계에서 이벤트 유실 | 기존 파일에 버퍼 flush 완료 후 새 파일 전환. 로테이션 중 유실 0 | P2 |
| E14 | SC 크래시 중 활성 로깅 | JSONL 스트리밍 특성상 기록된 라인은 유효. 세션 메타데이터(AC-1.5)는 유실 → 재생성 필요 | P2 |

## 6. Security & Permissions

- execFile array-form 정책 유지 (B-LIVE 계승). **신규 스크립트(prod-convert, render-stems, render-prod, stem-splitter)에 execFile-only 정적 검증 테스트 필수**
- .osclog 파일은 로컬 `out/` 하위에만 저장
- **CLI 입력 파일 경로 검증**: 모든 사용자 입력 경로(prod:convert, render:stems, render:prod)는 realpath 정규화 + 프로젝트 허용 디렉토리 내 존재 검증 + 확장자 허용목록(.osclog, .osc). `validateFilePath()` 유틸 생성
- OSC 로거 127.0.0.1 수신만 — osc-logger.scd에서 `NetAddr("127.0.0.1", 57120)` 전용. 0.0.0.0 바인딩 금지
- **boot.scd --log 미지정 시 OSC 로거 완전 비활성. B-LIVE 기존 동작과 동일** (regression 보호)

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| OSC 로깅 레이턴시 | < 1ms 추가 | SC 프로파일링 |
| NRT 스템 렌더 속도 | 3분 트랙 < 90초 | time 측정 |
| 스템 포맷 | 48kHz 32-bit float | ffprobe |
| 마스터 품질 | -14 LUFS, TP <= -1 dBTP | ffmpeg loudnorm |
| 디스크 사용 | 3분 4스템 < 200MB | du 측정 |
| NRT Score 메모리 | 30분 세션 < 500MB | SC 프로파일링 |

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- OSC JSONL 파서 (정상/손상/빈 파일)
- OSC → NRT 변환 (SynthDef 매핑, 타이밍 보정, FX 파라미터)
- 스템 라우터 (SynthDef → Bus 매핑, 커스텀 그룹)
- 스템 분리 (채널 추출 로직)
- Phase A + B-LIVE regression (184 기존 테스트 유지)

### 8.2 Integration Tests (SC + shell)
- OSC 로거: boot.scd --log → .osclog 파일 생성 확인
- NRT 스템 렌더: score → 멀티채널 WAV → 스템 split
- 전체 파이프라인: .osclog → stems → master.wav
- **스템 위상 정합 검증**: 4스템 WAV sum → mono vs 8ch downmix → 차이 RMS < -60dB
- **NRT sidechain 검증**: kick → bus 100 write, bass/synth compress → bus 100 read. 스템 합산 정합
- **scsynth 멀티채널 출력 검증**: `scsynth -N ... -o 8` → ffprobe: channels=8, 48kHz, float32
- **execFile-only 검증**: 신규 스크립트 4개에서 exec()/spawn() 사용 0
- **Regression gate**: Phase A + B-LIVE 184 기존 테스트 전부 실행 → PASS 필수

### 8.3 Edge Case Tests
- 장시간 OSC 로그 (10분+) 분할
- 미매핑 SynthDef skip
- 손상 JSONL 라인 skip

## 9. Rollout Plan

| Step | 내용 | Size | 의존 |
|------|------|------|------|
| P-1 | OSC 로깅 시스템 (SC OSCFunc + JSONL 기록) | M | B-LIVE |
| P-2 | OSC → NRT 변환기 (osclog2nrt) | M | P-1 |
| P-3 | 멀티 스템 NRT 렌더 (Bus 라우팅 + split) | M | P-2 |
| P-4 | 마스터링 + DAW 출력 (render:prod 원커맨드) | M | P-3 |

### 9.1 Rollback Plan
1. `audio/sc/superdirt/osc-logger.scd` 삭제
2. `scripts/prod-convert.ts`, `render-stems.ts`, `render-prod.ts` 삭제
3. `scripts/lib/osc-*.ts`, `stem-*.ts` 삭제
4. `audio/sc/scores/render-stems-nrt.scd` 삭제
5. boot.scd에서 OSC 로거 조건부 로드 제거
6. package.json에서 prod:* scripts 제거
7. Phase A + B-LIVE 코드 무변경 (regression 0)

## 10. Dependencies & Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| OSC 로깅이 라이브 성능 저하 | 낮음 | 높음 | 비동기 버퍼 쓰기, 별도 스레드 (SC Routine) |
| scsynth 멀티채널 NRT 출력 호환성 | 낮음 | 중간 | `-o 8` 옵션 검증 (SC 표준) |
| OSC 타이밍 보정 부정확 | 중간 | 중간 | SuperDirt latency 상수 사용 + A/B 비교 테스트 |
| 스템 합산 != 원본 (위상 문제) | 낮음 | 높음 | 멀티채널 1회 렌더로 원천 방지 |
| 기존 render:audio regression | 낮음 | 높음 | 별도 SC 파일 (render-stems-nrt.scd). 기존 파일 무수정 |
| .osclog 파일 크기 (장시간 세션) | 중간 | 낮음 | 10분 분할 + JSONL 압축 |

## 11. Open Questions

- [ ] OQ-1: SuperDirt latency 보정값 — 기본 0.3초 vs 실측치. P-2에서 A/B 테스트로 확정
- [ ] OQ-2: sox vs ffmpeg 멀티채널 split — 어느 도구가 채널 분리에 더 정확한지. P-3에서 spike
- [ ] OQ-3: NRT sidechain 재구성 — static bus(100) 할당 + kick write + comp read 방식이 NRT Score에서 정상 작동하는지. P-3에서 spike

---

## Changelog
### v0.1 (2026-03-27) — 초안
- B-LIVE 완료 기반 B-PROD 범위 정의
- B-PRESET (장르 프리셋) 분리
- 멀티채널 1회 렌더 아키텍처 결정
- JSONL 로그 포맷 결정

### v0.2 (2026-03-27) — Phase 2 리뷰 반영
- [P1 fix] NRT FX 재구성 전략 추가 (FX 노드 별도 삽입 + 노드 순서 보장)
- [P1 fix] Dirt-Samples → NG7 이동 (NRT에서 SuperDirt 샘플 해상도 불가)
- [P1 fix] 타이밍 모델 명확화 (session-relative 변환, Tidal latency 설명)
- [P1 fix] 멀티파트 osclog 변환 지원 (AC-2.1 디렉토리/glob 입력)
- [P2 fix] 필수 OSC 파라미터 목록 카테고리별 명시
- [P2 fix] SynthDef→스템 매핑 테이블 추가
- [P2 fix] NRT SynthDef 로딩 방법 명시 (writeDefFile)
- [P2 fix] 스템 위상 정합 검증 테스트 추가
- [P2 fix] NRT Score 메모리 메트릭 추가
- [P2 fix] execFile-only 정적 검증 테스트 강제
- [P2 fix] CLI 파일 경로 검증 AC + validateFilePath() 유틸
- [P2 fix] 동시 세션/렌더 Edge Case E10-E14 추가
- [P2 fix] osc-logger.scd 127.0.0.1 바인딩 AC 추가
- OQ-3 추가 (NRT sidechain static bus)

### v0.3 (2026-03-27) — Phase 2 Round 2 반영
- [P1 fix] NRT FX 노드 순서 SC Score 문법으로 명확화 (addAction=3)
- [P1 fix] NRT sidechain 검증을 AC-3.4 + 통합 테스트로 승격
- [P1 fix] Regression gate: 184 기존 테스트 CI 게이트 명시
- [P2 fix] SuperDirt 내장 reverb/delay → NG8 (NRT 미지원)
- [P2 fix] NRT FX 체인 순서 명시 (sidechain→comp→sat→EQ)
- [P2 fix] OSC 파라미터 정규화 전략 + 별칭 해석 추가 (AC-2.7)
- [P2 fix] 멀티파트 병합 알고리즘 명시
- [P2 fix] Skip 비율 threshold 추가 (10% WARNING, 50% ERROR)
- [P2 fix] Loudnorm TP -1→-2 dBTP 안전 마진 확보
- [P2 fix] scsynth 멀티채널 출력 + sidechain 통합 테스트 추가
- [P2 fix] Tidal context params (cycle/delta) 용도 명확화
