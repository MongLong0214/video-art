# T3: demucs 소스 분리 + per-stem 분석

**PRD Ref**: PRD-track-analyzer v0.3 > US-2
**Priority**: P1 (High)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
demucs로 4트랙 분리 후 drums→킥/하이햇, bass→스펙트럼 개별 분석.

## 2. Acceptance Criteria
- [ ] AC-1: demucs `--out` 명시적 지정 → `out/analysis/{name}/stems/`
- [ ] AC-2: per-stem 서브셋: drums→onset/kick/hat, bass→spectral/centroid/type, vocals→dynamics, other→spectral/stereo
- [ ] AC-3: demucs 미설치 시 graceful skip (warnings + 원본만 분석)
- [ ] AC-4: 분리 후 출력 경로 검증 (drums.wav, bass.wav, vocals.wav, other.wav 4개 존재 확인)
- [ ] AC-5: 디스크 2x 안전 마진 사전 체크
- [ ] AC-6: per-stem 분석 결과 analysis.json의 `stems` 필드에 통합
- [ ] AC-7: **stemsSchema 구조 정의**:
  ```typescript
  stems: {
    drums: { onset_density, kick_pattern, hat_pattern },
    bass: { spectral_centroid, centroid_variance, bass_type },
    vocals: { dynamic_range },
    other: { spectral_centroid, stereo_width }
  }
  ```

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Expected |
|---|-----------|------|----------|
| 1 | `demucs detection` | Unit | try/catch sync check |
| 2 | `stem analysis subset drums` | Unit | only onset/kick/hat fields |
| 3 | `stem analysis subset bass` | Unit | only spectral/centroid/type |
| 4 | `stem analysis subset vocals` | Unit | only dynamic_range |
| 5 | `stem analysis subset other` | Unit | only spectral/stereo fields |
| 6 | `disk space check before demucs` | Unit | 2x margin |
| 7 | `graceful skip when no demucs` | Unit | warnings array, no crash |
| 8 | `4 stem files exist` | Integration | drums/bass/vocals/other.wav (skipIf !demucs) |
| 9 | `analysis.json has stems field` | Integration | stems object matches stemsSchema (skipIf !demucs) |
| 10 | `demucs --out flag used` | Unit | static check: contains "--out" |

Test file: `scripts/lib/track-analyzer.test.ts` (추가)

## 4. Implementation Guide

### 4.1 Files
| File | Change Type |
|------|------------|
| `audio/analyzer/analyze_track.py` | Modify (demucs 분리 + per-stem 분석 추가) |
| `audio/analyzer/requirements.txt` | Modify (demucs 추가) |
| `scripts/lib/track-analyzer.test.ts` | Modify (T3 테스트 추가) |
