# PRD: Audio System v2 — SC/Tidal Integration Layer

**Version**: 0.2
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-27
**Status**: Draft
**Size**: L
**Scope**: SC 런타임 프리셋 전환 + BootTidal pF 바인딩 + NRT 멀티스템 SC 스크립트 + render-stems 풀 구현 + E2E 통합 테스트
**Prereq**: B-LIVE (184 tests) + B-PROD (253 tests) + B-PRESET (284 tests)

---

## 1. Problem Statement

### 1.1 Background
B-LIVE, B-PROD, B-PRESET의 TS 유틸리티 레이어는 완성되었다 (284 tests PASS). 그러나 실제 SuperCollider/TidalCycles 런타임과의 통합 레이어가 미구현:
- SC에서 JSON 프리셋을 런타임 로드하고 orbit에 적용하는 코드 없음
- BootTidal.hs에 B-PRESET SynthDef 파라미터 (openness, tone 등 11개) pF 바인딩 없음
- NRT 멀티스템 렌더링 SC 스크립트 없음 (TS가 Score config JSON을 생성하지만 SC가 실행하는 .scd 없음)
- render-stems.ts가 stub (scsynth + ffmpeg 실행 미구현)

### 1.2 Problem Definition
TS 유틸 → SC 런타임 브릿지가 없어 전체 파이프라인이 end-to-end로 동작하지 않음.

### 1.3 Impact of Not Solving
- `setPreset "hard_techno"` Tidal 명령이 동작하지 않음
- `npm run render:stems` 실행 불가
- 장르 프리셋이 실제 사운드에 반영 안 됨
- E2E 검증 불가

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: SC 런타임 프리셋 전환 — genre-presets.scd (JSON 로드 + orbit 적용 + 입력 검증)
- [ ] G2: Tidal pF 바인딩 — BootTidal.hs에 11개 SynthDef 파라미터 + setPreset/getPreset 헬퍼
- [ ] G3: NRT 멀티스템 SC 스크립트 — render-stems-nrt.scd (Score config → scsynth -N → 8ch WAV)
- [ ] G4: render-stems.ts 풀 구현 — sclang 호출 + ffmpeg 8ch→4x2ch split
- [ ] G5: E2E 통합 테스트 — 전체 파이프라인 vitest (sclang skip 전략 포함)

### 2.2 Non-Goals
- NG1: 새로운 SynthDef 추가 (기존 9종 사용)
- NG2: 새로운 FX 추가 (기존 4종 사용)
- NG3: GUI/웹 UI
- NG4: 기존 TS 유틸 수정 (genre-preset.ts, osc-to-nrt.ts 등은 완성됨)

## 3. User Stories & Acceptance Criteria

### US-1: SC 런타임 프리셋 전환
**As a** 라이브 퍼포머, **I want** Tidal에서 `setPreset "hard_techno"` 입력 시 SC가 즉시 사운드를 전환하기를.

**Acceptance Criteria:**
- [ ] AC-1.1: `genre-presets.scd` — `~loadPreset` 함수. genres/ → user/ 순서 탐색. JSON 파싱 후 **fxDefaults만** `~dirt.orbits.do { |o| o.set(...) }` 적용. **synthParams는 TS 레이어 전용 (SC에서 무시)**
- [ ] AC-1.2: SC-side 입력 검증 — `matchRegexp("^[a-zA-Z0-9_-]+$")`. 실패 시 경고 + 현재 유지
- [ ] AC-1.3: SC-side parseJSON 에러 보호 — `try { } { |err| }`. 크래시 안 함
- [ ] AC-1.4: `/dirt/play` OSC 핸들러 — `s=="setpreset"` 필터. 프리셋명은 `presetName` 파라미터에서 읽음 (NOT `n`). `s=="getpreset"` → 현재 프리셋명 출력
- [ ] AC-1.5: 캐시 가드 — 동일 프리셋 재로드 스킵 (`if(name == ~currentPresetName)`)
- [ ] AC-1.6: boot.scd Routine 내에서 genre-presets.scd 로드 (custom-fx 이후)

### US-2: BootTidal.hs pF 바인딩
**As a** 라이브 코더, **I want** Tidal에서 `# openness 0.3 # vibrato 0.5` 등 모든 SynthDef 파라미터를 직접 제어할 수 있기를.

**Acceptance Criteria:**
- [ ] AC-2.1: 11개 신규 pF 바인딩: openness, tone, filterEnv, vibrato, portamento, brightness, sweepRange, noiseAmount, envAmount, `clapSpread = pF "spread"`, `sawMix = pF "mix"`
- [ ] AC-2.2: `presetName = pS "presetName"` 커스텀 파라미터 + `setPreset name = once $ s "setpreset" # presetName (pure name)` 헬퍼. **`n (fromString name)` 불가 — `n`은 Pattern Double 타입, String 전달 불가**
- [ ] AC-2.3: `getPreset = once $ s "getpreset"` 헬퍼
- [ ] AC-2.4: 기존 14개 FX pF + 6개 SynthDef pF 무변경 (regression 0)
- [ ] AC-2.5: `attack`/`release` 미추가 — Tidal 빌트인. `spread`→`clapSpread`, `mix`→`sawMix` (빌트인 충돌 회피)

