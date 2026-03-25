# Pipeline Status: Layered Psychedelic Video

**PRD**: docs/prd/PRD-layered-psychedelic-video.md (Approved v0.3)
**Current Phase**: Phase 4 (Ticket Review)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | AC |
|--------|-------|------|--------|--------|---------|-----|
| T1 | 환경 설정 + 프로젝트 구조 | M | Pending | - | - | AC10 |
| T2 | 레이어 분해 모듈 (Step 1) | M | Pending | - | T1 | AC1, AC9 |
| T3 | 레이어 후처리 + scene.json (Step 2) | M | Pending | - | T2 | AC2, AC3 |
| T4 | 멀티 레이어 Three.js 렌더러 (Step 3 Core) | L | Pending | - | T1, T3(schema) | AC4 |
| T5 | 글로벌 포스트프로세싱 + 반짝임 (Step 3 Effects) | M | Pending | - | T4 | AC6 |
| T6 | Seamless Loop 검증 + 미리보기 통합 | M | Pending | - | T5 | AC5, AC4 |
| T7 | 영상 출력 + CLI 통합 (Step 4) | L | Pending | - | T6 | AC7, AC8 |

## Dependency Graph

```
T1 → T2 → T3 ──→ T5 → T6 → T7
T1 → T4 ────────↗
     (T3 schema만)
```

T3과 T4는 scene-schema.ts 공유로 부분 병렬 가능.

## Review History

| Phase | Round | Result | Date |
|-------|-------|--------|------|
| Phase 2 (PRD) | Round 1 | REQUEST CHANGES (P0: 3건) | 2026-03-25 |
| Phase 2 (PRD) | Round 2 | APPROVE (Boomer 이견 0) | 2026-03-25 |
| Phase 4 (Ticket) | Round 1 | REQUEST CHANGES → 수정 반영 | 2026-03-25 |
