# PRD: fal.ai SAM3 통합 테스트

**Version**: 0.1
**Author**: AI
**Date**: 2026-04-01
**Status**: Draft
**Size**: S

---

## 1. Problem Statement

### 1.1 Background
`getFalSam3Mask()` 함수(image-decompose.ts:167-209)는 fal.ai SAM3 API를 호출하여 마스크를 생성하고, provider dispatch fallback(fal ↔ replicate)이 파이프라인에 연결되어 있다. 그러나 테스트 커버리지가 0%다.

### 1.2 Problem Definition
프로덕션 코드 경로(fal.ai API 호출, 응답 파싱, 도메인 검증, fallback)가 자동화 테스트 없이 운영되고 있다.

### 1.3 Impact of Not Solving
fal.ai 응답 형태 변경, URL 검증 우회, fallback 실패 시 regression을 감지할 수 없다.

## 2. Goals & Non-Goals

### 2.1 Goals
- [x] G1: `getFalSam3Mask` 함수의 7개 코드 경로를 mock 테스트로 커버
- [x] G2: provider dispatch fallback (fal→replicate, replicate→fal) 검증

### 2.2 Non-Goals
- NG1: 실제 fal.ai API 호출 테스트 (별도 E2E PRD에서 처리)
- NG2: `getSam3Mask` (Replicate) 통합 테스트 (기존 커버리지 별도)

## 3. User Stories & Acceptance Criteria

### US-1: fal.ai 응답 파싱 테스트
**As a** 개발자, **I want** fal.ai 응답 형태별 파싱이 검증되도록, **so that** 응답 스키마 변경 시 즉시 감지한다.

**Acceptance Criteria:**
- [ ] AC-1.1: `mask_url` 응답 → valid Buffer 반환
- [ ] AC-1.2: `output.url` envelope 응답 → valid Buffer 반환
- [ ] AC-1.3: 두 필드 모두 없음 → null 반환
- [ ] AC-1.4: 비신뢰 도메인 mask URL → null 반환 (validateProviderUrl 차단)

### US-2: 에러 핸들링 + Fallback 테스트
**As a** 개발자, **I want** HTTP 에러와 provider fallback이 검증되도록, **so that** 장애 시 자동 전환을 보장한다.

**Acceptance Criteria:**
- [ ] AC-2.1: HTTP 401/500 → catch → null 반환
- [ ] AC-2.2: withRetry 래핑 동작 (재시도 후 성공)
- [ ] AC-2.3: provider=fal 시 fal 실패 → replicate fallback 호출
- [ ] AC-2.4: provider=replicate 시 replicate 실패 → fal fallback 호출

## 4. Technical Design

N/A (테스트 전용 — 프로덕션 코드 변경 없음)

### 4.3 API Design
N/A

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | FAL_KEY 미설정 | getProviderToken throw → catch → null | P1 |
| E2 | mask download 실패 (HTTP 404) | maskResp.ok=false → null | P2 |
| E3 | sharp metadata 검증 실패 (corrupt image) | throw → catch → null | P2 |
| E4 | fetch 자체 network error | throw → withRetry → 최대 3회 후 null | P1 |

---