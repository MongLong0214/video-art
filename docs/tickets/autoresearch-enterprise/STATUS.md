# Pipeline Status: Autoresearch Enterprise

**PRD**: docs/prd/PRD-autoresearch-enterprise.md
**Size**: XL
**Current Phase**: 5 (TDD Development)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | 레이어 파이프라인 테스트 동기화 | L | Todo | - | None | US-1: complexity/layer-resolve/pipeline-cli/manifest/scene-gen |
| T2 | Research 모듈 테스트 동기화 | M | Todo | - | None | US-1: research-config/run-once/config-integration (T1과 병렬) |
| T3 | 기타 테스트 + 전체 0 fail 검증 | M | Todo | - | T1, T2 | US-1: e2e-golden/track-analyzer + 전체 통합 |
| T4 | pipeline-runner 버그 수정 + 테스트 | L | Todo | - | None | US-2: --variant 버그 + 14개 테스트 |
| T5 | Research 성능 최적화 | L | Todo | - | T4 | US-3: scene.json 패치 + archive 정리 + 환경변수 |
| T6 | VMAF 메트릭 연동 + 가이드 | M | Todo | - | None | US-4: 독립 (병렬 가능) |
| T7 | E2E Calibration + Edge Case | L | Todo | - | T3,T4,T5 | US-5+US-6: calibrate 3/3 + 에러 핸들링 |

## Dependency Graph

```
T1 ─┬─→ T3 ─┐
    │        ├─→ T7 (E2E 검증)
T2 ─┤   T4 ─┤
    └─→ T4 ─→ T5 ─┘
T6 (독립)
```

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2     | 1     | HAS ISSUE | 2 | 3 | 3 | strategist/guardian/boomer |
| 2     | 2     | ALL PASS | 0 | 0 | 0 | v0.2 수정 후 boomer 수렴 |
| 4     | 1     | HAS ISSUE | 0 | 9 | 5 | strategist/tester/boomer |
| 4     | 2     | ALL PASS | 0 | 0 | 0 | 9 P1 수정 후 boomer 수렴 |
| 6     | -     | -       | - | - | -  | 대기 |
