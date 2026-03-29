# T16: Hybrid Sample Render 완성

**PRD Ref**: PRD-track-analyzer-phase2-completion > US-1
**Priority**: P1
**Size**: L
**Status**: Todo
**Depends On**: T15

---

## 1. Objective
`--hybrid` 모드에서 manifest read → BufferAllocator → b_allocRead → sample_player 이벤트 스케줄. 합성+샘플 병행 렌더.

## 2. Acceptance Criteria
- [ ] AC-1: manifest.json 읽기. 없으면 synthesis-only 폴백 + warning (AC-1.1)
- [ ] AC-2: BufferAllocator.allocate('samples') + b_allocRead NRT 명령 (AC-1.2)
- [ ] AC-3: kick/snare 히트를 onset 타이밍에 sample_player 이벤트 스케줄 (AC-1.3)
- [ ] AC-4: bass 샘플을 pitch_contour 타이밍에 sample_player 병행 (AC-1.4)
- [ ] AC-5: 검증: b_allocRead >= 1 + RMS delta > 0.01 (AC-1.5)
- [ ] AC-6: generateSampleBufferCommands(manifestPath, allocator, analysisDir) 호출 (AC-1.6)
- [ ] AC-7: gain staging: sample_player amp=0.6, v0.5.2 계약 준수 (AC-1.7)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `hybrid reads manifest` | Unit | hybridMode + manifest exists | manifest parsed |
| 2 | `hybrid fallback no manifest` | Unit | hybridMode + no manifest | warning, synthesis-only |
| 3 | `b_allocRead commands generated` | Unit | manifest with 3 hits | 3 b_allocRead cmds |
| 4 | `sample_player events at onset times` | Unit | kick onsets [0, 0.5, 1.0] | 3 sample_player events |
| 5 | `sample_player amp=0.6` | Unit | any sample event | amp param = 0.6 |
| 6 | `hybrid WAV differs from synthesis` | Integration | render both modes | RMS delta > 0.01 |
| 7 | `buf sentinel -1 when unallocated` | Unit | missing sample file | buf=-1, silent |

### 3.2 Test File Location
- scripts/lib/hybrid-render.test.ts (신규)

### 3.3 Mock/Setup Required
- Mock manifest.json fixture
- Mock WAV files not needed (b_allocRead path only)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/render-analysis.ts | Modify | hybridMode block: manifest read, buffer alloc, sample_player scheduling |
| scripts/lib/hybrid-render.test.ts | Create | Unit + integration tests |

### 4.2 Implementation Steps (Green Phase)
1. render-analysis.ts에 BufferAllocator, generateSampleBufferCommands import
2. hybridMode 블록: manifest read → allocator → bufCmds 생성
3. manifest hits를 onset_time 기준으로 sample_player addEvent 호출
4. b_allocRead NRT commands를 SC score에 time=0으로 삽입
5. 통합 테스트: synthesis vs hybrid WAV RMS delta 검증

## 5. Edge Cases
- E1 (manifest 미존재 → fallback)
- E2 (샘플 WAV 파일 누락 → skip)
- E13 (buf sentinel -1)

## 6. Review Checklist
- [ ] Red → Green → Refactor cycle 완료
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
