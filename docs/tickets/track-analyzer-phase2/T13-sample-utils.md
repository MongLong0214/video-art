# T13: sample-utils.ts (manifest 파싱 + 하이브리드 stemGroup 해석)

**PRD Ref**: PRD-track-analyzer-phase2 > US-10, US-11
**Priority**: P2
**Size**: M
**Status**: Todo
**Depends On**: T1, T8

---

## 1. Objective
parseStemGroupRef 함수로 하이브리드 레퍼런스 파싱. manifest.json→BufferAllocator→buf 파라미터 해석 체인.

## 2. Acceptance Criteria
- [ ] AC-1: parseStemGroupRef("sample_player:kick_001") → {synthDef, sampleRef} (AC-10.6)
- [ ] AC-2: sampleRef → manifest.json 조회 → BufferAllocator index
- [ ] AC-3: 미존재 ref → warning + skip
- [ ] AC-4: generateSampleBufferCommands 상대 경로 (§4.3.1)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `parseStemGroupRef hybrid ref` | Unit | "sample_player:kick_001" | {synthDef, sampleRef} |
| 2 | `parseStemGroupRef plain ref` | Unit | "acid_bass" | {synthDef, sampleRef: undefined} |
| 3 | `resolve sampleRef to buffer index` | Unit | manifest + allocator | valid index |
| 4 | `missing sampleRef warns` | Unit | nonexistent ref | warning, skip |
| 5 | `relative path in b_allocRead` | Unit | commands output | relative paths |

### 3.2 Test File Location
- scripts/lib/sample-utils.test.ts

### 3.3 Mock/Setup Required
- manifest.json fixture

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/lib/sample-utils.ts | Modify | parseStemGroupRef + resolve chain |

### 4.2 Implementation Steps (Green Phase)
1. parseStemGroupRef 구현
2. manifest resolve → BufferAllocator 연동
3. 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- 없음

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
