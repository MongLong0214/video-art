# T3: pipeline-pro.ts — --work-dir 출력 경로 분리

**PRD Ref**: PRD-parallel-pipeline > US-1, US-3
**Priority**: P0 (Blocker)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
`pipeline-pro.ts`가 `--work-dir` 지정 시 해당 디렉토리에 layers + scene.json을 출력하고, 미지정 시 기존대로 `public/`에 출력한다.

## 2. Acceptance Criteria
- [ ] AC-1: `--work-dir /tmp/test` 지정 시 `/tmp/test/layers/`, `/tmp/test/scene.json`에 출력
- [ ] AC-2: `--work-dir` 미지정 시 기존대로 `public/layers/`, `public/scene.json`에 출력
- [ ] AC-3: `public/` 직접 참조가 `--work-dir` 분기 안에서만 사용됨 (기본값으로만)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `resolveOutputDir returns work-dir when provided` | Unit | --work-dir 전달 | work-dir 경로 반환 |
| 2 | `resolveOutputDir defaults to public when no work-dir` | Unit | --work-dir 없음 | public/ 경로 반환 |
| 3 | `scene.json written to work-dir` | Integration | --work-dir로 실행 | work-dir/scene.json 존재 |
| 4 | `layers written to work-dir/layers/` | Integration | --work-dir로 실행 | work-dir/layers/*.png 존재 |

### 3.2 Test File Location
- `scripts/lib/__tests__/pipeline-pro-workdir.test.ts`

### 3.3 Mock/Setup Required
- `parseCliArgs` 반환값 mock (workDir 포함)
- fs 실제 tmpdir 사용

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/pipeline-cli.ts` | Modify | `--work-dir` 파싱 추가 |
| `scripts/pipeline-pro.ts` | Modify | `public/` 하드코딩 → `args.workDir \|\| "public"` |

### 4.2 Implementation Steps (Green Phase)
1. `pipeline-cli.ts`에 `workDir` 필드 + `--work-dir` 파싱 추가
2. `pipeline-pro.ts` L161-168: `layersDir`, `scenePath`를 `workDir` 기반으로 변경
3. `public/` 직접 참조를 `resolveOutputDir(args)` 헬퍼로 교체

### 4.3 Refactor Phase
- `resolveOutputDir()` 함수를 `work-dir.ts`로 이동

## 5. Edge Cases
- EC-1 (E4): --work-dir 없이 실행 → public/ 사용 (하위 호환)
- EC-2 (E6): 동일 title 동시 실행 → 각각 다른 work-dir 사용

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 `npm run pipeline:pro input.png` 동작 유지
