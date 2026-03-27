# T2: BootTidal.hs pF 바인딩 + setPreset/getPreset

**PRD Ref**: PRD-audio-v2-sc-integration > US-2
**Priority**: P0 (Blocker)
**Size**: S (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
BootTidal.hs에 11개 SynthDef pF 바인딩 + setPreset/getPreset 헬퍼를 추가한다.

## 2. Acceptance Criteria
- [ ] AC-1: 11개 pF: openness, tone, filterEnv, vibrato, portamento, brightness, sweepRange, noiseAmount, envAmount, `clapSpread = pF "spread"`, `sawMix = pF "mix"` (PRD AC-2.1)
- [ ] AC-2: `presetName = pS "presetName"` + `setPreset name = once $ s "setpreset" # presetName (pure name)` (PRD AC-2.2)
- [ ] AC-3: `getPreset = once $ s "getpreset"` (PRD AC-2.3)
- [ ] AC-4: 기존 20개 pF + target 설정 무변경 (PRD AC-2.4)
- [ ] AC-5: attack/release 미추가, spread→clapSpread, mix→sawMix (PRD AC-2.5)

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `BootTidal has 11 new pF strict` | Unit | 각 pF regex 매칭 | all 11 `pF "name"` found |
| 2 | `BootTidal has setPreset helper` | Unit | setPreset 정의 존재 | contains "setPreset" |
| 3 | `BootTidal has getPreset helper` | Unit | getPreset 정의 존재 | contains "getPreset" |
| 4 | `BootTidal has presetName pS` | Unit | pS "presetName" 정의 | contains `pS "presetName"` |
| 5 | `BootTidal no attack pF` | Unit | attack 미추가 확인 | NOT contains `pF "attack"` |
| 6 | `BootTidal no release pF` | Unit | release 미추가 확인 | NOT contains `pF "release"` |
| 7 | `BootTidal clapSpread alias` | Unit | spread→clapSpread | contains `clapSpread = pF "spread"` |
| 8 | `BootTidal sawMix alias` | Unit | mix→sawMix | contains `sawMix = pF "mix"` |
| 9 | `BootTidal 127.0.0.1 preserved` | Unit | 기존 보안 유지 | contains "127.0.0.1" |
| 10 | `BootTidal existing pF unchanged` | Unit | 기존 14 FX pF 존재 | all 14 found |

### 3.2 Test File Location
- `scripts/lib/e2e-integration.test.ts` (T1과 공유)

## 4. Implementation Guide

### 4.1 Files
| File | Change Type | Description |
|------|------------|-------------|
| `audio/tidal/BootTidal.hs` | Modify | pF 11개 + pS presetName + setPreset + getPreset |

### 4.2 Implementation Steps
1. 신규 `let` 블록: 11개 pF 바인딩 (:{...}:)
2. presetName = pS "presetName"
3. setPreset/getPreset 헬퍼
