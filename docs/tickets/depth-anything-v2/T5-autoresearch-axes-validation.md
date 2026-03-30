# T5: Autoresearch Axes + Validation Data Collection

**PRD**: PRD-depth-anything-v2.md
**US**: US-4 (AC-4.1, 4.3~4.5), US-5 (AC-5.1~5.3, 5.5)
**Size**: M
**Depends on**: T4 (role assignment + schema fields)
**Blocks**: T6

---

## Description

T4에서 추가한 3개 schema field의 `getDefaultConfig()` default, range validation 테스트, depthStats 계산, manifest role 비교 데이터를 완성한다. program.md를 갱신한다. Role 비교를 위해 `assignRoles()`를 depthRoleWeight=0으로 1차 호출 후 실제 config로 2차 호출하여 비교 데이터를 수집한다.

## Acceptance Criteria

- [ ] `getDefaultConfig()`에 실험용 default 반영: depthRoleWeight=0.5, depthForegroundThreshold=0.3, depthBackgroundThreshold=0.7
- [ ] `depthRoleWeight=0`에서 기존 동작 동일 (하위 호환)
- [ ] manifest에 `depthStats: { min, max, mean, stddev, count }` 기록
- [ ] manifest에 role 비교 데이터: 각 candidate의 `roleWithoutDepth`, `roleWithDepth`
- [ ] manifest에 `depthRoleWeight` 값 기록
- [ ] role 비교 구현: pipeline-layers.ts에서 assignRoles를 depthRoleWeight=0으로 1차 호출(roleWithoutDepth 저장) → 실제 config로 2차 호출(roleWithDepth 저장) → manifest에 양쪽 비교 데이터 기록
- [ ] `program.md`에 3개 axis 문서화 (range, default, description, interdependencies)
- [ ] `program.md`에서 luminance 관련 axis 문서 제거 확인 (T2에서 수행, 여기서 검증)

## Files to Modify

- `scripts/research/research-config.ts` — getDefaultConfig() depth defaults
- `scripts/pipeline-layers.ts` — depthStats 계산 + role double-run + manifest 데이터
- `scripts/lib/decomposition-manifest.ts` — depthStats, role 비교, depthRoleWeight 필드 추가
- `scripts/research/program.md` — axis 문서 갱신

## TDD Spec (Red Phase)

### Unit Tests
1. `getDefaultConfig()` — depth 3개 axis default 값 확인 (0.5, 0.3, 0.7)
2. `ResearchConfigSchema` — depthRoleWeight 범위 밖 (-0.1, 1.1) 에러
3. `ResearchConfigSchema` — depthForegroundThreshold 범위 (0.1~0.4) 유효/에러
4. `ResearchConfigSchema` — depthBackgroundThreshold 범위 (0.5~0.9) 유효/에러
5. `depthStats` 계산 — [50, 100, 150, 200] → min=50, max=200, mean=125, stddev≈55.9
6. `depthStats` 계산 — 빈 배열 → count=0, 기본값
7. `depthStats` 계산 — count=1 단일값 → stddev=0
8. `depthStats` 계산 — 모든 값 동일 [128,128,128] → stddev=0
9. `generateManifest()` — depthStats 포함 확인
10. `generateManifest()` — roleWithoutDepth, roleWithDepth 비교 데이터 포함
11. `generateManifest()` — depthRoleWeight 값 기록 확인

### Integration Tests
12. 전체 파이프라인 (DA V2 mock) → manifest에 depthStats + role 비교 + depthRoleWeight 포함
13. depthRoleWeight=0 → roleWithoutDepth === roleWithDepth (모든 candidate)
