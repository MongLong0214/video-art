# T14: E2E: 분석 → 샘플 추출 → 프리셋 → NRT 렌더 → 캘리브레이션

**PRD Ref**: PRD-track-analyzer-phase2 > ALL
**Priority**: P1
**Size**: L
**Status**: Todo
**Depends On**: T1-T13

---

## 1. Objective
전체 파이프라인 E2E 통합 테스트. 레퍼런스 트랙 분석 → demucs → 샘플 추출 → pitch contour → 프리셋(sections) → NRT 렌더 → 캘리브레이션 스코어.

## 2. Acceptance Criteria
- [ ] AC-1: analyze_track.py → analysis.json (18종 + pitch_contour)
- [ ] AC-2: sample_extract.py → manifest.json + samples/
- [ ] AC-3: generatePreset → preset with sections + acid_bass/sample_player
- [ ] AC-4: buildNrtScore → NrtScore (bufferCommands + events + controlEvents)
- [ ] AC-5: NRT render → WAV output
- [ ] AC-6: calibrate → dual-score JSON
- [ ] AC-7: 기존 2781 테스트 regression 0
- [ ] AC-8: 전체 신규 테스트 PASS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `full pipeline acid track` | E2E | Void - Acid Carousel | calibration JSON exists |
| 2 | `synthesis_only_score > 0` | E2E | score check | > 0 |
| 3 | `hybrid_score > synthesis_only` | E2E | comparison | hybrid > synth |
| 4 | `all 16 SynthDefs compile` | Integration | sclang all .scd | exit 0 |
| 5 | `no test regression` | Regression | full suite | 2781+ PASS |

### 3.2 Test File Location
- scripts/lib/comprehensive-e2e.test.ts, scripts/lib/pipeline-e2e.test.ts (신규)

### 3.3 Mock/Setup Required
- 실제 오디오 파일 + sclang + Python

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/lib/pipeline-e2e.test.ts | Create | Full pipeline E2E |
| scripts/lib/comprehensive-e2e.test.ts | Modify | assertion 업데이트 |

### 4.2 Implementation Steps (Green Phase)
1. pipeline-e2e.test.ts 작성
2. 전체 파이프라인 실행
3. 캘리브레이션 스코어 검증
4. regression 확인

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- ALL (전체 edge cases 통합 검증)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
