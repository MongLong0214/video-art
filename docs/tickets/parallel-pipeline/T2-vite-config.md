# T2: Vite publicDir 환경변수 지원

**PRD Ref**: PRD-parallel-pipeline > US-1, US-2
**Priority**: P0 (Blocker)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
`vite.config.ts`에서 `VITE_PUBLIC_DIR` 환경변수를 읽어 `publicDir`을 동적으로 설정한다. 미지정 시 기존 `"public"` 유지.

## 2. Acceptance Criteria
- [ ] AC-1: `VITE_PUBLIC_DIR=/tmp/test npx vite` 실행 시 해당 디렉토리의 파일을 서빙한다
- [ ] AC-2: `VITE_PUBLIC_DIR` 미설정 시 기존대로 `public/` 디렉토리를 서빙한다
- [ ] AC-3: `npm run dev` (개발 모드)가 기존과 동일하게 동작한다

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `vite config uses VITE_PUBLIC_DIR when set` | Unit | config export 함수 호출 | publicDir = env 값 |
| 2 | `vite config defaults to public when env unset` | Unit | env 미설정 | publicDir = "public" |

### 3.2 Test File Location
- `vite.config.test.ts` (프로젝트 루트)

### 3.3 Mock/Setup Required
- `process.env.VITE_PUBLIC_DIR` 설정/해제

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `vite.config.ts` | Modify | `publicDir: process.env.VITE_PUBLIC_DIR \|\| "public"` 추가 |
| `vite.config.test.ts` | Create | 유닛 테스트 2개 |

### 4.2 Implementation Steps (Green Phase)
1. `vite.config.ts`에 `publicDir` 필드 추가: `process.env.VITE_PUBLIC_DIR || "public"`

### 4.3 Refactor Phase
- 없음 (1줄 변경)

## 5. Edge Cases
- EC-1 (E5): dev 모드에서 VITE_PUBLIC_DIR 미설정 → 기존대로 public/ 사용

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] AC 전부 충족
- [ ] `npm run dev` 기존 동작 유지 확인
