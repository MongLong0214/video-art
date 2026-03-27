# PRD: B-PROD v0.2 — Dirt-Samples NRT + Reverb/Delay NRT

**Version**: 0.2
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-27
**Status**: Draft
**Size**: M
**Prereq**: B-PROD v0.1 (321 tests), SC Integration

---

## 1. Problem Statement

### 1.1 Background
B-PROD v0.1은 커스텀 9종 SynthDef만 NRT 지원. 라이브 세션에서 사용하는 Dirt-Samples(808 킥/스네어/하이햇)와 SuperDirt 내장 reverb/delay가 NRT 변환 시 skip되어 프로덕션 결과물에 빠짐.

### 1.2 Problem Definition
1. Dirt-Samples(bd, sd, hh 등)가 NRT에서 재생 불가 — 세션의 드럼 트랙이 통째로 누락
2. reverb/delay 파라미터(room, size, delay, delaytime)가 NRT에서 무시 — 공간감 없는 드라이 사운드

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: Dirt-Samples NRT — `.osclog`의 샘플 이벤트를 `Buffer.read` + `PlayBuf` SynthDef으로 NRT 재생
- [ ] G2: NRT Reverb/Delay — 커스텀 `\nrtReverb`, `\nrtDelay` SynthDef으로 NRT에서 공간 이펙트 적용

### 2.2 Non-Goals
- NG1: SuperDirt의 모든 샘플 해상도 로직 재현 (begin/end grain, speed 변형은 기본만)
- NG2: 서드파티 샘플팩 자동 탐색

## 3. User Stories & Acceptance Criteria

### US-1: Dirt-Samples NRT 재생
**As a** 프로듀서, **I want** 라이브 세션의 드럼 샘플(bd, sd, hh 등)이 NRT 스템에 포함되기를.

**Acceptance Criteria:**
- [ ] AC-1.1: `osc-to-nrt.ts` — Dirt-Samples 이벤트(s="bd", s="cp" 등) 매핑. `synth-stem-map.ts`에 샘플→스템 매핑 추가
- [ ] AC-1.2: `render-stems-nrt.scd` — `Buffer.read`로 Dirt-Samples 경로 해석 + `\nrtPlayBuf` SynthDef으로 재생
- [ ] AC-1.3: 샘플 경로 해석 — SuperDirt 폴더 구조(`samples/{name}/{n}.wav`) 따라 파일 탐색. 미발견 시 skip + 경고
- [ ] AC-1.4: `n` 파라미터 → 샘플 인덱스 (폴더 내 N번째 파일)
- [ ] AC-1.5: 기본 파라미터 지원: `amp`, `pan`, `speed`(재생 속도). `begin`/`end` grain은 v0.2 미지원
- [ ] AC-1.6: B-PROD v0.1 skip 비율 감소 — 기존에 skip된 Dirt-Samples가 이제 매핑됨

### US-2: NRT Reverb/Delay
**As a** 프로듀서, **I want** NRT 렌더에 reverb/delay 이펙트가 포함되기를.

**Acceptance Criteria:**
- [ ] AC-2.1: `\nrtReverb` SynthDef — `In.ar` + `FreeVerb` + `ReplaceOut.ar`. 파라미터: room, size, dry
- [ ] AC-2.2: `\nrtDelay` SynthDef — `In.ar` + `CombL` + `ReplaceOut.ar`. 파라미터: delaytime, delayfeedback, dry
- [ ] AC-2.3: `stem-render.ts` FX_CHAIN_ORDER에 `"nrtReverb"`, `"nrtDelay"` 추가 (기존 sidechain→comp→sat→eq **뒤에** 삽입). `synth-stem-map.ts` FX_PARAMS에 `room, size, dry, delaytime, delayfeedback` 추가
- [ ] AC-2.4: .osclog의 room/size/dry/delay/delaytime/delayfeedback 파라미터가 NRT Score에 반영
- [ ] AC-2.5: reverb/delay 파라미터 없는 이벤트는 nrtReverb/nrtDelay 노드 생략

## 4. Technical Design

### 4.1 Dirt-Samples NRT 흐름

