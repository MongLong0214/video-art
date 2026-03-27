# T3b: NRT 프리셋 통합

**PRD Ref**: PRD-audio-v2-preset > US-4
**Priority**: P1 (High)
**Size**: M (4-6h)
**Status**: Todo
**Depends On**: T1, T2
**Level 2**: osc-to-nrt.ts 시그니처 변경, synth-stem-map.ts 수정 — Isaac 승인

---

## 1. Objective
B-PROD NRT 파이프라인에 프리셋 FX 기본값 통합. prod:convert --preset + render:stems --preset + session-info preset 필드.

## 2. Acceptance Criteria
- [ ] AC-1: `prod:convert --preset hard_techno` → FX defaults merge (이벤트 우선, 미지정 시 프리셋 기본값)
- [ ] AC-2: .osclog에 `s "setpreset"` 이벤트 자동 감지. 없고 --preset 미지정 → 프리셋 없이 진행
- [ ] AC-3: `render:stems --preset` → 스템 그룹 프리셋 반영
- [ ] AC-4: session-info.json에 **preset** 필드 포함
- [ ] AC-5: `--preset`이 osclog 감지보다 우선
- [ ] AC-6: `convertToNrt()` 시그니처에 `presetFxDefaults?: Record<string, number>` 옵셔널 추가 (기존 호환)

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Expected |
|---|-----------|------|----------|
| 1 | `mergeFxDefaults event priority` | Unit | event.compress=0.5 beats preset=0.8 |
| 2 | `mergeFxDefaults fills missing` | Unit | no event compress → preset 0.8 |
| 3 | `mergeFxDefaults empty preset` | Unit | event params unchanged |
| 4 | `detectPresetFromOsclog found` | Unit | "hard_techno" |
| 5 | `detectPresetFromOsclog not found` | Unit | null |
| 6 | `--preset overrides osclog detected` | Unit | --preset wins |
| 7 | `renderStems --preset changes stemGroups` | Unit | groups match preset |
| 8 | `sessionInfoIncludesPreset` | Unit | preset field exists |
| 9 | `convertToNrt backward compatible` | Unit | 기존 호출 (preset 미지정) 동작 |
| 10 | `no exec or spawn` | Unit | static check |

### 3.2 Test File Location
- `scripts/lib/genre-preset.test.ts` (추가)

### 3.3 Mock/Setup Required
- tmpDir + 프리셋 JSON fixture

## 4. Implementation Guide

### 4.1 Files
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/genre-preset.ts` | Modify | detectPresetFromOsclog, mergeFxDefaults |
| `scripts/lib/osc-to-nrt.ts` | Modify | convertToNrt에 presetFxDefaults 옵셔널 파라미터 |
| `scripts/lib/prod-pipeline.ts` | Modify | sessionInfo.preset 필드 |
| `scripts/prod-convert.ts` | Modify | --preset argv |
| `scripts/render-stems.ts` | Modify | --preset argv |

## 5. Review Checklist
- [ ] TDD Red → Green → Refactor
- [ ] Level 2: Isaac 승인 (osc-to-nrt.ts 시그니처, B-PROD 핵심 코드)
- [ ] convertToNrt 기존 호출 backward compatible
- [ ] 기존 253 테스트 regression 0
