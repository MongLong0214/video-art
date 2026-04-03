# T7: reference abstraction schema + composition IR compiler

**Size**: L | **Depends**: T1, T5, T6 | **PRD**: US-1, US-3

## Goal
레퍼런스 분석 결과를 303-only renderer가 직접 소비할 수 있는 `reference abstraction JSON`과 `composition IR`로 정식화한다.

## Changes

### 1. 신규 TS 모듈
- `scripts/lib/reference-abstraction.ts`
- `scripts/lib/303-compiler.ts`

### 2. schema 고정
- abstraction JSON
- composition IR
- versioning

### 3. deterministic compiler
- role assignment
- note thinning
- density shaping
- fallback strategy

## Acceptance Criteria
- [ ] AC-7.1: abstraction JSON schema가 고정된다.
- [ ] AC-7.2: composition IR schema가 고정된다.
- [ ] AC-7.3: 동일 입력과 동일 seed에서 IR가 deterministic하다.
- [ ] AC-7.4: IR가 `bass`, `riff`, `top/pseudo_hat`, `fx` 최소 4개 역할을 표현한다.
- [ ] AC-7.5: fallback path가 explicit field로 기록된다.

## Test
```bash
npx vitest run scripts/lib/303-compiler.test.ts
```

