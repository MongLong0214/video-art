# T1: Frame Extractor + Prepare

**PRD Ref**: PRD-autoresearch-layer > US-1
**Priority**: P0 (Blocker)
**Size**: M
**Status**: Todo
**Depends On**: None

---

## 1. Objective

ffmpeg를 이용해 영상에서 1fps 비례 위치 keyframe + 3 temporal pairs를 추출하는 유틸리티와, 레퍼런스 영상 준비 스크립트를 구현한다.

## 2. Acceptance Criteria

- [ ] AC-1: `extractFrames(videoPath, outputDir)` 가 1fps 비례 위치로 keyframe을 추출한다 (10초→10장, 20초→20장)
- [ ] AC-2: 3개 temporal pair (25%/50%/75% 위치에서 연속 2프레임)를 추출한다
- [ ] AC-3: `prepare.ts`가 source.mp4를 받아 `.cache/research/reference/`에 keyframe + pairs + metadata.json을 저장한다
- [ ] AC-4: metadata.json에 duration, dimensions, fps, frame_count가 포함된다
- [ ] AC-5: ffmpeg 미설치 시 명확한 에러 메시지 출력
- [ ] AC-6: 이미 추출된 경우 스킵 (idempotent)
- [ ] AC-7: `normalizeFramePair(refFrame, genFrame)` — 비율 차이 시 center crop to shared aspect ratio
- [ ] AC-8: 해상도 차이 시 작은 쪽 기준 Lanczos resize (max 2048px cap)
- [ ] AC-9: normalization은 원본 파일을 수정하지 않고 메모리 내 처리 (sharp pipeline)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `calcProportionalTimestamps` | Unit | 10초, 1fps → [0,1,2,...,9] | 10개 타임스탬프 |
| 2 | `calcProportionalTimestamps` | Unit | 20초, 1fps → [0,1,2,...,19] | 20개 타임스탬프 |
| 3 | `calcTemporalPairTimestamps` | Unit | 10초 → 25%(2.5±0.033), 50%(5.0±0.033), 75%(7.5±0.033) | 6개 타임스탬프 |
| 4 | `buildFfmpegArgs` | Unit | 타임스탬프 배열 → ffmpeg 인자 문자열 | 올바른 -ss/-frames:v 인자 |
| 5 | `parseVideoMetadata` | Unit | ffprobe JSON → { duration, width, height, fps } | 올바른 파싱 |
| 6 | `extractFrames` | Integration | 실제 source.mp4 → 파일 생성 확인 | 10+ png 파일 존재 |
| 7 | `normalizeFramePair sameSize` | Unit | 1080×1080 vs 1080×1080 → no change | 동일 Buffer |
| 8 | `normalizeFramePair diffRatio` | Unit | 1080×1080 vs 1920×1080 → center crop 1080×1080 + resize | cropped+resized |
| 9 | `normalizeFramePair diffRes` | Unit | 1080×1080 vs 540×540 → resize to 540×540 | smaller side |
| 10 | `normalizeFramePair 2048cap` | Unit | 4096×4096 vs 4096×4096 → resize to 2048×2048 | capped |
| 11 | `ffmpegNotInstalled` | Unit | mock execSync throws → error message | "brew install ffmpeg" |
| 12 | `idempotentSkip` | Unit | output dir exists + frames present → skip | no ffmpeg call |

### 3.2 Test File Location
- `scripts/research/frame-extractor.test.ts`

### 3.3 Mock/Setup Required
- Unit: ffmpeg 호출 없음 (순수 계산 함수)
- Integration: 실제 ffmpeg + source.mp4 필요 (CI에서는 skip 가능)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/frame-extractor.ts` | Create | 비례 프레임 추출 유틸 |
| `scripts/research/prepare.ts` | Create | 레퍼런스 준비 CLI |
| `scripts/research/frame-extractor.test.ts` | Create | 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `calcProportionalTimestamps(duration, fps=1)` 구현
2. `calcTemporalPairTimestamps(duration)` 구현 (25/50/75% ± 1/fps)
3. `parseVideoMetadata(videoPath)` — ffprobe JSON 파싱
4. `extractFrames(videoPath, outputDir, timestamps)` — ffmpeg spawn
5. `prepare.ts` CLI: source path → extractFrames → metadata.json 저장

## 5. Edge Cases
- EC-1: source.mp4 없음 → ENOENT 에러 + 경로 안내
- EC-2: ffmpeg 미설치 → "brew install ffmpeg" 안내
- EC-3: 0초 영상 → 빈 배열 반환
- EC-4: 이미 추출됨 → 스킵 + 로그
