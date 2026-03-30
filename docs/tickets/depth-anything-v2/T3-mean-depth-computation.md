# T3: meanDepth Computation + Schema Extension

**PRD**: PRD-depth-anything-v2.md
**US**: US-1 (AC-1.4, 1.7, 1.8), US-5 (AC-5.4)
**Size**: M
**Depends on**: T1 (depthMap), T2 (clean codebase)
**Blocks**: T4

---

## Description

pipeline-layers.ts의 Step 6.5에 `computeMeanDepth()`를 삽입하여 각 candidate의 exclusive mask 영역에서 depth map 평균값을 계산한다. scene-schema, scene-generator, manifest에 depth 데이터를 기록한다.

## Acceptance Criteria

- [ ] `computeMeanDepth(depthMap, exclusiveMask, width, height)` → number (0-255). 빈 mask → 128
- [ ] pipeline-layers.ts Step 6(resolveExclusiveOwnership) 이후, Step 7(assignRoles) 이전에 호출
- [ ] depthMap은 DecomposeResult.depthMap에서 수신. undefined면 전체 candidate meanDepth=128
- [ ] depth map을 prepared 이미지 해상도(width x height)로 resize 후 computeMeanDepth에 전달. `sharp.resize(width, height).grayscale().raw()` 사용. resize 전후 dimension 불일치 시 에러
- [ ] `layerSchema`(scene-schema.ts)에 `meanDepth: z.number().optional()` 필드 추가
- [ ] `RetainedLayer`(scene-generator.ts)에 `meanDepth?: number` 추가
- [ ] scene-generator에서 scene.json per-layer `meanDepth` 기록
- [ ] decomposition-manifest에 DA V2 모델 정보 기록: `models.depthAnything: { model, version }`
- [ ] manifest에 `depthConvention: "near-is-high"` 기록
- [ ] depth map을 archive `source/depth-map.png`로 저장

## Files to Modify

- `scripts/pipeline-layers.ts` — Step 6.5 computeMeanDepth 삽입, depthMap 수신, manifest 데이터
- `src/lib/scene-schema.ts` — layerSchema에 meanDepth 추가
- `scripts/lib/scene-generator.ts` — RetainedLayer에 meanDepth 추가, scene.json 기록
- `scripts/lib/decomposition-manifest.ts` — DA V2 모델 정보, depthConvention

## TDD Spec (Red Phase)

### Unit Tests
1. `computeMeanDepth()` — 전체 200인 depth map + 전체 1인 mask → mean=200
2. `computeMeanDepth()` — 절반 0 절반 255 depth + 전체 mask → mean≈127.5
3. `computeMeanDepth()` — 전체 0인 mask (빈 mask) → 128 (기본값)
4. `computeMeanDepth()` — 부분 mask → masked 영역만 평균
5. `computeMeanDepth()` — depth map 크기가 mask와 다를 때 resize 후 계산 검증
6. depthMap=undefined → 전체 candidate meanDepth=128
7. `layerSchema` — meanDepth optional 필드 파싱 성공
8. `layerSchema` — meanDepth 없어도 파싱 성공 (하위 호환)
9. `generateSceneJson()` — RetainedLayer에 meanDepth 전달 → scene.json에 기록
10. `generateManifest()` — models.depthAnything 포함, depthConvention 포함
11. `generateManifest()` — finalLayers에 per-layer meanDepth 기록 확인
12. archive `source/depth-map.png` 저장 확인 (파일 존재 + 유효한 PNG)

### Integration Tests
13. 전체 파이프라인 (DA V2 mock) → manifest에 depthConvention + models.depthAnything 포함
14. depth map + SAM mask → Step 6.5 → candidate.meanDepth 채워짐 확인
