# T4: Depth-Enhanced Role Assignment

**PRD**: PRD-depth-anything-v2.md
**US**: US-3 (AC-3.1~3.8), US-4 (AC-4.2 schema 부분)
**Size**: L
**Depends on**: T3 (meanDepth)
**Blocks**: T5

---

## Description

`assignRoles()`의 기존 if-chain 내에 depth-gated threshold 완화 로직을 추가한다. `depthRoleWeight`로 depth 영향 강도를 연속 조절하며, depth 분산 부족 시 자동 fallback한다.

## Acceptance Criteria

- [ ] `assignRoles()`에서 기존 if-chain 구조 유지. 각 분기에서 depthRoleWeight에 비례하여 depth percentile이 threshold 완화/강화
- [ ] `depthRoleWeight=0`이면 기존 heuristic 결과와 100% 동일 (하위 호환)
- [ ] subject 분기: depth 상위 percentile(≥ depthForegroundThreshold)인 candidate의 centrality threshold 완화
- [ ] background 분기: depth 하위 percentile(< 1-depthBackgroundThreshold)인 candidate의 bbox 크기 threshold 완화
- [ ] foreground-occluder 분기: depth 상위 percentile인 candidate만 occluder 강화
- [ ] `depthActive = (depthStats.stddev >= 5)` — 분산 부족 시 depthRoleWeight 무시, heuristic만 사용
- [ ] `orderByRole()` depth tie-breaker가 실제 meanDepth 값으로 동작 (기존 로직, 데이터만 변경)
- [ ] background-plate 판정은 depth 영향 없음 (기존 로직 유지)
- [ ] `assignRoles()`가 ResearchConfig에서 `depthRoleWeight`, `depthForegroundThreshold`, `depthBackgroundThreshold` 수신
- [ ] `ResearchConfigSchema`에 3개 depth field 추가 (T5에서 default/validation/docs 완성):
  - `depthRoleWeight: z.number().min(0).max(1).default(0.5)`
  - `depthForegroundThreshold: z.number().min(0.1).max(0.4).default(0.3)`
  - `depthBackgroundThreshold: z.number().min(0.5).max(0.9).default(0.7)`

## Files to Modify

- `scripts/lib/layer-resolve.ts` — assignRoles() depth-gated 분기 추가, depthPercentile 계산, depthActive 판정
- `scripts/pipeline-layers.ts` — assignRoles()에 depth config 전달
- `scripts/research/research-config.ts` — 3개 depth field 스키마 추가 (compile dependency 해소)

## TDD Spec (Red Phase)

### Unit Tests
1. `assignRoles()` depthRoleWeight=0 — 기존 heuristic 결과 동일 (regression)
2. `assignRoles()` depthRoleWeight=1 — depth percentile이 role 판정에 최대 반영
3. `assignRoles()` depthRoleWeight=0.5 — 중간 영향도 (threshold 부분 완화)
4. subject 보강 — 중앙 약간 벗어났지만 depth 높은 candidate → depthRoleWeight>0에서 subject 됨
5. subject 보강 — 중앙이지만 depth 낮은(먼) candidate → depthRoleWeight>0에서 subject 안 됨(background 가능성)
6. background 보강 — bbox 약간 작지만 depth 낮은 candidate → depthRoleWeight>0에서 background 됨
7. foreground-occluder 보강 — 가장자리 + depth 높은 → occluder. 가장자리 + depth 낮은 → occluder 아님
8. background-plate — depth 무관하게 가장 넓은 candidate = bg-plate (변경 없음)
9. depthActive fallback — 전체 candidate meanDepth=128 (stddev=0) → heuristic만 사용
10. depthActive fallback — stddev=3 → heuristic만 사용
11. depthPercentile 계산 — 3개 candidate depth [50, 150, 200] → percentile [0.0, 0.5, 1.0]
12. depthPercentile 동점 — [100, 100, 200] → 동점 candidate는 동일 percentile, 결정론적 결과
13. depthActive=false + depthRoleWeight=1 → 결과가 depthRoleWeight=0과 동일 (AC-3.6 명시 검증)
14. single candidate — depthPercentile=1.0, heuristic fallback 자동 작동
15. `orderByRole()` — meanDepth [200, 100, 50] → depth 순서대로 z-ordering
16. `ResearchConfigSchema` — depthRoleWeight, depthForegroundThreshold, depthBackgroundThreshold 파싱 확인
