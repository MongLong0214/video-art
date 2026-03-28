# T10: temporal dynamics 매핑 + buildNrtScore

**PRD Ref**: PRD-track-analyzer-phase2 > US-8
**Priority**: P1
**Size**: L
**Status**: Todo
**Depends On**: T1, T2, T9

---

## 1. Objective
정적 매핑→동적 매핑 재설계. 섹션별 파라미터 분기 + envelope following + accent 추출. buildNrtScore를 nrt-builder.ts(신규) 또는 osc-to-nrt.ts 확장으로 구현.

## 2. Acceptance Criteria
- [ ] AC-1: sections[] 필드 추가 (AC-8.1). start/end 절대초. 비중첩
- [ ] AC-2: 섹션별 독립 매핑 drop/break/build (AC-8.2)
- [ ] AC-3: RMS envelope following (AC-8.3)
- [ ] AC-4: accent pattern 추출 (AC-8.4)
- [ ] AC-5: 하위 호환 — sections 미지원 시 단일 프리셋 (AC-8.5)
- [ ] AC-6: NRT: NrtCommand + NrtControlEvent + buildNrtScore (AC-8.6, §4.3.4)
- [ ] AC-7: Tidal: 섹션별 코드 블록 (AC-8.7)
- [ ] AC-8: NrtScore 확장 필드 optional (Phase 1 호환)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `generatePreset with sections` | Unit | analysis with structure | sections[] present |
| 2 | `generatePreset without sections` | Unit | structure=null | no sections (backward) |
| 3 | `drop section maps kick/bass heavy` | Unit | drop segment | high drive/compress |
| 4 | `break section maps pad/ambient` | Unit | break segment | low drive, pad focus |
| 5 | `accent extraction from onset strength` | Unit | onset envelope | accent positions |
| 6 | `buildNrtScore merges 3 sources` | Unit | events+bufCmds+sections | merged NrtScore |
| 7 | `buildNrtScore buffer commands at time=0` | Unit | output | bufCmds first |
| 8 | `buildNrtScore controlEvents at section boundaries` | Unit | 2 sections | n_set events |
| 9 | `NrtScore optional fields backward compat` | Unit | convertToNrt output | no bufferCommands |

### 3.2 Test File Location
- scripts/lib/track-analyzer.test.ts, scripts/lib/nrt-builder.test.ts (신규)

### 3.3 Mock/Setup Required
- 없음

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/lib/track-analyzer.ts | Modify | temporal dynamics + sections |
| scripts/lib/nrt-builder.ts | Create | buildNrtScore + NRT 타입 확장 |
| scripts/lib/nrt-builder.test.ts | Create | buildNrtScore 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. nrt-builder.ts: NrtCommand, NrtControlEvent, ExtendedNrtScore, buildNrtScore
2. track-analyzer.ts: generatePreset sections 확장, accent 추출
3. Tidal 섹션별 코드 생성
4. 통합 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E7 (accent 실패 → default 0)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
