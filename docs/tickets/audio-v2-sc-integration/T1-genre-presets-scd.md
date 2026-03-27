# T1: genre-presets.scd + boot.scd 통합

**PRD Ref**: PRD-audio-v2-sc-integration > US-1
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: None (B-PRESET JSON 완료)

---

## 1. Objective
SC에서 JSON 프리셋을 런타임 로드하고, Tidal setPreset 명령에 응답하여 orbit FX 기본값을 전환한다.

## 2. Acceptance Criteria
- [ ] AC-1: `~loadPreset` — genres/→user/ 탐색, JSON parseJSON, **fxDefaults만** orbit 적용 (PRD AC-1.1)
- [ ] AC-2: SC regex `matchRegexp("^[a-zA-Z0-9_-]+$")` 입력 검증 (PRD AC-1.2)
- [ ] AC-3: try/catch parseJSON 에러 보호 (PRD AC-1.3)
- [ ] AC-4: `/dirt/play` 필터 — `s=="setpreset"`, **`presetName` 파라미터**에서 프리셋명 읽기 (PRD AC-1.4)
- [ ] AC-5: 캐시 가드 — 동일 프리셋 재로드 스킵 (PRD AC-1.5)
- [ ] AC-6: boot.scd Routine 내 (custom-fx 이후) genre-presets.scd 로드. File.exists 가드 (PRD AC-1.6)
- [ ] AC-7: getpreset — `s=="getpreset"` → `~currentPresetName` stdout 출력

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `genre-presets.scd exists` | Unit | 파일 존재 확인 | true |
| 2 | `genre-presets.scd no 0.0.0.0` | Unit | 보안 정적 검증 | no match |
| 3 | `genre-presets.scd has matchRegexp` | Unit | regex 검증 코드 존재 | contains "matchRegexp" |
| 4 | `genre-presets.scd has try catch` | Unit | parseJSON 보호 | contains "try" |
| 5 | `genre-presets.scd has orbits.do` | Unit | orbit 순회 패턴 | contains "orbits.do" |
| 6 | `genre-presets.scd has cache guard` | Unit | 동일 프리셋 스킵 | contains "currentPresetName" |
| 7 | `genre-presets.scd reads presetName` | Unit | n 대신 presetName 사용 | contains "presetName" |
| 8 | `boot.scd loads genre-presets.scd` | Unit | boot에 로드 코드 존재 | contains "genre-presets" |
| 9 | `loadPreset valid SC syntax` | Integration | sclang 파싱 에러 0 | exit 0 (skipIf !sclang) |
| 10 | `loadPreset hard_techno` | Integration | 프리셋 로드 성공 | stdout "Preset loaded" (skipIf) |
| 11 | `genre-presets.scd has getpreset handler` | Unit | getpreset OSC 핸들러 | contains "getpreset" |

### 3.2 Test File Location
- `scripts/lib/e2e-integration.test.ts` (신규)

### 3.3 Mock/Setup Required
- Unit: fs.readFileSync 정적 분석
- Integration: `describe.skipIf(!hasSclang)`. 동기 감지: `execSync('which sclang')`

## 4. Implementation Guide

### 4.1 Files
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/superdirt/genre-presets.scd` | Create | ~loadPreset + OSC handler + 검증 |
| `audio/sc/superdirt/boot.scd` | Modify | Routine 내 genre-presets.scd 로드 |

### 4.2 Implementation Steps
1. genre-presets.scd: ~loadPreset (regex→File.exists→try parseJSON→fxDefaults orbit apply)
2. genre-presets.scd: OSCFunc `/dirt/play` 필터 (s=="setpreset" → presetName 추출 → ~loadPreset)
3. genre-presets.scd: getpreset handler
4. boot.scd: Routine 내 custom-fx 이후 genre-presets.scd 로드 (File.exists 가드)
