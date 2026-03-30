# T5: Autoresearch Documentation

**PRD Ref**: PRD-depth-cinematic-effects > US-5 (AC-5.2, AC-5.3, AC-5.4)
**Priority**: P2 (Medium)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T1, T2, T3, T4

---

## 1. Objective

program.md에 5개 depth cinematic axes 문서화. Parameter Reference, Interdependencies, Strategy Guide 업데이트.

## 2. Acceptance Criteria

- [ ] AC-1: program.md Parameter Reference에 5개 axis 추가 (Name, Range, Default, Description)
- [ ] AC-2: Interdependencies 섹션에 depth 축 상호작용 최소 3건:
  1. haze vs saturationBoostMul — haze는 boost 이후 적용, 높은 boost에서 haze 효과 증폭
  2. feather + parallax — parallax UV shift가 feather 경계를 이동시켜 미세 깜빡임 가능 → feather 사용 시 parallax 낮추기 권고
  3. depthSpeedInfluence + depthGlowInfluence 동시 활성화 → 가까운 레이어 과도하게 활발, 하나씩 sweep 권고
- [ ] AC-3: Strategy Guide에 depth 효과 탐색 전략 추가 (순차 탐색: depth 축 먼저 → 조합)
- [ ] AC-4: depth 분산 가드 동작 설명 (stddev < 5 → cinematic axes 강제 0)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `program.md contains depthSpeedInfluence parameter` | Unit | file content grep | found |
| 2 | `program.md contains depthGlowInfluence parameter` | Unit | file content grep | found |
| 3 | `program.md contains depthParallaxScale parameter` | Unit | file content grep | found |
| 4 | `program.md contains hazeIntensity parameter` | Unit | file content grep | found |
| 5 | `program.md contains featherRadius parameter` | Unit | file content grep | found |
| 6a | `program.md interdependencies: haze vs saturationBoost interaction documented` | Unit | file content pattern: `haze.*saturation` or `saturationBoost.*haze` | found |
| 6b | `program.md interdependencies: feather + parallax interaction documented` | Unit | file content pattern: `feather.*parallax` or `parallax.*feather` | found |
| 6c | `program.md interdependencies: depthSpeed + depthGlow simultaneous warning documented` | Unit | file content pattern: `depthSpeedInfluence.*depthGlowInfluence` or simultaneous activation warning | found |
| 7 | `program.md strategy guide mentions depth sweep` | Unit | file content grep | "depth" strategy found |

### 3.2 Test File Location

- `scripts/research/program.test.ts` (new — documentation content validation)

### 3.3 Mock/Setup Required

- Vitest: `fs.readFileSync` to load program.md as string
- Pattern matching on markdown content

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/program.md` | Modify | Parameter Reference + Interdependencies + Strategy Guide |
| `scripts/research/program.test.ts` | Create | 문서 내용 검증 테스트 |

### 4.2 Implementation Steps (Green Phase)

1. Parameter Reference 테이블에 "Depth Cinematic" 카테고리 추가:
   ```markdown
   | depthSpeedInfluence | 0.0–2.0 | 0.0 | Depth-proportional color cycle speed boost (near=faster) |
   | depthGlowInfluence | 0.0–2.0 | 0.0 | Depth-proportional glow intensity boost (near=brighter) |
   | depthParallaxScale | 0.0–0.1 | 0.0 | 2.5D parallax UV offset magnitude (near=more movement) |
   | hazeIntensity | 0.0–1.0 | 0.0 | Atmospheric desaturation for far layers |
   | featherRadius | 0.0–0.2 | 0.0 | UV edge alpha fade radius |
   ```

2. Interdependencies 섹션에 3건 추가

3. Strategy Guide에 depth sweep 전략:
   - Step 1: depthSpeedInfluence 단독 sweep (0.2~1.0)
   - Step 2: depthGlowInfluence 단독 sweep
   - Step 3: depthParallaxScale sweep (0.01~0.05 범위 권고)
   - Step 4: hazeIntensity sweep (0.1~0.5)
   - Step 5: featherRadius sweep (0.02~0.1)
   - Step 6: 상위 조합 탐색
   - Note: stddev < 5인 이미지에서는 cinematic axes 자동 비활성

### 4.3 Refactor Phase

- 기존 Parameter Reference 테이블의 포맷 일관성 확인

## 5. Edge Cases

- EC-1: program.md 포맷이 변경된 경우 — 기존 구조 확인 후 삽입
- EC-2: 기존 "Interdependencies" 섹션이 없으면 새로 생성

## 6. Review Checklist

- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 문서 구조 유지
- [ ] 5개 axis 모두 문서화됨
- [ ] Interdependencies 3건 이상
- [ ] Strategy Guide에 depth sweep 포함
