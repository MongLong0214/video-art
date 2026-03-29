# T3: Path Traversal Validation

**PRD Ref**: PRD-pipeline-hardening > US-4
**Priority**: P1 (High)
**Size**: M
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
기존 `validate-file-path.ts`를 확장하여 이미지 입력 경로와 manual layers를 프로젝트 루트 내로 제한한다.

## 2. Acceptance Criteria
- [ ] AC-1: `validateFilePath`가 이미지 확장자 지원
- [ ] AC-2: `pipeline-layers.ts`에서 inputPath 검증
- [ ] AC-3: layers/ dir realpath 검증 (symlinked dir 차단) — `detectManualLayers` 전
- [ ] AC-4: manual layers 각 파일 검증 — sharp/copy 이전
- [ ] AC-5: 범위 외 → 에러 + exit(1)
- [ ] AC-6: traversal/symlink/prefix 공격 차단 테스트
- [ ] AC-7: TOCTOU accepted risk를 `validate-file-path.ts`에 코드 코멘트로 문서화

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `accepts valid image within project` | Unit | PNG in projectRoot | true |
| 2 | `rejects ../ traversal` | Unit | ../../etc/passwd | false |
| 3 | `rejects external symlink` | Unit | symlink → /tmp/evil | false |
| 4 | `rejects prefix attack` | Unit | projectRoot + "-evil/" | false |
| 5 | `rejects non-image extension` | Unit | .txt | false |
| 6 | `accepts .jpg, .jpeg, .webp` | Unit | 각 확장자 | true |
| 7 | `rejects symlinked layers dir` | Integration | layers/ → /tmp/ | error |
| 8 | `validates before sharp()` | Integration | external symlink in layers/ | error before I/O |

### 3.2 Test File Location
- `scripts/lib/validate-file-path.test.ts` (기존 확장 또는 신규)

### 3.3 Mock/Setup Required
- **실제 파일시스템**: `fs.mkdtempSync` + `fs.symlinkSync`로 real symlink 생성 (vi.spyOn(fs, 'realpathSync') mock 금지 — 실제 ENOENT/ELOOP 동작 필요)
- `beforeAll`/`afterAll`에서 tmpDir 생성/정리
- `vi.spyOn(process, 'exit')` — exit(1) 검증
- **참고**: `input-validator.ts`의 `SUPPORTED_FORMATS` 검증은 format validation이며, T3의 path traversal 검증과 목적이 다름 (보완적 관계, 충돌 없음)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/validate-file-path.ts` | Modify | IMAGE_EXTENSIONS + TOCTOU 코멘트 |
| `scripts/lib/validate-file-path.test.ts` | Create/Modify | 8개 테스트 |
| `scripts/pipeline-layers.ts` | Modify | inputPath + layers dir + manual layers 검증 |

### 4.2 Implementation Steps (Green Phase)
1. 테스트 작성 → FAIL
2. `validate-file-path.ts` — IMAGE_EXTENSIONS export + TOCTOU 코멘트 추가
3. `pipeline-layers.ts` — main() 초입에 inputPath 검증
4. `pipeline-layers.ts` — manual layers 분기에서 dir realpath + 각 파일 검증 (sharp 전)
5. 전체 테스트 → PASS

### 4.3 Refactor Phase
없음

## 5. Edge Cases
- EC-1: layers/ 없음 → `detectManualLayers` null → 검증 스킵
- EC-2: TOCTOU — accepted risk, 코드 코멘트로 문서화 (AC-7)

## 6. Review Checklist
- [ ] Red: FAILED
- [ ] Green: PASSED
- [ ] TOCTOU 코멘트 확인
- [ ] 에러 메시지에 경로 포함
