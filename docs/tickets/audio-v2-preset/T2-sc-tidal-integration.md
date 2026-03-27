# T2: SC genre-presets.scd + Tidal setPreset + BootTidal pF 바인딩

**PRD Ref**: PRD-audio-v2-preset > US-2
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
SC에서 프리셋을 런타임 로드하고, Tidal에서 `setPreset "hard_techno"` 한 줄로 전환 가능하게 한다. BootTidal.hs에 누락된 pF 바인딩 12개를 추가한다.

## 2. Acceptance Criteria
- [ ] AC-1: `genre-presets.scd` — SC에서 JSON 프리셋 로드 + orbit 기본값 적용. `~dirt.orbits.do { |o| o.set(...) }` (PRD AC-2.2)
- [ ] AC-2: SC-side 이름 검증 `^[a-zA-Z0-9_-]+$` + try/catch parseJSON (PRD AC-2.4)
- [ ] AC-3: Tidal에서 `setPreset "hard_techno"` → `once $ s "setpreset" # n "hard_techno"` → SC 프리셋 전환 (PRD AC-2.1)
- [ ] AC-4: 현재 패턴 유지, 다음 사이클부터 새 파라미터 (PRD AC-2.3)
- [ ] AC-5: `getPreset` → 현재 활성 프리셋명 출력 (PRD AC-2.5)
- [ ] AC-6: BootTidal.hs pF 바인딩 **11개** 추가: openness, tone, filterEnv, vibrato, portamento, brightness, sweepRange, noiseAmount, envAmount, `clapSpread = pF "spread"`, `sawMix = pF "mix"`. **attack/release는 Tidal 빌트인 — 추가 불필요** (PRD AC-2.6)
- [ ] AC-7: boot.scd의 **Routine 내에서** (custom-fx.scd 이후) genre-presets.scd 로드
- [ ] AC-9: `synth-stem-map.ts` normalizeParams 화이트리스트에 11개 신규 파라미터 추가 (PRD AC-2.7)
- [ ] AC-8: 잘못된 프리셋명/파일 미존재 시 경고 + 현재 유지 (PRD E1, E4)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `genre-presets.scd loads without error` | Integration | sclang boot.scd 실행 → genre-presets.scd 로드 | exit 0 |
| 2 | `loadPreset hard_techno in SC` | Integration | sclang ~loadPreset.("hard_techno") | "Preset loaded" stdout |
| 3 | `loadPreset invalid name rejected` | Integration | sclang ~loadPreset.("../hack") | "WARNING: Invalid" stdout |
| 4 | `loadPreset nonexistent warning` | Integration | sclang ~loadPreset.("nonexistent") | "WARNING: not found" stdout |
| 5 | `loadPreset malformed JSON safe` | Integration | 손상 JSON → try/catch | "ERROR: Failed to parse" (크래시 안 함) |
| 6 | `BootTidal.hs has setPreset helper` | Unit | BootTidal.hs 내용에 "setPreset" 포함 | static check pass |
| 7 | `BootTidal.hs has 11 new pF bindings` | Unit | 11개 각각 `pF "paramName"` regex 매칭 (attack/release 제외) | all 11 match |
| 8 | `BootTidal.hs no 0.0.0.0` | Unit | 기존 보안 검증 유지 | static check pass |
| 9 | `setPreset OSC handler registered` | Integration | sclang에서 /dirt/play s=setpreset 핸들러 확인 (NOT /preset/set) | registered |
| 10 | `genres/ + user/ directories exist` | Unit | 프리셋 디렉토리 존재 확인 | true |
| 11 | `getPreset returns current name` | Integration | ~loadPreset.("hard_techno") 후 ~currentPreset 확인 | "hard_techno" |
| 12 | `BootTidal.hs pF bindings strict` | Unit | 12개 각각 `pF "paramName"` 정규식 매칭 | all 12 match regex |

### 3.2 Test File Location
- `scripts/lib/genre-preset.test.ts` (T1 파일에 추가)
- `audio/sc/test-genre-presets.scd` (신규, SC 통합 테스트)

### 3.3 Mock/Setup Required
- SC 통합: sclang + SuperDirt 필요. **CI skip 전략**: `it.skipIf(!hasSclang)` 패턴. TC-1~5, 9, 11은 sclang 의존 → 로컬 전용
- Unit (TC-6~8, 10, 12): 파일 내용 정적 분석. CI 안전

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/superdirt/genre-presets.scd` | Create | ~loadPreset + OSCFunc + SC-side 검증 |
| `audio/sc/superdirt/boot.scd` | Modify | genre-presets.scd 로드 추가 |
| `audio/tidal/BootTidal.hs` | Modify | setPreset/getPreset + pF 12개 |
| `audio/sc/test-genre-presets.scd` | Create | SC 통합 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `genre-presets.scd` — PRD Section 4.4 기반 구현. **주의: OSC path는 `/dirt/play` (s=="setpreset" 필터), PRD 코드의 `/preset/set`은 참조용**. regex 검증 + try/catch + orbit 순회
2. `boot.scd` 수정 — Routine 내에서 genre-presets.scd 로드
3. `BootTidal.hs` — `setPreset`, `getPreset` 함수 + pF 12개 추가
4. SC 통합 테스트 작성

## 5. Edge Cases
- EC-1: 잘못된 프리셋명 → SC regex 거부 (PRD E1)
- EC-2: 손상 JSON → try/catch 보호 (PRD E2)
- EC-3: 파일 미존재 → 경고 + 현재 유지 (PRD E4)
- EC-4: 부팅 전 setpreset → OSCFunc 미등록 → 무시 (PRD E10)

## 6. Review Checklist
- [ ] Red → Green → Refactor
- [ ] SC regex 검증 동작 확인
- [ ] try/catch parseJSON 동작 확인
- [ ] BootTidal.hs pF 12개 존재
- [ ] 기존 테스트 regression 0
