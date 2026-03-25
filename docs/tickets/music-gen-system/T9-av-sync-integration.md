# T9: AV 동기화 + 통합 CLI

**PRD Ref**: PRD-music-gen-system > US-6
**Priority**: P2 (Medium)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T8

---

## 1. Objective
ffmpeg로 비디오+오디오 합성. `npm run render:av` 원커맨드. 최종 .mp4 출력.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run render:av` — 비디오 렌더 + 오디오 렌더 + ffmpeg 합성 → .mp4
- [ ] AC-2: ffmpeg: `ffmpeg -i video.mp4 -i audio.wav -c:v copy -c:a aac -b:a 320k output.mp4`
- [ ] AC-3: 출력 .mp4의 비디오/오디오 duration 일치 (ffprobe, 오차 < 100ms)
- [ ] AC-4: merge-av.sh 스크립트 — 입력 경로 + 출력 경로 인자

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `merge-av args` | Unit (shell) | 인자 없으면 에러 | exit 1 |
| 2 | `merge-av valid` | Integration | video + audio → mp4 | 파일 존재 |
| 3 | `duration match` | Integration | ffprobe video vs audio | < 100ms 차이 |
| 4 | `render:av E2E` | Integration | 전체 파이프라인 | .mp4 재생 가능 |

### 3.2 Test File Location
- `scripts/lib/render-av.test.ts` (신규, vitest)
- `audio/render/test-merge-av.sh` (신규, shell)

### 3.3 Mock/Setup Required
- T8 렌더 파이프라인 완료
- 비디오 파일 존재 (기존 export:layered 출력)
- ffmpeg 설치

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/render-av.ts` | Create | AV 통합 오케스트레이터 |
| `audio/render/merge-av.sh` | Create | ffmpeg AV 합성 스크립트 |
| `scripts/lib/render-av.test.ts` | Create | vitest 테스트 |
| `package.json` | Modify | render:av script |

### 4.2 Implementation Steps (Green Phase)
1. merge-av.sh — 인자 검증 + ffmpeg 합성 + 출력 검증
2. render-av.ts — 비디오 렌더 (기존 export:layered 호출) → render:audio → merge-av.sh
3. 출력 검증: ffprobe로 video/audio stream duration 비교
4. package.json scripts 추가

### 4.3 Refactor Phase
- render-av.ts에서 비디오/오디오 병렬 렌더 (Promise.all)

## 5. Edge Cases
- EC-1: 비디오 파일 없음 → 에러 + 비디오 렌더 먼저 실행 안내
- EC-2: 오디오 파일 없음 → 에러 + render:audio 먼저 실행 안내
- EC-3: ffmpeg 코덱 미지원 → 에러 메시지

## 6. Review Checklist
- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