### US-3: NRT 멀티스템 SC 스크립트
**As a** 프로듀서, **I want** `npm run render:stems`가 실제 scsynth NRT로 8ch WAV를 렌더하기를.

**Acceptance Criteria:**
- [ ] AC-3.1: `render-stems-nrt.scd` — Score config JSON 읽기 → SynthDef **14종** (instruments 9 + FX 4 + nrt_sidechain_send 1) writeDefFile → Score 빌드 → `recordNRT` 실행. ServerOptions: `numOutputBusChannels=8` 명시
- [ ] AC-3.2: CLI: `sclang render-stems-nrt.scd <config.json> <output.wav>`. argv 파싱
- [ ] AC-3.3: 에러 처리 — config 파싱 실패, 빈 entries, scsynth 크래시 시 에러 메시지 + exit 1
- [ ] AC-3.4: 출력: 8ch WAV (48kHz 32-bit float). channels = config.outputChannels
- [ ] AC-3.5: NRT sidechain send SynthDef (`\nrt_sidechain_send`) 인라인 정의

### US-4: render-stems.ts 풀 구현
**As a** 프로듀서, **I want** `npm run render:stems <nrt-score.nrt.json>`이 실제 스템 WAV 4개를 생성하기를.

**Acceptance Criteria:**
- [ ] AC-4.1: .nrt.json 읽기 → generateNrtScoreEntries → writeScoreConfig → sclang render-stems-nrt.scd 실행
- [ ] AC-4.2: sclang 출력 8ch WAV → ffmpeg로 4x2ch 스템 분리 (buildSplitCommands 활용)
- [ ] AC-4.3: 출력: `out/audio/{date}_{title}/stems/stem-{drums,bass,synth,fx}.wav`
- [ ] AC-4.4: sclang/ffmpeg 미설치 시 명확한 에러 + 설치 안내
- [ ] AC-4.5: `--title`, `--preset` CLI 옵션 지원
- [ ] AC-4.6: .render.lock 동시 실행 방지
- [ ] AC-4.7: execFile array-form만 사용

### US-5: E2E 통합 테스트
**As a** 개발자, **I want** 전체 파이프라인의 E2E 통합 테스트가 있기를, **so that** SC 설치 시 전체 동작을 검증할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: vitest E2E 테스트 파일. **`describe.skipIf(!hasSclang)`** 패턴 (group-level). 동기 감지: `execSync('which sclang')` module-level
- [ ] AC-5.2: SC 통합: boot.scd → genre-presets.scd 로드 → 에러 0
- [ ] AC-5.3: BootTidal.hs 정적 검증 — 11개 pF + setPreset/getPreset 존재
- [ ] AC-5.4: render-stems-nrt.scd 구문 검증 (sclang 파싱 에러 0)
- [ ] AC-5.5: render-stems.ts 정적 검증 — execFile-only, sclang 미설치 시 명확한 에러
- [ ] AC-5.6: 기존 284 테스트 regression 0

## 4. Technical Design

### 4.1 Architecture

```
[Tidal] setPreset "hard_techno"
  → once $ s "setpreset" # presetName (pure "hard_techno")
  → SuperDirt /dirt/play (s="setpreset", presetName="hard_techno")
  → genre-presets.scd OSCFunc 필터 (presetName 파라미터 읽기)
  → ~loadPreset.("hard_techno")
  → File.read(genres/hard_techno.json).parseJSON
  → ~dirt.orbits.do { |o| o.set(\compress, 0.85, ...) }

[NRT] npm run render:stems <score.nrt.json>
  → render-stems.ts (TS)
  → generateNrtScoreEntries + writeScoreConfig
  → execFile("sclang", [render-stems-nrt.scd, config, output])
  → render-stems-nrt.scd (SC)
  → writeDefFile (13종) + Score.recordNRT → 8ch WAV
  → execFile("ffmpeg", [split commands]) → 4x2ch stems
```

### 4.2 Key Technical Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| SC 프리셋 전환 | `/dirt/play` 필터 (NOT `/preset/set`) | SuperDirt 기존 OSC 경로 활용, 커스텀 포트 불필요 |
| pF 충돌 회피 | `clapSpread = pF "spread"`, `sawMix = pF "mix"` | Tidal 빌트인 `spread` 콤비네이터 + `mix` 함수 보호 |
| attack/release | 미추가 (Tidal 빌트인) | 이미 SuperDirt가 pad SynthDef에 전달 |
| NRT SynthDef 로딩 | writeDefFile → scsynth 자동 로드 | 기존 render-nrt.scd 패턴 동일 |
| E2E CI 전략 | `it.skipIf(!hasSclang)` | SC 미설치 CI에서 안전하게 skip |

