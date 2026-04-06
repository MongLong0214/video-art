# T7: FrameTexturePool + layered-psychedelic.ts 렌더러 확장

**PRD Ref**: PRD-ai-motion-pipeline > US-1 (AC-1.1, AC-1.4), §4.1.4
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T1 (코드 의존. T5는 런타임 의존만 — 임의 PNG 시퀀스로 독립 테스트 가능)

---

## 1. Objective

Three.js에서 프레임 시퀀스를 텍스처로 로드하는 FrameTexturePool을 구현하고, layered-psychedelic.ts의 렌더 루프를 확장하여 motion 레이어에서 프레임별 텍스처 교체를 지원.

## 2. Acceptance Criteria

- [ ] AC-1: FrameTexturePool이 frameIndex → THREE.Texture 반환 (캡처 모드: 사전 로드, 프리뷰 모드: 슬라이딩 윈도우)
- [ ] AC-2: layered-psychedelic.ts update()에서 normalizedTime → frameIndex 계산 + uTexture 교체
- [ ] AC-3: LayerMesh 인터페이스에 textureSource 필드 추가
- [ ] AC-4: motion 없는 레이어는 기존 정적 텍스처 경로 100% 유지
- [ ] AC-5: __startCapture() 시 preloadAll() → 전체 프레임 사전 로드 완료 후 캡처 시작
- [ ] AC-6: dispose() 시 모든 텍스처 정리

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `normalizedTime 0 returns frame 0` | Unit | frameIndex 계산 | 0 |
| 2 | `normalizedTime 0.5 returns midpoint frame` | Unit | frameCount=100 | 50 |
| 3 | `normalizedTime 0.999 returns last frame` | Unit | frameCount=100 | 99 (not 100) |
| 4 | `clamps frame index to valid range` | Unit | edge case | 0 ≤ idx < frameCount |
| 5 | `static layer uses original texture` | Unit | motion=undefined | uTexture 불변 |
| 6 | `motion layer swaps texture per frame` | Integration | 3프레임 시퀀스 | 매 update마다 uTexture 변경 |
| 7 | `preloadAll loads all frames` | Integration | 10프레임 | 10 텍스처 로드 완료 |
| 8 | `dispose cleans all textures` | Unit | dispose 호출 후 | cache size = 0 |

### 3.2 Test File Location

- `src/lib/__tests__/frame-texture-pool.test.ts`
- `src/sketches/__tests__/layered-psychedelic.test.ts`

### 3.3 Mock/Setup Required

- THREE.TextureLoader mock
- 테스트용 소형 PNG 시퀀스 (또는 data URL)
- scene.json fixture (motion 필드 포함/미포함)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/frame-texture-pool.ts` | Create | FrameTexturePool 클래스 |
| `src/sketches/layered-psychedelic.ts` | Modify | LayerMesh 확장 + update() 분기 + dispose() |
| `src/main.ts` | Modify | __startCapture()에 preloadAll() await 추가 |
| `scripts/export-layered.ts` | Modify | __startCapture async 호환 확인 (기존 page.evaluate가 async 반환값 처리 가능 — Puppeteer 내장 지원) |

### 4.2 Implementation Steps (Green Phase)

1. FrameTexturePool 클래스 구현:
   - constructor(framesDir, frameCount)
   - getTexture(frameIndex): THREE.Texture (캐시 기반)
   - preloadAll(): Promise<void> (캡처 모드용)
   - dispose(): void
2. LayerMesh 인터페이스 확장: textureSource 필드
3. createLayeredPsychedelic(): motion 필드 감지 → FrameTexturePool 생성
4. update(): textureSource 타입에 따라 분기
5. main.ts __startCapture(): FrameTexturePool.preloadAll() await

### 4.3 Refactor Phase

- 프리뷰 모드 슬라이딩 윈도우 최적화 (±5 프레임 프리로드)

## 5. Edge Cases

- EC-1: 캡처 모드 메모리 ~1.8GB (§4.1.4)
- EC-2: frameIndex OOB → clamp (E6)
- EC-3: motion 없는 레이어 → 기존 경로 (E10)

## 6. Review Checklist

- [ ] Red/Green/Refactor 완료
- [ ] AC 전부 충족
- [ ] 기존 143 테스트 깨지지 않음
- [ ] layer.frag 변경 없음
