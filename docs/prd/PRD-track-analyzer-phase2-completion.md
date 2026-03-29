# PRD: Track Analyzer Phase 2 Completion — Hybrid Render + Mastering + Tests

**Version**: 0.1
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-29
**Status**: Draft
**Size**: L
**Depends On**: PRD-track-analyzer-phase2.md (v0.5.2 — 17 AC 구현 완료)

---

## 1. Problem Statement

### 1.1 Background
Phase 2 핵심 17 AC 구현 완료 (temporal dynamics, RLPFD detect, calibration dual-score 등). 그러나 3개 영역이 미완:

1. **Hybrid sample rendering stub** — `--hybrid` 플래그가 출력 파일명만 변경. manifest read, buffer load, sample_player 스케줄링 없음. AC-11.6/11.7 미충족.
2. **Spectral balance 부족** — 합성 출력이 레퍼런스 대비 Mid 15x, High 26x 부족. 마스터링 체인 부재.
3. **Python 테스트 전무** — calibrate.py의 dual_score, per_stem_scores, silence guard 등 단위 테스트 없음. tester 리뷰에서 PASS_WITH_GAPS 판정.

### 1.2 Problem Definition
1. hybrid_score가 synthesis_only_score와 동일 (샘플 미사용) → 캘리브레이션 의미 없음
2. 합성 출력 스펙트럼이 레퍼런스와 현저히 상이 → 청취 품질 미달
3. Python 핵심 함수 테스트 없음 → regression 보호 없음

### 1.3 Impact of Not Solving
- hybrid_score 목표(80) 달성 불가 — 샘플 실제 사용 없이 합성만으로는 65-75 한계
- 프로덕션 워크플로우 투입 불가 (Mid/High 부재 = 소리가 탁함)
- calibrate.py 변경 시 사일런트 regression 위험

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: **Hybrid render 완성** — manifest read → buffer allocate → sample_player 이벤트 스케줄 → hybrid WAV 출력
- [ ] G2: **SC 마스터링 체인** — 멀티밴드 컴프 + EQ + 리미터. spectral balance 개선
- [ ] G3: **Python 테스트 완성** — calibrate.py + sample_extract.py 단위 테스트. 핵심 함수 커버리지 80%+

### 2.2 Non-Goals
- NG1: 새로운 SynthDef 추가 (16종 유지)
- NG2: 실시간 마스터링 (NRT 오프라인만)
- NG3: MUSHRA 청취 평가 실행 (프레임워크만 존재)

## 3. User Stories & Acceptance Criteria

### US-1: Hybrid Sample Render
**As a** 프로듀서, **I want** `--hybrid` 모드에서 실제 demucs 샘플이 합성과 함께 재생되어 더 높은 재현율을 얻기를.

**Acceptance Criteria:**
- [ ] AC-1.1: `--hybrid` 시 `samples/manifest.json` 읽기. 없으면 synthesis-only 폴백 + warning
- [ ] AC-1.2: manifest의 각 hit에 대해 `BufferAllocator.allocate('samples')` + `b_allocRead` NRT 명령 생성
- [ ] AC-1.3: kick/snare 히트를 원본 onset 타이밍에 `sample_player` 이벤트로 스케줄
- [ ] AC-1.4: bass 샘플을 pitch_contour 타이밍에 `sample_player` 이벤트로 스케줄 (acid_bass와 병행)
- [ ] AC-1.5: hybrid 검증: NRT score에 `b_allocRead` 명령 >= 1개 존재 + hybrid WAV와 synthesis WAV 간 RMS delta > 0.01
- [ ] AC-1.6: `generateSampleBufferCommands(manifestPath, allocator, analysisDir)` 실제 호출. `basePath` = `analysisDir` (NRT Score 실행 cwd 기준 상대경로 보장)
- [ ] AC-1.7: **Gain staging** — sample_player amp = 0.6 (synth 대비 -4dB). kick/snare 히트와 layered_kick/hat 합성 간 ducking 없음 (합산). peak guard: 전체 믹스 `.tanh` 클리핑 방지. 기존 v0.5.2 hybrid 계약(stemGroupRef `sample_player:{type}_{NNN}`, buf sentinel -1, relative b_allocRead) 준수

