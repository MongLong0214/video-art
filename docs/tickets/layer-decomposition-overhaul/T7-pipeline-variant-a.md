# T7: Pipeline Integration Variant A

**PRD Ref**: PRD-layer-decomposition-overhaul > US-3, US-4, §4.1, §5.1, §5.5
**Priority**: P0 (Blocker)
**Size**: L
**Status**: Todo
**Depends On**: T2, T3, T4, T5, T6

---

## 1. Objective

pipeline-layers.ts를 재작성하여 Variant A (Qwen-Only) 전체 흐름을 통합. CLI 인터페이스 변경, Replicate 호출 개선 (retry, version pin, safety flag, URL validation), postprocess alphaDilate 제거.

## 2. Acceptance Criteria

- [ ] AC-1: `--variant qwen-only` (default) 경로가 동작 (AC-4.1)
- [ ] AC-2: complexity scoring → Qwen(3/4/6) → extraction → dedupe → ownership → role → manifest 전체 흐름
- [ ] AC-3: `--layers N` override 동작
- [ ] AC-4: `--unsafe` flag로 safety checker 제어 (기본 ON)
- [ ] AC-5: Replicate retry (max 3, backoff 1s/3s/9s) 동작
- [ ] AC-6: Replicate URL 도메인 검증 (*.replicate.delivery, *.replicate.com)
- [ ] AC-7: production mode에서 unpinned version → hard fail (AC-4.5)
- [ ] AC-8: postprocess.ts alphaDilate 호출 제거
- [ ] AC-9: createRunContext() 기반 archive 통합
- [ ] AC-10: 기존 `--depth-only`, `--qwen-only` → deprecated warning 출력
- [ ] AC-11: `Retry-After` header 존재 시 exponential backoff 대신 header 값 사용
- [ ] AC-12: `--production` flag → production mode 활성화 (version pin 강제)
- [ ] AC-13: API token이 stdout/stderr 로그에 노출되지 않음
- [ ] AC-14: 모든 candidate drop 시 → 원본을 단일 background plate로 fallback (PRD E4)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should parse --variant qwen-only` | Unit | CLI arg parsing | variant="qwen-only" |
| 2 | `should parse --layers 6` | Unit | CLI arg parsing | layerOverride=6 |
| 3 | `should parse --unsafe` | Unit | CLI arg parsing | unsafe=true |
| 4 | `should default to safety checker ON` | Unit | no --unsafe | disableSafetyChecker=false |
| 5 | `should validate Replicate URL domain` | Unit | valid + invalid URLs | accept/reject |
| 6 | `should retry on fetch failure` | Unit | first 2 fail, 3rd success | success after 3 calls |
| 7 | `should fail after 3 retries` | Unit | all 3 fail | throw with diagnostic |
| 8 | `should hard fail on unpinned version in production` | Unit | NODE_ENV=production + no version | throw |
| 9 | `should not include alphaDilate in postprocess` | Unit | postprocess module 검사 | alphaDilate 함수 미존재 |
| 10 | `should emit deprecation warning for --depth-only` | Unit | --depth-only flag | stderr에 "deprecated" 포함 |
| 11 | `should respect Retry-After header` | Unit | 429 + Retry-After: 5 | 5초 후 재시도 |
| 12 | `should activate production mode with --production` | Unit | --production flag | unpinned version → throw |
| 13 | `should not log API token` | Unit | pipeline 실행 | stdout/stderr에 token 미포함 |
| 14 | `should fallback to original when all candidates drop` | Integration | all candidates empty | 1 bg-plate layer |

### 3.2 Test File Location
- `scripts/lib/pipeline-integration.test.ts` (신규, Replicate mock으로 unit test)

### 3.3 Mock/Setup Required
- Replicate API mock (vi.mock)
- sharp mock for image processing
- fs mock for archive

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/pipeline-layers.ts` | Major Modify | CLI 재작성, 새 파이프라인 흐름 |
| `scripts/lib/image-decompose.ts` | Major Modify | retry, URL validation, version pin, safety flag |
| `scripts/lib/postprocess.ts` | Modify | alphaDilate 제거 |

### 4.2 Implementation Steps (Green Phase)
1. CLI arg parsing 재작성 (--variant, --layers, --unsafe, --duration, --production)
2. image-decompose.ts: retry wrapper, URL validation, version pin 파라미터
3. postprocess.ts: alphaDilate 함수 및 호출 제거
4. pipeline-layers.ts: complexity → qwen → extraction → dedupe → ownership → role → bg plate → manifest → scene.json
5. createRunContext() 기반 archive 통합

### 4.3 Refactor Phase
- Replicate retry를 generic withRetry() 유틸로 분리

## 5. Edge Cases
- EC-1: Replicate 429 rate limit → Retry-After 헤더 우선
- EC-2: corrupt RGBA output → skip candidate (E9)
- EC-3: disk space 부족 → early fail (E11)
- EC-4: 모든 candidate drop → fallback: 원본을 단일 background plate

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
