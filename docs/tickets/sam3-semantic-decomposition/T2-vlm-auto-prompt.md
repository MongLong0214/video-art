# T2: VLM Auto-Prompt Generation

**PRD Ref**: PRD-sam3-semantic-decomposition > US-1 (AC-1.1~1.8)
**Priority**: P0 (Blocker)
**Size**: M (3-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

Qwen3-VL을 호출하여 이미지에서 시맨틱 프롬프트 리스트를 자동 생성하는 `getVlmPrompts()` 함수 구현. CLI `--prompts` 우회 + sanitization + fallback.

## 2. Acceptance Criteria

- [ ] AC-1: `getVlmPrompts(replicate, imagePath, options)` → `string[]` 반환
- [ ] AC-2: Qwen3-VL 호출 (`lucataco/qwen3-vl-8b-instruct:VERSION`) with `{ media, prompt, max_new_tokens: 256, temperature: 0.1 }`
- [ ] AC-3: VLM 응답에서 JSON array 추출 (`text.match(/\[.*\]/s)` → `JSON.parse`)
- [ ] AC-4: 프롬프트 4~vlmMaxPrompts개 생성. 부족하면 기본 프롬프트로 보충
- [ ] AC-5: 기본 프롬프트 세트: `["main subject", "background", "foreground details"]`
- [ ] AC-6: VLM 실패/파싱 실패 → console.warn + 기본 프롬프트 반환
- [ ] AC-7: `--prompts "a,b,c"` CLI → VLM 스킵, 직접 사용
- [ ] AC-8: sanitization — 제어 문자 제거, 100자 truncate, printable만. VLM + CLI 모두 적용
- [ ] AC-9: VLM_MODEL + VLM_VERSION 상수로 관리
- [ ] AC-10: VLM system prompt가 3-10 단어의 시각적 설명 출력을 지시 (PRD AC-1.3)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `parseVlmResponse: valid JSON array` | Unit | `'["a","b","c"]'` | ["a","b","c"] |
| 2 | `parseVlmResponse: JSON in prose` | Unit | `'Here: ["a","b"]'` | ["a","b"] |
| 3 | `parseVlmResponse: no JSON → null` | Unit | `'no array here'` | null |
| 4 | `parseVlmResponse: malformed JSON → null` | Unit | `'["a", b]'` | null |
| 5 | `sanitizePrompts: strips control chars` | Unit | `["hello\x00world"]` | ["helloworld"] |
| 6 | `sanitizePrompts: truncates > 100 chars` | Unit | 120-char string | 100-char string |
| 7 | `sanitizePrompts: filters empty strings` | Unit | `["", "a", ""]` | ["a"] |
| 8 | `sanitizePrompts: caps at vlmMaxPrompts` | Unit | 10 prompts, max=6 | 6 prompts |
| 9 | `ensureMinPrompts: pads with defaults if < 3` | Unit | `["a"]` | ["a", "main subject", "background"] |
| 10 | `parseCliPrompts: splits and trims` | Unit | `"a, b , c"` | ["a","b","c"] |
| 11 | `parseCliPrompts: filters empty` | Unit | `"a,,b"` | ["a","b"] |

### 3.2 Test File Location

- `scripts/lib/image-decompose.test.ts` (append — VLM prompt parsing tests)

### 3.3 Mock/Setup Required

- Vitest: pure function tests for parseVlmResponse, sanitizePrompts, ensureMinPrompts, parseCliPrompts
- Replicate API는 T2에서 모킹하지 않음 (순수 로직 테스트만)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | VLM_MODEL/VERSION 상수 + getVlmPrompts() + sanitizePrompts() + parseVlmResponse() |
| `scripts/lib/pipeline-cli.ts` | Modify | `--prompts` CLI 옵션 파싱 |
| `scripts/lib/image-decompose.test.ts` | Modify | prompt parsing unit tests |

### 4.2 Implementation Steps (Green Phase)

1. image-decompose.ts에 VLM_MODEL, VLM_VERSION 상수 추가
2. `parseVlmResponse(text: string): string[] | null` — regex + JSON.parse
3. `sanitizePrompts(prompts: string[], maxCount: number): string[]` — control char strip, 100char truncate, empty filter, cap
4. `ensureMinPrompts(prompts: string[], defaults: string[]): string[]` — 최소 3개 보장
5. `getVlmPrompts(replicate, imagePath, options): Promise<string[]>` — Qwen3-VL 호출 + parse + sanitize + ensure
6. pipeline-cli.ts에 `--prompts` 옵션 추가 (콤마 분리 → string[])
7. Export: parseVlmResponse, sanitizePrompts, ensureMinPrompts (테스트용)

## 5. Edge Cases

- EC-1 (E1): VLM 자유 텍스트 → regex 추출 시도 → 실패 시 defaults
- EC-4 (E4): VLM 1개만 반환 → ensureMinPrompts로 보충
- EC-8 (E8): CLI --prompts → VLM 완전 스킵

## 6. Review Checklist

- [ ] Red → Green → Refactor
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] sanitization이 VLM + CLI 모두 적용
