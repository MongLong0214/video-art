# Pipeline Status: Track Analyzer Phase 2

**PRD**: docs/prd/PRD-track-analyzer-phase2.md (v0.5.2)
**Size**: XL
**Current Phase**: 5 (Rework — 17 ACs 미구현)

## 핵심 문제
1. **T10 temporal dynamics 미구현** — sections, envelope following, accent 추출, buildNrtScore 실사용, Tidal 섹션
2. **render-analysis.ts** — 분석 데이터 13/19 미활용. 하드코딩된 멜로디/파라미터가 소음 유발
3. **structure 감지 고장** — detect_structure()가 0.3초 이후 전부 "outro" → 재작성 완료 (8-bar chunk)
4. **pitch_contour** — 풀믹스에서 sub-bass만 감지. bass stem + fmin=55로 재추출 시 77 notes + 17 slides 성공
5. **spectral balance** — 합성이 레퍼런스 대비 Mid 15x, High 26x 부족. 마스터링 체인 필요

## 미구현 AC 17개
T02: AC-3 (RLPFD detect)
T08: AC-12 (other stem FX)
T10: AC-1~4, AC-6~7, AC-9 (temporal dynamics 핵심 7개)
T11: AC-4,6~9 (dual-score, per-stem, benchmark)
T14: AC-3,4,6 (sections, buildNrt, dual-score)

## 완료된 것 (유지)
- T1: presetSchema 16종, SYNTH_STEM_MAP 16종, BufferAllocator ✅
- T2-T8: 7종 SynthDef .scd (sclang 7/7 컴파일 확인) ✅
- T9: pitch contour 3-tier fallback (torchcrepe 작동 확인) ✅
- T11: calibrate.py 5-metric (단일 스코어) ✅
- T12: 5종 장르 프리셋 업데이트 ✅
- T13: sample-utils.ts parseStemGroupRef ✅
- 설치: SuperCollider 3.14.1, essentia, demucs, torchcrepe, pyloudnorm ✅
- E2E 파이프라인: analysis → preset → NRT render → calibrate (작동하지만 소리 품질 미달)

## 다음 세션 시작점
1. render-analysis.ts 재작성 — 모든 분석 필드 활용 (현재 버전은 부분 연결됨)
2. T10 AC 7개 실구현 — sections 필드, 섹션별 매핑, RMS envelope following, accent 추출
3. SC 마스터링 체인 또는 Python 후처리 (멀티밴드 컴프, EQ) — spectral balance 해결
4. T11 dual-score 구현
5. T14 E2E 재검증

## 세션 재개 명령
```
cat docs/tickets/track-analyzer-phase2/STATUS.md
```
