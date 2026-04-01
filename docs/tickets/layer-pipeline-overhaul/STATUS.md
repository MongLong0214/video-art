# Pipeline Status: Layer Pipeline Enterprise Overhaul

**PRD**: docs/prd/PRD-layer-pipeline-overhaul.md
**Size**: XL
**Current Phase**: 7 (완료)

## Tickets

| Ticket | Title | Wave | Size | Status | Review | Depends | Notes |
|--------|-------|------|------|--------|--------|---------|-------|
| T1 | BG Plate 구멍 제거 | 1 | S | Done | PASS | None | fillBackgroundPlate claimed→opaque |
| T2 | Config 스키마 동기화 | 1 | S | Done | PASS | None | +6 fields, round-trip verified |
| T3 | 렌더링 이펙트 자동화 | 1 | M | Done | PASS | T2 | depth cinematic auto-activate |
| T4 | Export 품질 최적화 | 1 | S | Done | PASS | None | CRF 15, veryslow |
| T5 | 마스크 Hole-Filling | 2 | M | Done | PASS | T2 | iterative blur, integrated |
| T6 | Alpha Matting | 2 | S | Done | PASS | T5 | Gaussian edge softening, integrated |
| T7 | 멀티모델/Provider | 3 | L | Done | PASS | T2 | provider layer + fal.ai SAM3 |
| T8 | E2E Smoke Test | 1 | S | Done | PASS | T1, T2 | 실 API E2E 완료 (84.9MB mp4) |

## Wave 구조

```
Wave 1 (병렬): T1 + T2 + T4 → T3 (T2 의존) → T8 (T1+T2 의존)
Wave 2 (순차): T5 → T6
Wave 3 (순차): T7
```

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2     | 1     | HAS ISSUE | 1 | 5 | 5 | sharp morph 불가, ZIM 미확정 |
| 2     | 2     | ALL PASS | 0 | 0 | 2 | PRD v0.2 수정 후 통과 |
| 4     | 1     | HAS ISSUE | 0 | 4 | 5 | G10 누락, T7 test 파일 부재 |
| 4     | 2     | ALL PASS | 0 | 0 | 5 | T8 추가, T5 EC-3 추가 |
| 6     | 1     | HAS ISSUE | 1 | 0 | 3 | fal.ai queue 폴링 누락 |
| 6     | 2     | ALL PASS | 0 | 0 | 3 | fal.run 동기 endpoint로 수정 |

## 주요 기술 결정

- sharp Gaussian blur로 morphological closing 근사 (opencv-wasm 의존성 회피)
- ZIM alpha matting은 hosted API 부재로 후속 PRD 분리
- fal.ai 동기 endpoint 사용 (queue polling 불필요)

## 후속 작업

- [ ] ZIM alpha matting (Modal/로컬 배포) — 별도 PRD
- [ ] `getFalSam3Mask` 통합 테스트 (mock API)
- [ ] GroundingDINO+SAM2 경로 실제 연동
- [ ] 실 이미지로 E2E 파이프라인 검증
