# T7: FFmpeg Dynamic Bitrate

**PRD Ref**: PRD-pipeline-hardening > US-5
**Priority**: P2 (Medium)
**Size**: M
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
hardcoded 15M bitrate를 해상도 기반 동적 bitrate로 교체한다. scope는 30fps 고정.

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/lib/bitrate.ts`에 `getBitrate(resolution: [number, number]): string` 함수 (테스트 가능한 별도 모듈). 보간 결과는 floor 반올림
- [ ] AC-2: 매핑: 720p→"8M", 1080p→"15M", 1440p→"25M", 4K→"40M"
- [ ] AC-3: 보간: 픽셀 수 기반 선형 보간
- [ ] AC-4: 클램프: 720p 미만→"8M", 4K 초과→"40M"
- [ ] AC-5: portrait/landscape 동일 (width*height)
- [ ] AC-6: `export-layered.ts`에서 `getBitrate` import하여 `"-b:v"` 인자 교체
- [ ] AC-7: 기존 1080p = "15M" 유지
- [ ] AC-8: 30fps scope — 60fps bitrate 조정은 이 PRD 범위 외

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `720p → 8M` | Unit | [1280, 720] | "8M" |
| 2 | `1080p → 15M` | Unit | [1920, 1080] | "15M" |
| 3 | `1440p → 25M` | Unit | [2560, 1440] | "25M" |
| 4 | `4K → 40M` | Unit | [3840, 2160] | "40M" |
| 5 | `below 720p clamps to 8M` | Unit | [640, 480] | "8M" |
| 6 | `above 4K clamps to 40M` | Unit | [7680, 4320] | "40M" |
| 7 | `interpolates between anchors` | Unit | [2560, 1080] (2,764,800px) | "19M" (floor: 15+(25-15)*(2764800-2073600)/(3686400-2073600)=19.28→floor) |
| 8 | `portrait = landscape` | Unit | [1080, 1920] vs [1920, 1080] | same |
| 9 | `exact 1080p backwards compat` | Unit | [1920, 1080] | "15M" |

### 3.2 Test File Location
- `scripts/lib/bitrate.test.ts` (신규 — 순수 유틸 테스트)

### 3.3 Mock/Setup Required
없음 (순수 함수)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/bitrate.ts` | Create | `getBitrate` 함수 (테스트 가능한 별도 모듈) |
| `scripts/lib/bitrate.test.ts` | Create | 9개 테스트 |
| `scripts/export-layered.ts` | Modify | `getBitrate` import + `encodeVideo`에 resolution 인자 + 15M → `getBitrate(resolution)` |

### 4.2 Implementation Steps (Green Phase)
1. 테스트 작성 → FAIL (모듈 미존재)
2. `bitrate.ts` — anchor table + 선형 보간 + clamp 구현 → PASS
3. `export-layered.ts` — `encodeVideo` 시그니처에 resolution 추가, `"-b:v", "15M"` → `"-b:v", getBitrate(resolution)`
4. `main()`에서 `encodeVideo(ctx.paths.frames, outputPath, config.resolution)` 호출
5. 전체 테스트 → PASS

### 4.3 Refactor Phase
없음

## 5. Edge Cases
- EC-1: 비표준 해상도 (1920x800) → pixel count 보간
- EC-2: 정사각형 (1080x1080) → 720p~1080p 보간

## 6. Review Checklist
- [ ] Red: FAILED
- [ ] Green: PASSED
- [ ] 1080p = 15M 보장
- [ ] 30fps scope 명시 확인
