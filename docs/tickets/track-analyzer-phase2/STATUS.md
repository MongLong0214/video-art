# Pipeline Status: Track Analyzer Phase 2

**PRD**: docs/prd/PRD-track-analyzer-phase2.md (v0.5.2)
**Size**: XL
**Current Phase**: 6 (AC Implementation — 16/17 구현 완료)
**Last Updated**: 2026-03-29

## 이번 세션 구현 완료 (16 ACs)

### T10: temporal dynamics (7 ACs → 7 구현)
- [x] AC-1: sections[] in presetSchema (optional, backward compat) — `genre-preset.ts`
- [x] AC-2: section-specific mapping (drop=heavy, break=pad, build=riser) — `track-analyzer.ts:buildSectionOverrides`
- [x] AC-3: RMS envelope following → compress/drive dynamic params — `track-analyzer.ts:mapRmsToOverrides`
- [x] AC-4: accent extraction from pitch_contour velocity — `track-analyzer.ts:extractAccents`
- [x] AC-6: buildNrtScore integration — `render-analysis.ts` n_set at section boundaries
- [x] AC-7: Tidal section blocks — `track-analyzer.ts:generateTidalSections` + `analyze-track.ts`
- [x] AC-9: acid_bass routing verified (already implemented) — `generatePreset` stemGroups

### T02: AC-3 (RLPFD detect)
- [x] `sc-plugins-detect.ts` — hasRLPFD() runtime detection
- [x] `acid_bass_rlpfd.scd` — RLPFD variant SynthDef
- [x] `render-analysis.ts` — auto-selects RLPFD or MoogFF at render time

### T08: AC-12 (other stem FX)
- [x] `analyze-track.ts` — calls sample_extract.py for drums/bass/other stems
- [x] `sample_extract.py` classify_hit already handles other→fx

### T11: calibration (5 ACs → 5 구현)
- [x] AC-4: per-stem comparison — `calibrate.py:per_stem_scores`
- [x] AC-6: dual-score (synthesis_only + hybrid) — `calibrate.py:dual_score`
- [x] AC-7: benchmark-tracks.json (5 tracks, scoring targets) — `audio/analyzer/benchmark-tracks.json`
- [x] AC-8: mode + lufs_normalized fields — in dual_score output
- [x] AC-9: per-stem targets (drums≥80, bass≥75, synth≥70) — in output + benchmark JSON

### T14: E2E (3 ACs → 3 구현)
- [x] AC-3: generatePreset outputs sections with overrides (27 tests pass)
- [x] AC-4: buildNrtScore merges bufferCommands + events + controlEvents
- [x] AC-6: calibrate outputs dual-score JSON

## 테스트 결과
- **1312 passed** (1285 기존 + 27 신규), 0 failures, 15 skipped
- Zero regressions

## 남은 핵심 문제
1. **spectral balance** — 합성이 레퍼런스 대비 Mid/High 부족. SC 마스터링 체인 또는 Python 후처리 필요
2. **render 품질** — render-analysis.ts가 모든 분석 필드 활용하지만 소리 품질 추가 튜닝 필요
3. **실전 검증** — 실제 오디오 파일로 full pipeline E2E 실행 + calibration score 측정 필요
4. **structure 감지 정확도** — 재작성된 8-bar chunk detector 실전 검증 필요

## 완료된 것 (전체)
- T1: presetSchema 16종 + sections[] + SYNTH_STEM_MAP 16종, BufferAllocator ✅
- T2-T8: 7종 SynthDef .scd (sclang 7/7 컴파일 확인) + RLPFD variant ✅
- T9: pitch contour 3-tier fallback (torchcrepe 작동 확인) ✅
- T10: temporal dynamics — sections, RMS envelope, accent, buildNrtScore, Tidal ✅
- T11: calibrate.py dual-score + per-stem + benchmark ✅
- T12: 5종 장르 프리셋 업데이트 ✅
- T13: sample-utils.ts parseStemGroupRef ✅
- T14: E2E 27 tests pass ✅
- 설치: SuperCollider 3.14.1, essentia, demucs, torchcrepe, pyloudnorm ✅

## 세션 재개 명령
```
cat docs/tickets/track-analyzer-phase2/STATUS.md
```
