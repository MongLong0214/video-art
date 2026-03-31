# T8: E2E Pipeline Smoke Test

**PRD Ref**: PRD-layer-pipeline-overhaul > G10
**Priority**: P2 (Medium)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T1, T2 (최소 Wave 1 완료 후)
**Wave**: 1 (Wave 1 마지막)

---

## 1. Objective

`npm run pipeline <input> --title <name>` 단일 명령으로 decomposition → preview skip → export까지 완료되는 E2E smoke test를 작성한다.

## 2. Acceptance Criteria

- [ ] AC-1: synthetic 이미지(100x100 solid color)로 pipeline 전체 경로 실행 → exit code 0
- [ ] AC-2: 출력 scene.json + layer PNGs + mp4 파일 존재 확인
- [ ] AC-3: scene.json이 sceneSchema.parse() 통과
- [ ] AC-4: ffmpeg 미설치 시 명확한 에러 메시지 (E8 커버)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `pipeline produces valid output files` | Integration | mock Replicate API + synthetic input → pipeline run | scene.json + layers/ + .mp4 존재 |
| 2 | `pipeline scene.json validates against schema` | Integration | 출력 scene.json → sceneSchema.parse() | parse 성공 |
| 3 | `pipeline fails gracefully without ffmpeg` | Unit | PATH에서 ffmpeg 제거 → export 시도 | Error with "ffmpeg" in message |

### 3.2 Test File Location
- `scripts/pipeline-layers.test.ts` (기존 파일 또는 신규)

### 3.3 Mock/Setup Required
- Vitest: Replicate API mock (SAM3, DA V2, VLM 응답)
- 임시 디렉토리에 synthetic input 생성

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/pipeline-layers.test.ts` | Create/Modify | E2E smoke test |
| `scripts/pipeline.ts` | Modify (if needed) | --no-preview 기본 동작 확인 |

### 4.2 Implementation Steps (Green Phase)
1. Replicate API mock 설정 (SAM3 → 고정 마스크, DA V2 → 고정 depth, VLM → 고정 prompts)
2. 100x100 synthetic PNG 생성
3. pipeline-layers.ts main() 호출 → 출력 파일 검증
4. ffmpeg 미존재 시 에러 경로 테스트

## 5. Edge Cases
- EC-1: API mock이 실패 패턴 반환 → graceful error

## 6. Review Checklist
- [ ] Red/Green/Refactor cycle 완료
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