```
.osclog: {"ts":0.0,"s":"bd","n":0,"gain":1.0}
  → osc-to-nrt.ts: s="bd" → sampleEvent (NOT SynthDef)
  → render-stems-nrt.scd:
    1. 샘플 디렉토리 탐색 (우선순위):
       a. 환경변수 $SC_SAMPLES_DIR
       b. Platform.userAppSupportDir +/+ "downloaded-quarks/Dirt-Samples/"
       c. Quarks.folder +/+ "Dirt-Samples/" (Quarks 초기화 시만)
       d. 프로젝트 audio/samples/ (커스텀 샘플)
    2. 폴더 내 n % fileCount 번째 파일 선택 (래핑)
    3. Buffer.read(server, path) → bufnum (NRT Score 선두에 b_allocRead 삽입)
    4. Score에 [\s_new, \nrtPlayBuf, nodeId, 0, 0, \out, bus, \bufnum, bufnum, \amp, amp, \speed, speed] 삽입
```

### 4.2 NRT SynthDefs (PlayBuf + Reverb + Delay)

```supercollider
// Sample playback for Dirt-Samples in NRT
SynthDef(\nrtPlayBuf, { |out=0, bufnum=0, amp=0.5, pan=0, speed=1, dur=1|
  var sig = PlayBuf.ar(2, bufnum, BufRateScale.kr(bufnum) * speed, doneAction: 2);
  sig = sig * amp * EnvGen.kr(Env.linen(0.001, dur, 0.01), doneAction: 2);
  sig = Balance2.ar(sig[0], sig[1], pan);
  Out.ar(out, sig);
}).writeDefFile;

SynthDef(\nrtReverb, { |out=0, room=0.5, size=0.8, dry=0.5|
  var sig = In.ar(out, 2);
  sig = FreeVerb.ar(sig, room, size, dry);
  ReplaceOut.ar(out, sig);
}).writeDefFile;

SynthDef(\nrtDelay, { |out=0, delaytime=0.3, delayfeedback=0.5, dry=0.5|
  var sig = In.ar(out, 2);
  var delayed = CombL.ar(sig, 1.0, delaytime, delayfeedback * 4);
  sig = (sig * dry) + (delayed * (1 - dry));
  ReplaceOut.ar(out, sig);
}).writeDefFile;
```

### 4.3 synth-stem-map 확장

```typescript
// Dirt-Samples → drums stem (bus 0)
const DIRT_SAMPLE_STEMS: Record<string, string> = {
  bd: "drums", sd: "drums", hh: "drums", cp: "drums",
  cb: "drums", mt: "drums", ht: "drums", lt: "drums",
  // 그 외 알려진 Dirt-Samples → 적절한 스템
};
```

### 4.4 Key Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| 샘플 경로 | Quarks Dirt-Samples 폴더 | SuperDirt 표준 위치 |
| PlayBuf SynthDef | 신규 `\nrtPlayBuf` | 기존 SynthDef과 분리 |
| Reverb/Delay | 신규 `\nrtReverb`, `\nrtDelay` | 기존 FX 체인 뒤에 삽입 |
| begin/end grain | v0.2 미지원 | 복잡도 높음, 기본 재생만 |

## 5. Edge Cases

| # | Scenario | Expected | Severity |
|---|----------|----------|----------|
| E1 | Dirt-Samples 폴더 미존재 | skip + 경고 "Dirt-Samples not found" | P1 |
| E2 | n > 폴더 내 파일 수 | n % fileCount (래핑) | P2 |
| E3 | reverb/delay 파라미터 없는 이벤트 | FX 노드 생략 | P2 |
| E4 | 샘플 파일 포맷 비호환 | Buffer.read 실패 → skip + 경고 | P2 |

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- synth-stem-map: Dirt-Samples 매핑 (bd→drums, sd→drums)
- osc-to-nrt: 샘플 이벤트 변환 (isSampleEvent, 매핑)
- stem-render: FX 체인에 nrtReverb/nrtDelay 포함
- FX_PARAMS 확장: room, size, dry, delaytime, delayfeedback 추가

### 8.2 Integration Tests
- render-stems-nrt.scd: Buffer.read + nrtPlayBuf 존재 확인 (정적)
- 321 기존 테스트 regression 0

---

## Changelog
### v0.1 (2026-03-27) — 초안
- B-PROD v0.1 NG7 (Dirt-Samples) + NG8 (reverb/delay) 해소

### v0.2 (2026-03-27) — Boomer 리뷰 반영
- [P1 fix] \nrtPlayBuf SynthDef 정의 추가 (bufnum, speed, amp, pan, dur)
- [P1 fix] 샘플 경로 해석 4단계 fallback (환경변수 → userAppSupport → Quarks → audio/samples/)
- [P1 fix] FX_CHAIN_ORDER + FX_PARAMS 확장 명시 (AC-2.3)
- [P2 fix] n % fileCount 래핑 로직 명시
