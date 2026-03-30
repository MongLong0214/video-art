# T6: Final Verification + Convention Test

**PRD**: PRD-depth-anything-v2.md
**US**: US-1 (AC-1.5 검증), US-2 (AC-2.10), US-5 (AC-5.5)
**Size**: S
**Depends on**: T5 (전체 완료)
**Blocks**: None

---

## Description

전체 파이프라인 통합 검증. depth convention 정확성 확인, luminance 잔존 검증, depth 분포 일관성 확인.

## Acceptance Criteria

- [ ] `vitest run` 전체 통과
- [ ] 전체 코드베이스 grep: `luminance-split`, `luminanceFallback` 0건
- [ ] depth convention 검증: 참조 이미지에서 가까운 물체의 meanDepth > 먼 물체의 meanDepth
- [ ] 파이프라인 5회 실행 → depthStats.stddev > 0 확인 (depth map이 상수가 아님)
- [ ] depthRoleWeight=0 → 기존 role assignment와 동일 출력 (regression)
- [ ] manifest에 models.depthAnything, depthConvention, depthStats 정상 기록
- [ ] scene.json에 per-layer meanDepth 기록 확인

## Files to Modify

- None (검증 전용, 코드 수정 없음. 발견된 이슈는 해당 티켓으로 역행)

## TDD Spec (Red Phase)

### Integration Tests
1. Codebase grep — `luminance-split` 0건
2. Codebase grep — `luminanceFallback` 0건
3. Codebase grep — `shouldRunLuminanceFallback` 0건
4. Codebase grep — `splitByLuminanceZones` 0건
5. Depth convention — 알려진 전경/배경 이미지에서 meanDepth 순서 검증
6. Pipeline E2E (mock) — manifest + scene.json 완전성 검증
