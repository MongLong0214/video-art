# T6: Provenance Manifest

**PRD Ref**: PRD-layer-decomposition-overhaul > US-6, §5.13, AC-6.1~6.4
**Priority**: P1 (High)
**Size**: S
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

decomposition run의 전체 이력을 기록하는 manifest 생성 모듈. archive에 source image, model versions, candidate stats, drop reasons 저장.

## 2. Acceptance Criteria

- [ ] AC-1: `decomposition-manifest.json`이 archive에 저장됨 (AC-6.1)
- [ ] AC-2: manifest에 source, prepared, model id/version, variant, candidate stats, drop reasons, unsafeFlag, productionMode, layer counts 포함 (AC-6.2)
- [ ] AC-3: source + prepared image가 archive `source/` 디렉토리에 저장 (AC-6.3)
- [ ] AC-4: manifest의 model version이 `latest`가 아닌 exact string (AC-4.6)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should generate valid manifest JSON` | Unit | mock input data | JSON.parse 성공 + 필수 필드 존재 |
| 2 | `should include all required fields` | Unit | manifest output | source, prepared, models, passes, finalLayers, droppedCandidates, unsafeFlag, productionMode 존재 |
| 3 | `should reject latest as version` | Unit | version="latest" | throw or validation error |
| 4 | `should record drop reasons` | Unit | dropped candidate mock | droppedCandidates[].reason populated |
| 5 | `should record pipeline variant` | Unit | variant="qwen-only" | pipelineVariant field |
| 6 | `should copy source and prepared images to archive` | Unit | temp dir + mock images | source/original.* + source/prepared.png 존재 |

### 3.2 Test File Location
- `scripts/lib/decomposition-manifest.test.ts` (신규)

### 3.3 Mock/Setup Required
- mock LayerCandidate[] + model info

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/decomposition-manifest.ts` | Create | ManifestData interface + generateManifest() + writeManifest() |

### 4.2 Implementation Steps (Green Phase)
1. `ManifestData` interface 정의
2. `generateManifest(input)`: retained + dropped candidates → manifest JSON
3. `writeManifest(manifest, archiveDir)`: JSON 파일 저장
4. `copySourceImages(original, prepared, archiveDir)`: source/ 디렉토리 복사

### 4.3 Refactor Phase
- Zod schema로 manifest 자체도 validate

## 5. Edge Cases
- EC-1: model version이 undefined → hard fail (production) or "unknown" (dev)
- EC-2: source image가 이미 archive에 있음 → overwrite

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
