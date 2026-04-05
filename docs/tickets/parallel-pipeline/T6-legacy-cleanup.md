# T6: 레거시 정리 + 통합 테스트

**PRD Ref**: PRD-parallel-pipeline > US-3
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T5

---

## 1. Objective
export/pipeline 코드에서 `public/` 하드코딩 잔존을 정리하고, 병렬 실행 통합 테스트를 작성한다.

## 2. Acceptance Criteria
- [ ] AC-1: `export-layered.ts`에 `"public/scene.json"` 직접 참조가 기본값 분기에서만 존재
- [ ] AC-2: `pipeline-pro.ts`에 `"public/"` 직접 참조가 기본값 분기에서만 존재
- [ ] AC-3: 미사용 import/변수/함수 제거
- [ ] AC-4: `scripts/upscale-layers.ts`, `scripts/ai-denoise-test.ts`, `scripts/webgl-max-test.ts` 임시 스크립트 삭제 (zero references 확인 후)
- [ ] AC-5: 통합 테스트로 병렬 2개 실행 시 서로 다른 scene.json을 사용함을 검증

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `no hardcoded public/ in pipeline mode` | Unit | grep 기반 검증 | --work-dir 모드에서 public/ 참조 0 |
| 2 | `no unused imports in modified files` | Unit | eslint --no-error-on-unmatched-pattern | 0 warnings |
| 3 | `parallel execution uses different scene.json` | Integration | 2개 work-dir 동시 생성 | scene.json 내용 다름 |
| 4 | `parallel execution uses different ports` | Integration | 2개 findAvailablePort 호출 | 포트 다름 |
| 5 | `temp scripts removed` | Unit | fs.existsSync 확인 | upscale-layers.ts, ai-denoise-test.ts 없음 |

### 3.2 Test File Location
- `scripts/__tests__/parallel-pipeline.integration.test.ts`
- `scripts/__tests__/legacy-cleanup.test.ts`

### 3.3 Mock/Setup Required
- 통합 테스트: 실제 tmpdir 2개 생성, scene.json 다른 내용 작성
- findAvailablePort: 실제 호출 (mock 없음)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/export-layered.ts` | Modify | public/ 하드코딩 정리 (기본값 분기만 유지) |
| `scripts/pipeline-pro.ts` | Modify | public/ 하드코딩 정리 |
| `scripts/upscale-layers.ts` | Delete | 임시 스크립트 |
| `scripts/ai-denoise-test.ts` | Delete | 임시 스크립트 |
| `scripts/webgl-max-test.ts` | Delete | 임시 스크립트 |

### 4.2 Implementation Steps (Green Phase)
1. 임시 스크립트 3개 삭제
2. `export-layered.ts` — 잔존 `"public/"` 참조를 `workDir` 변수로 교체
3. `pipeline-pro.ts` — 동일 정리
4. eslint 실행하여 미사용 import 정리
5. 통합 테스트 작성

### 4.3 Refactor Phase
- 공통 경로 해석 로직이 있다면 `work-dir.ts`로 통합

## 5. Edge Cases
- EC-1: 삭제 대상 스크립트가 다른 곳에서 import되는지 확인 (없어야 함)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 임시 스크립트 완전 삭제 확인
