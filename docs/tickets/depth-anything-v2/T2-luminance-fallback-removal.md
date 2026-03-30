# T2: Luminance Fallback Removal

**PRD**: PRD-depth-anything-v2.md
**US**: US-2 (AC-2.1~2.10)
**Size**: M
**Depends on**: None (T1과 독립)
**Blocks**: T3

---

## Description

luminance fallback 전체를 제거한다. 함수 3개, config axis 5개, source type, pass type, 관련 테스트, 문서를 모두 정리한다.

## Acceptance Criteria

- [ ] `image-decompose.ts`에서 `splitByLuminanceZones()`, `shouldRunLuminanceFallback()`, `buildResidualMask()` 함수 제거
- [ ] `decomposeImage()` 내 luminance fallback 호출 분기 제거
- [ ] `research-config.ts`에서 5개 axis 제거: `luminanceFallbackEnabled`, `luminanceFallbackMinSamLayers`, `luminanceFallbackZoneCount`, `luminanceFallbackResidualOnly`, `luminanceFallbackResidualCoverageMin`
- [ ] `getDefaultConfig()`에서 luminance default 값 제거
- [ ] `DecomposeOptions` interface에서 5개 luminance 옵션 제거
- [ ] `FileSourceMeta.source`에서 `"luminance-split"` 제거 → `"sam2-segment"` 단일 값
- [ ] `decomposition-manifest.ts`에서 `"luminance-fallback"` pass type 제거
- [ ] `pipeline-layers.ts`에서 luminance config passthrough 제거
- [ ] `program.md`에서 luminance 관련 문서 제거
- [ ] 모든 관련 테스트 파일에서 luminance 참조 제거/갱신
- [ ] 전체 코드베이스에서 `luminance-split`, `luminanceFallback` 잔존 여부 2차 검증 패스 (grep)

## Files to Modify

- `scripts/lib/image-decompose.ts` — 함수 3개 + fallback 분기 제거
- `scripts/research/research-config.ts` — 5개 axis + default 제거
- `scripts/pipeline-layers.ts` — luminance config passthrough 제거
- `scripts/lib/decomposition-manifest.ts` — `"luminance-fallback"` pass type 제거
- `src/lib/scene-schema.ts` — `"luminance-split"` source 제거
- `scripts/research/program.md` — luminance 문서 제거
- Test files: `research-config.test.ts`, `run-once.comprehensive.test.ts`, `config-integration.comprehensive.test.ts`, `decomposition-manifest.test.ts`, `decomposition-manifest.comprehensive.test.ts`, `comprehensive-e2e.test.ts`

## TDD Spec (Red Phase)

### Unit Tests
1. `decomposeImage()` — luminanceFallbackEnabled 옵션이 없어도 정상 동작
2. `decomposeImage()` — SAM2가 1개 mask만 반환해도 luminance fallback 미발동 (함수 자체 없음)
3. `ResearchConfigSchema` — luminance 관련 필드 파싱 시 에러 (unknown key)
4. `FileSourceMeta.source` — `"sam2-segment"` 만 허용 확인
5. `generateManifest()` — passes에 `"luminance-fallback"` type 없음 확인
6. Codebase grep — `luminance-split`, `luminanceFallback` 0건 확인 (integration test)