### US-2: SC 마스터링 체인
**As a** 프로듀서, **I want** NRT 렌더 출력에 마스터링이 적용되어 레퍼런스와 유사한 스펙트럼 밸런스를 얻기를.

**Acceptance Criteria:**
- [ ] AC-2.1: Python 후처리 스크립트 `audio/analyzer/master.py` — 3-band EQ + 멀티밴드 컴프 + 리미터
- [ ] AC-2.2: **EQ 정책 (확정)**: 분석 기반 동적. `target_balance = reference frequency_balance`. `gain_db = 10 * log10(target / current)`. 상한 클램프: mid max +8dB, high max +6dB. fallback (frequency_balance null): mid +6dB, high +4dB
- [ ] AC-2.3: frequency_balance 분석 결과에서 target balance 계산 → EQ 자동 조정
- [ ] AC-2.4: LUFS -14 타겟 리미팅 (pyloudnorm)
- [ ] AC-2.5: `render-analysis.ts` 완료 후 자동 호출. `--no-master` 로 비활성화
- [ ] AC-2.6: 마스터링 전/후 calibration score 비교 출력. **레퍼런스 경로**: `analysis.json`에 `reference_path` 필드 저장 (analyze_track.py가 입력 파일 경로를 기록). 없으면 `--reference` CLI 옵션으로 전달. 둘 다 없으면 score 비교 skip + warning
- [ ] AC-2.7: **Non-regression gate**: 마스터링 후 score가 전보다 -3점 이상 하락 시 마스터링 결과 파기 + 원본 유지 + warning. peak > -0.3dBFS 시 리미터 재적용

### US-3: Python 테스트 완성
**As a** 개발자, **I want** Python 분석/캘리브레이션 코드에 단위 테스트가 있어 regression을 방지하기를.

**Acceptance Criteria:**
- [ ] AC-3.1: `audio/analyzer/test_calibrate.py` — dual_score, per_stem_scores, composite_similarity 테스트
- [ ] AC-3.2: 동일 파일 score >= 95 테스트
- [ ] AC-3.3: 무관 파일 score < 50 테스트
- [ ] AC-3.4: 무음 입력 → score=0 + warning 테스트
- [ ] AC-3.5: onset F1 bipartite 중복 방지 테스트
- [ ] AC-3.6: `audio/analyzer/test_sample_extract.py` — classify_hit, extract_hits, fade, MAX_HITS 테스트
- [ ] AC-3.7: pytest 실행으로 전체 PASS. **CI 강제**: pytest 미설치 시 `npm run test:python` 실패 (skip 아닌 error exit). requirements.txt에 pytest 추가
- [ ] AC-3.8: `audio/analyzer/test_master.py` — EQ band gains, LUFS normalization, bypass on silence, non-regression gate 테스트

## 4. Technical Design

### 4.1 Architecture Overview

```
[기존 Pipeline]                    [신규 추가]

render-analysis.ts                render-analysis.ts (확장)
├── synthesis events              ├── hybrid: manifest read + buffer load
├── section n_set                 ├── hybrid: sample_player events
└── NRT render → WAV              └── NRT render → WAV

                                  master.py (신규)
                                  ├── 3-band EQ (scipy.signal)
                                  ├── multiband compressor
                                  ├── LUFS limiter (pyloudnorm)
                                  └── render → mastered WAV

                                  test_calibrate.py (신규)
                                  test_sample_extract.py (신규)
```

### 4.2 Hybrid Render Integration

```typescript
// render-analysis.ts — hybridMode block
if (hybridMode) {
  const manifestPath = path.join(analysisDir, "samples", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    const allocator = new BufferAllocator();
    const bufCmds = generateSampleBufferCommands(manifestPath, allocator, analysisDir);
    // Insert b_allocRead commands at time=0 (before synth events)
    // Schedule sample_player events at original onset times
  }
}
```

### 4.3 Mastering Chain (Python)

```python
# master.py — 3-band processing
def master(input_wav, output_wav, analysis_json, target_lufs=-14):
    # 1. Load + analyze current spectral balance
    # 2. Calculate EQ gains from reference frequency_balance
    # 3. Apply 3-band EQ (scipy.signal butterworth crossover)
    # 4. Multiband compression (per-band RMS envelope → gain reduction)
    # 5. Brick-wall limiter → target LUFS
```

