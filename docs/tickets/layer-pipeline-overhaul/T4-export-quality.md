# T4: Export 품질 최적화

**PRD Ref**: PRD-layer-pipeline-overhaul > US-7
**Priority**: P2 (Medium)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None
**Wave**: 1

---

## 1. Objective

ffmpeg 인코딩 기본 설정을 최고 품질로 변경하고, ProRes 4444 출력 옵션을 추가한다.

## 2. Acceptance Criteria

- [ ] AC-1: 기본 ffmpeg 설정: CRF 15 (기존 18), preset veryslow (기존 slow), pix_fmt yuv444p
- [ ] AC-2: `--prores` CLI 플래그 → ProRes 4444 (.mov) 출력
- [ ] AC-3: 60fps 지원: `--fps 60` 또는 RESEARCH_FPS=60 환경변수
- [ ] AC-4: 인코딩 완료 후 파일 크기 + 비트레이트 로깅

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `default ffmpeg args use CRF 15 and veryslow` | Unit | encodeVideo 함수의 ffmpeg args 검사 | crf=15, preset=veryslow |
| 2 | `--prores flag generates ProRes args` | Unit | prores=true → codec prores_ks, profile 4444 | prores 관련 args 포함 |
| 3 | `--fps overrides frame rate` | Unit | fps=60 → framerate=60 args | framerate arg = 60 |
| 4 | `output stats logged after encoding` | Unit | encodeVideo 완료 후 console.log 호출 검사 | size + bitrate 포함 |

### 3.2 Test File Location
- `scripts/export-layered.test.ts` (신규 생성)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('child_process')` for ffmpeg spawn mock
- `vi.spyOn(console, 'log')` for 로깅 검증

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/export-layered.ts` | Modify | 기본 CRF/preset 변경, --prores 옵션, 로깅 |
| `scripts/lib/pipeline-cli.ts` | Modify | --prores, --fps 플래그 파싱 |
| `scripts/export-layered.test.ts` | Create | ffmpeg args 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `RESEARCH_CRF` 기본값 18 → 15, `RESEARCH_PRESET` 기본값 "slow" → "veryslow"
2. --prores 플래그 파싱 → `-c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le` 분기
3. --fps 플래그 → scene.json fps 오버라이드 + RESEARCH_FPS 설정
4. 인코딩 완료 후 `fs.statSync(output).size` + duration 기반 bitrate 계산 로깅

## 5. Edge Cases
- EC-1: ProRes + yuv420p 불가 → ProRes는 항상 yuva444p10le 강제
- EC-2: ffmpeg 미설치 → encodeVideo 시작 시 `which ffmpeg` 체크

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
