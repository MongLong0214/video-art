# T3: Candidate Extraction + Connected Component Analysis

**PRD Ref**: PRD-layer-decomposition-overhaul > US-1, §5.4
**Priority**: P0 (Blocker)
**Size**: M
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

Qwen RGBA 출력을 candidate로 변환: alpha binarize → BFS connected component split → component stats 계산. 파이프라인의 핵심 기반 모듈.

## 2. Acceptance Criteria

- [ ] AC-1: RGBA PNG를 읽어 alpha > 128 binarize 후 connected component 분리
- [ ] AC-2: 각 component에 대해 bbox, centroid, coverage, edgeDensity 계산
- [ ] AC-3: coverage < 0.5% component는 자동 제거
- [ ] AC-4: 4-connectivity BFS, 2048x2048에서 < 2s
- [ ] AC-5: 단일 RGBA 이미지에서 여러 disconnected 영역 → 별도 candidate로 분리

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should split two disconnected regions` | Unit | 좌반/우반 분리된 alpha mask | 2 candidates |
| 2 | `should merge connected pixels` | Unit | L자형 연결 영역 | 1 candidate |
| 3 | `should drop tiny components` | Unit | 0.3% coverage 소형 blob | 0 candidates (dropped) |
| 4 | `should compute correct bbox` | Unit | 알려진 위치의 사각형 | bbox 일치 |
| 5 | `should compute correct centroid` | Unit | 대칭 사각형 | 중심점 일치 |
| 6 | `should compute coverage ratio` | Unit | 200x200 중 50x50 opaque | coverage ≈ 0.0625 |
| 7 | `should handle fully transparent image` | Unit | alpha=0 전체 | 0 candidates |
| 8 | `should handle fully opaque image` | Unit | alpha=255 전체 | 1 candidate, coverage=1.0 |
| 9 | `should complete within 2s for 2048x2048` | Perf | 2048x2048 랜덤 패턴 | < 2000ms |

### 3.2 Test File Location
- `scripts/lib/candidate-extraction.test.ts` (신규)

### 3.3 Mock/Setup Required
- sharp로 합성 RGBA 테스트 이미지 생성

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/candidate-extraction.ts` | Create | BFS CCA + candidate stats |

### 4.2 Implementation Steps (Green Phase)
1. `extractCandidates(rgbaPath: string, outputDir: string): Promise<LayerCandidate[]>`
2. sharp로 RGBA raw buffer 로드
3. Alpha channel binarize (> 128)
4. BFS flood-fill 4-connectivity → label map
5. Label별 component stats 계산 (bbox, centroid, coverage, edgeDensity)
6. Coverage < 0.5% 제거
7. 각 component를 개별 PNG로 저장 → filePath 참조

### 4.3 Refactor Phase
- BFS를 typed array로 최적화

## 5. Edge Cases
- EC-1: 반투명 alpha (128 경계) → threshold 기준으로 이진화
- EC-2: 1px 선으로 연결된 두 영역 → 4-connectivity에서 연결 (대각선 아님)
- EC-3: 매우 큰 이미지 (4096x4096) → 메모리 주의, Uint8Array 사용

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