### 4.3 파일 구조

```
audio/sc/superdirt/
├── genre-presets.scd     # (신규) SC 프리셋 로더 + OSC 핸들러
├── boot.scd              # (수정) genre-presets.scd Routine 내 로드

audio/sc/scores/
├── render-stems-nrt.scd  # (신규) NRT 멀티스템 렌더

audio/tidal/
├── BootTidal.hs          # (수정) pF 11개 + setPreset/getPreset

scripts/
├── render-stems.ts       # (수정) stub → 풀 구현
├── lib/
│   └── e2e-integration.test.ts  # (신규) E2E 테스트
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | sclang 미설치 시 render:stems | "sclang not found. Install: brew install --cask supercollider" | P1 |
| E2 | ffmpeg 미설치 시 stem split | "ffmpeg not found. Install: brew install ffmpeg" | P1 |
| E3 | SC parseJSON 실패 | try/catch → 에러 메시지 + 현재 프리셋 유지 | P1 |
| E4 | 잘못된 프리셋명 OSC | regex 거부 + 경고 | P2 |
| E5 | 빈 Score config | "No entries in config" + exit 1 | P2 |
| E6 | scsynth NRT 크래시 | exit code 체크 + 에러 리포트 | P1 |
| E7 | 동시 render:stems | .render.lock 거부 | P2 |

## 6. Security & Permissions
- SC-side regex `^[a-zA-Z0-9_-]+$` 입력 검증 (path traversal 방지)
- SC-side try/catch parseJSON (크래시 방지)
- TS-side execFile array-form 정책 유지
- BootTidal.hs 127.0.0.1 바인딩 무변경

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| setPreset 전환 | < 50ms | SC 프로파일링 |
| NRT 3분 렌더 | < 120초 | time 측정 |
| 8ch→4x2ch split | < 10초 | ffmpeg 속도 |

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- BootTidal.hs 정적 검증 (11 pF + helpers)
- render-stems.ts execFile-only 검증
- 기존 284 regression

### 8.2 Integration Tests (vitest, sclang skip)
- boot.scd + genre-presets.scd 로드 → 에러 0
- render-stems-nrt.scd 파싱 → 에러 0
- ~loadPreset 동작 (valid/invalid/malformed)

## 9. Rollout Plan

| Step | 내용 | Size | 의존 |
|------|------|------|------|
| I-1 | genre-presets.scd + boot.scd 수정 | M | B-PRESET JSON |
| I-2 | BootTidal.hs pF + helpers | S | None |
| I-3 | render-stems-nrt.scd | M | B-PROD stem-render.ts |
| I-4 | render-stems.ts 풀 구현 | M | I-3 |
| I-5 | E2E 통합 테스트 | M | I-1~I-4 |

### 9.1 Rollback
1. genre-presets.scd 삭제, boot.scd 리버트
2. BootTidal.hs 리버트 (git checkout)
3. render-stems-nrt.scd 삭제
4. render-stems.ts 리버트 (stub 복원)

## 10. Dependencies & Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| SC parseJSON 중첩 JSON 지원 | 낮음 | 높음 | 5종 프리셋으로 사전 테스트 |
| sclang argv 파싱 호환 | 낮음 | 중간 | thisProcess.argv 표준 |
| scsynth -N 8ch 출력 호환 | 낮음 | 중간 | ServerOptions.numOutputBusChannels |
| BootTidal.hs GHCi 호환 | 낮음 | 높음 | 기존 pF 패턴 동일 |
| 기존 284 테스트 regression | 낮음 | 높음 | SC 파일 분리, TS 최소 수정 |

## 11. Open Questions
- [x] ~~OQ-1: attack/release Tidal 빌트인 충돌~~ → 해결: 미추가 (빌트인)
- [x] ~~OQ-2: spread/mix 빌트인 충돌~~ → 해결: clapSpread/sawMix

---

## Changelog
### v0.1 (2026-03-27) — 초안
- B-LIVE + B-PROD + B-PRESET 기반 SC/Tidal 통합 레이어 범위 정의
- 5 US, 5 Rollout Steps

### v0.2 (2026-03-27) — Phase 2 리뷰 반영
- [P1 fix] `fromString` 타입 에러 → `pS "presetName"` + `presetName (pure name)` 방식
- [P1 fix] synthParams SC-side 적용 경계 명확화: fxDefaults만 orbit 적용, synthParams는 TS 전용
- [P2 fix] SynthDef 13→14종 (+ nrt_sidechain_send)
- [P2 fix] ServerOptions numOutputBusChannels=8 명시
- [P2 fix] E2E skipIf → describe.skipIf 동기 감지 패턴
