# T6: VMAF 메트릭 실제 연동 + 설치 가이드

**PRD Ref**: PRD-autoresearch-enterprise > US-4
**Priority**: P2 (Medium)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None (독립)

---

## 1. Objective
VMAF 메트릭(M7)이 libvmaf 설치 시 실제 계산되도록 연동하고, fallback 경로를 명확히 하며, 설치 가이드를 문서화한다.

## 2. Acceptance Criteria
- [ ] AC-1: Given ffmpeg에 libvmaf 포함, When `checkVmafAvailable()` 호출, Then true 반환
- [ ] AC-2: Given ffmpeg에 libvmaf 미포함, When `checkVmafAvailable()` 호출, Then false 반환
- [ ] AC-3: Given libvmaf available, When `computeVmaf()` 호출, Then 0-1 범위 VMAF 점수 반환
- [ ] AC-4: Given libvmaf unavailable, When `evaluateVideo()` 호출, Then M7=0.5 fallback + stderr 가이드 1회
- [ ] AC-5: Given `computeVmaf()` throw, When evaluate.ts에서 호출, Then catch → M7=0.5 (evaluate.ts 책임 확인)
- [ ] AC-6: README §Prerequisites에 libvmaf 빌드 가이드 추가 (cmake + Xcode CLT 전제)
- [ ] AC-7: mock ffmpeg VMAF output 기반 computeVmaf 테스트

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `checkVmafAvailable returns true when libvmaf present` | Unit | execFileSync mock | true |
| 2 | `checkVmafAvailable returns false when libvmaf absent` | Unit | execFileSync throw mock | false |
| 3 | `computeVmaf returns normalized 0-1 score` | Unit | mock ffmpeg JSON output with `pooled_metrics.vmaf.mean=85.3` | 0.853 |
| 4 | `computeVmaf throws on ffmpeg failure` | Unit | execFileSync throw | Error |
| 5 | `evaluateVideo uses fallback 0.5 when vmaf unavailable` | Integration | checkVmafAvailable=false | M7=0.5 |
| 6 | `evaluateVideo catches computeVmaf error and falls back` | Integration | computeVmaf throw | M7=0.5 |

### 3.2 Test File Location
- `scripts/research/metrics/vmaf.test.ts` (기존 있으면 추가, 없으면 생성)

### 3.3 Mock/Setup Required
- `vi.mock("child_process")` — execFileSync mock (ffmpeg VMAF output)
- `vi.mock("fs")` — existsSync mock

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/research/metrics/vmaf.ts | Modify | checkVmafAvailable 로직 검증/수정 |
| scripts/research/evaluate.ts | Modify | computeVmaf catch → fallback 0.5 (이미 있으면 확인만) |
| scripts/research/metrics/vmaf.test.ts | Create/Modify | 6개 테스트 |
| README.md | Modify | §Prerequisites에 libvmaf 가이드 추가 |

### 4.2 Implementation Steps (Green Phase)
1. vmaf.ts: `checkVmafAvailable()` — `ffmpeg -filters 2>&1 | grep libvmaf` 방식 확인/구현
2. vmaf.ts: `computeVmaf()` — ffmpeg JSON 출력에서 `pooled_metrics.vmaf.mean` 파싱 및 /100 정규화 확인 (plain-text "VMAF score:" 아닌 JSON 형식)
3. evaluate.ts: M7 계산 부분에서 try/catch + fallback 0.5 확인 (이미 있으면 검증만)
4. vmaf.test.ts: 6개 테스트 작성 → Green
5. README.md §Prerequisites: libvmaf 빌드 가이드 추가

### 4.3 Refactor Phase
- 없음

## 5. Edge Cases
- E5: libvmaf 미설치 시 fallback 0.5 + 설치 가이드 1회 출력 (반복 방지)

## 6. Review Checklist
- [ ] Red: 테스트 FAILED (구현 전)
- [ ] Green: 6개 테스트 PASSED
- [ ] Refactor: 전체 PASSED 유지
- [ ] evaluate.ts fallback 경로 확인
- [ ] README 가이드 추가
