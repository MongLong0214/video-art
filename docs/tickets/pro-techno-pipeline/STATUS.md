# Pro Techno Pipeline — Ticket Status

**PRD**: [PRD-pro-techno-pipeline.md](../../prd/PRD-pro-techno-pipeline.md)
**Size**: XL | **Level**: 2
**Created**: 2026-03-29

| T# | Title | Size | Status | Depends |
|----|-------|------|--------|---------|
| T1 | 4→5 스템 확장 (kick/hat 분리) | M | DONE | — |
| T2 | pedalboard 믹싱 체인 (mix-pro.py) | L | DONE | T1 |
| T3 | 사이드체인 컴프레션 (Python envelope) | M | DONE | T1 |
| T4 | 909 샘플팩 통합 | M | DONE | T1 |
| T5 | 분석 기반 자동 믹싱 | M | DONE | T2 |
| T6 | CLI 통합 (render-pro.ts) | M | DONE | T1-T5 |
| T7 | E2E 테스트 + calibrate 검증 | M | DONE (regression 812/812) | T6 |