### 4.4 Key Technical Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Mastering location | SC (NRT) vs Python | **Python** | scipy + pyloudnorm 이미 설치. SC 마스터링 UGen 복잡 |
| EQ 방식 | parametric vs 3-band crossover | **3-band crossover** | 분석 결과가 low/mid/hi 3밴드. 매칭 직관적 |
| 컴프 방식 | wideband vs multiband | **Multiband** | 밴드별 독립 compression으로 spectral balance 유지 |
| 테스트 프레임워크 | pytest vs unittest | **pytest** | 간결, fixture 지원, 프로젝트 표준 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | manifest.json 미존재 (--hybrid) | synthesis-only 폴백 + warning | P2 |
| E2 | 샘플 WAV 파일 누락 (manifest에 존재) | 해당 hit skip + warning | P2 |
| E3 | 마스터링 입력 무음 | bypass + warning | P2 |
| E4 | frequency_balance null | 기본 EQ (+6dB mid, +4dB high) | P3 |
| E5 | pytest 미설치 | `npm run test:python` error exit (CI 실패) | P2 |
| E6 | Corrupt WAV 입력 (master.py) | try/except + bypass + warning | P3 |
| E7 | Disk space exhaustion (mastering write) | 쓰기 실패 시 원본 유지 + warning | P3 |

## 6. Security & Permissions

- Python subprocess: array-form execFile (기존 패턴)
- master.py: 로컬 전용, 외부 접근 없음
- 테스트: fixture WAV 파일만 사용 (실제 음원 미포함)

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hybrid render (30s, 50 samples) | < 5초 추가 | time 측정 |
| Mastering (30s WAV) | < 3초 | time 측정 |
| Python 테스트 전체 | < 10초 | pytest 실행 시간 |

## 8. Testing Strategy

### 8.1 Unit Tests (Python)
- `test_calibrate.py`: dual_score (synthesis/hybrid), per_stem_scores, silence guard, bipartite F1
- `test_sample_extract.py`: classify_hit (kick/hat/snare/bass/fx), fade, MAX_HITS, empty stem
- `test_master.py`: EQ band gains, LUFS normalization, bypass on silence

### 8.2 Integration Tests (TS)
- Hybrid render: manifest → buffer commands → sample_player events → WAV (non-zero)
- Mastering: render → master.py → mastered WAV exists + size > 0

### 8.3 Edge Case Tests
- E1-E5 전부 커버

## 9. Rollout Plan

| Step | 내용 | Size | 의존 |
|------|------|------|------|
| T15 | Python 테스트 (calibrate + sample_extract) | M | 없음 |
| T16 | Hybrid sample render 완성 | L | T15 |
| T17 | SC 마스터링 체인 (master.py) | M | 없음 |
| T18 | E2E: hybrid render → mastering → calibration | M | T16, T17 |

### 9.1 Rollback Plan
1. master.py 삭제 + render-analysis.ts hybrid 블록 제거
2. 테스트 파일 삭제
3. 기존 synthesis-only 경로 무영향

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Status | Risk |
|-----------|--------|------|
| scipy.signal | librosa 전이 의존 (대부분 설치됨). requirements.txt에 명시 추가 | pip install scipy |
| pyloudnorm | 설치됨 | 없음 |
| pytest | 설치 필요 | pip install pytest |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 마스터링이 소리 왜곡 | 중간 | 중간 | 보수적 EQ (+6dB max), A/B 청취 |
| scipy 미설치 환경 | 낮음 | 낮음 | --no-master 폴백 |

## 11. Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| synthesis_only_score | ~45 (추정) | 65-75 |
| hybrid_score | N/A (stub) | **80** |
| mastered hybrid_score | N/A | **85+** |
| Python test coverage | 0% | 80%+ |
| spectral mid balance | 15x 부족 | 2x 이내 |

## 12. Open Questions

- [x] OQ-1: **해결** — crossover 250Hz/4kHz 고정. analysis 기반은 gain만 동적
- [x] OQ-2: **해결** — mid max +8dB, high max +6dB (AC-2.2 확정)
