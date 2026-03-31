# PRD: Layer Pipeline Enterprise Overhaul

**Version**: 0.2
**Author**: Isaac + Claude
**Date**: 2026-03-31
**Status**: Done
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background

현재 layered pipeline은 SAM3 + VLM(Qwen3-VL) + DA V2 조합으로 이미지를 시맨틱 레이어로 분해하여 사이키델릭 영상을 생성한다. 기본 아키텍처는 동작하지만, 레이어 품질에 **3가지 구조적 결함**이 존재한다:

**실험 데이터** (golden-buddha 이미지, 9개 수동 프롬프트):
- SAM3 세그멘테이션 자체는 정상 (각 프롬프트별 커버리지 7-68%)
- `fillBackgroundPlate`에서 다른 레이어가 차지한 픽셀을 **투명으로 남겨둠** → 배경판에 부처 실루엣 구멍
- SAM3가 가려진 영역(occluded region)을 감지하지 못함 → 주황 원에 머리 모양 구멍
- 에지 품질이 바이너리(0/255)로 거칠음 → aliased boundaries

### 1.2 Problem Definition

레이어 분리 파이프라인의 3대 결함을 해결하여 엔터프라이즈급 품질을 달성한다:
1. **Background Plate Holes** — fillBackgroundPlate가 claimed 픽셀을 투명 처리
2. **SAM3 Occlusion Blindness** — 가려진 영역의 마스크 불완전
3. **Binary Edge Quality** — 안티앨리어싱 없는 거친 에지

부가적으로 config 스키마 정합성, CLI 안정성, 렌더링 이펙트 최적화를 포함한다.

### 1.3 Impact of Not Solving

- 레이어 PNG에 구멍 → 영상에서 빈 영역/깜빡임 발생 (상업화 불가)
- 거친 에지 → 레이어 경계가 눈에 띔 (아마추어 품질)
- config 불안정 → 파이프라인 실행 시 기본값 fallback (의도한 설정 무시)
- 수동 프롬프트 CLI 미작동 → 자동화 워크플로 불가

## 2. Goals & Non-Goals

### 2.1 Goals

- [x] G1: Background plate에 구멍 없는 완전한 이미지 보장
- [ ] G2: SAM3 마스크 후처리로 interior holes 제거 (morphological closing)
- [ ] G3: Alpha matting으로 소프트 에지 생성 (binary → gradient alpha)
- [ ] G4: 새 세그멘테이션 모델 도입 (GroundingDINO + SAM2 또는 Florence-2)으로 occlusion 문제 완화
- [ ] G5: Config 스키마와 getDefaultConfig 완전 동기화 (SAM3/VLM/depth cinematic 필드)
- [x] G6: `--prompts` CLI 정상 작동 (pipeline-cli.ts 수정 완료)
- [ ] G7: 렌더링 이펙트 파라미터 최적화 (depth parallax, haze, feather 활성화)
- [ ] G8: ffmpeg 인코딩 품질 최적화 (CRF, preset, pix_fmt 튜닝)
- [ ] G9: 전체 테스트 스위트 통과 + 새 기능 테스트 추가
- [ ] G10: E2E 파이프라인 단일 명령 실행 (`npm run pipeline` → 최종 mp4)

### 2.2 Non-Goals

- NG1: 실시간 프리뷰 렌더링 — 배치 파이프라인 유지
- NG2: 로컬 모델 실행 — API 기반 유지 (Replicate + 대안 API 검토)
- NG3: 오디오 싱크 — 이 PRD 범위 외
- NG4: Three.js 렌더러 아키텍처 변경 — 현재 z-stacking + alpha blending 유지
- NG5: SAM2 fallback 경로 복원 — SAM3 전용으로 확정

## 3. User Stories & Acceptance Criteria

### US-1: 구멍 없는 Background Plate

**As a** 파이프라인, **I want** background plate가 원본 이미지의 모든 픽셀을 포함, **so that** 어떤 레이어 조합에서도 빈 영역이 발생하지 않는다.

**Acceptance Criteria:**
- [ ] AC-1.1: `fillBackgroundPlate`가 claimed 픽셀도 원본 이미지에서 채움 (투명 영역 0%)
- [ ] AC-1.2: bg-plate-filled.png의 alpha 채널이 모든 픽셀에서 255 (완전 불투명)
- [ ] AC-1.3: 기존 `claimedMask` 기반 투명화 로직 제거
- [ ] AC-1.4: uniqueCoverage 계산은 기존 exclusive ownership 유지 (retention 판단용)
- [ ] AC-1.5: 테스트: 5x5 synthetic 이미지에서 bg-plate 출력의 alpha === 255 전체 확인
- [ ] AC-1.6: 렌더러 검증: bg-plate(fully opaque) 위에 레이어 z-stack 시 double-pixel 아티팩트 없음 (alpha blending이 정상 동작)

### US-2: SAM3 마스크 Morphological 후처리

**As a** 파이프라인, **I want** SAM3 마스크의 interior holes를 morphological closing으로 메움, **so that** 단일 객체 내부에 구멍이 없다.

**Acceptance Criteria:**
- [ ] AC-2.1: 각 SAM3 마스크에 Gaussian blur 기반 hole-filling 적용 (blur → threshold → AND with dilated original)
- [ ] AC-2.2: blur sigma는 이미지 장변의 1% (최소 3px, 최대 15px)
- [ ] AC-2.3: hole-filling 후 원본 바이너리 마스크를 dilate(blur+threshold)한 범위를 초과하지 않음
- [ ] AC-2.4: sharp `.blur()` + `.threshold()` 기반 구현 (외부 dependency 없음, opencv-wasm 불필요)
- [ ] AC-2.5: 테스트: 도넛 모양 마스크 → closing 후 내부 구멍 제거 확인
- [ ] AC-2.6: config에 `morphCloseEnabled: boolean` (default: true) + `morphCloseKernelScale: number` (default: 0.01)

### US-3: Alpha Matting (Soft Edges)

**As a** 파이프라인, **I want** 레이어 에지가 gradient alpha로 부드럽게 페이드, **so that** 레이어 경계가 자연스럽다.

**Acceptance Criteria:**
- [ ] AC-3.1: 마스크 에지에 Gaussian blur 적용하여 alpha gradient 생성
- [ ] AC-3.2: blur radius는 이미지 장변의 0.3% (최소 1px, 최대 8px)
- [ ] AC-3.3: alpha matting은 morphological closing 이후 적용
- [ ] AC-3.4: background plate는 alpha matting 미적용 (항상 alpha=255)
- [ ] AC-3.5: 테스트: 100x100 사각형 마스크에서 에지 3px 내 alpha gradient 확인
- [ ] AC-3.6: config에 `alphaMatteEnabled: boolean` (default: true) + `alphaMatteRadiusScale: number` (default: 0.003)

### US-4: 멀티모델 세그멘테이션 파이프라인

**As a** 파이프라인, **I want** SAM3 외에 fal.ai SAM3/EVF-SAM, GroundingDINO+SAM2를 사용 가능, **so that** API provider와 세그멘테이션 모델을 선택할 수 있다.

**Research Findings (2025-2026 SOTA):**
- **GroundingDINO**: 텍스트→bbox 탐지 전문 (Replicate `adirik/grounding-dino`, <1s, <$0.001)
- **SAM 2.1**: Meta 공식 (Replicate `meta/sam-2`), bbox 입력 시 고품질 마스크
- **EVF-SAM (fal.ai)**: End-to-end text-prompted SAM. 프롬프트 이해도 SAM3보다 우수
- **fal.ai SAM3**: 동일 모델, 더 빠르고 저렴 ($0.005/req, near-zero cold start)
- **ZIM (ICCV 2025)**: alpha matte 출력. hosted API 부재 → **후속 PRD로 분리** (Modal/로컬 배포 필요)

**Acceptance Criteria:**
- [ ] AC-4.1: `segmentationModel` config: `"sam3"` (default) | `"grounded-sam2"` | `"evf-sam"`
- [ ] AC-4.2: `apiProvider` config: `"replicate"` (default) | `"fal"` — fal.ai SAM3 + EVF-SAM 지원
- [ ] AC-4.3: GroundingDINO+SAM2 경로: 텍스트 → bbox (Replicate `adirik/grounding-dino`) → mask (Replicate `meta/sam-2`)
- [ ] AC-4.4: fal.ai 경로: fal.ai SAM3 (`fal-ai/sam-3/image`) 또는 EVF-SAM (`fal-ai/evf-sam`)
- [ ] AC-4.5: 각 모델의 model ID + version hash를 상수로 관리
- [ ] AC-4.6: 모델 실패 시 fal.ai SAM3 → Replicate SAM3 순서로 fallback (provider별 timeout 5s)
- [ ] AC-4.7: `validateProviderUrl()` 함수: provider별 trusted domain whitelist (`*.fal.run`, `*.replicate.delivery`, `*.replicate.com`)
- [ ] AC-4.8: 테스트: mock API 응답으로 각 모델 경로 + fallback 검증

### US-5: Config 스키마 완전 동기화

**As a** 개발자, **I want** ResearchConfigSchema와 getDefaultConfig가 완전히 일치, **so that** config 파싱이 항상 성공하고 모든 필드에 기대값이 설정된다.

**Acceptance Criteria:**
- [ ] AC-5.1: 스키마에 정의된 모든 필드가 getDefaultConfig에 포함
- [ ] AC-5.2: getDefaultConfig의 모든 값이 스키마 제약조건(min/max) 충족
- [ ] AC-5.3: SAM3/VLM axes, Depth Cinematic axes, Morphological/Alpha Matte axes 포함
- [ ] AC-5.4: `loadConfig` 실패 시 에러 메시지에 누락/위반 필드 명시
- [ ] AC-5.5: 테스트: getDefaultConfig() 결과를 ResearchConfigSchema.parse()로 재검증 (round-trip)
- [ ] AC-5.6: 테스트: 스키마 필드 목록 === getDefaultConfig 키 목록 (완전 일치)

### US-6: 렌더링 이펙트 최적화

**As a** 파이프라인, **I want** depth-based parallax, haze, feather가 기본 활성화, **so that** 영상에 입체감과 대기 효과가 자동 적용된다.

**Acceptance Criteria:**
- [ ] AC-6.1: scene-generator가 depth 데이터 기반으로 parallax/haze/feather 자동 계산
- [ ] AC-6.2: parallax scale: background layers 강하게, subject layers 약하게
- [ ] AC-6.3: haze intensity: 먼 레이어일수록 채도 감소
- [ ] AC-6.4: feather radius: foreground-occluder에만 적용 (에지 비네팅)
- [ ] AC-6.5: config multiplier로 각 이펙트 강도 조절 가능
- [ ] AC-6.6: 기존 scene.json 스키마 호환 (새 필드 없음, 기존 optional 필드 활용)

### US-7: Export 품질 최적화

**As a** 사용자, **I want** 출력 영상이 최고 품질로 인코딩, **so that** 유튜브/인스타 업로드 시 화질 저하가 최소화된다.

**Acceptance Criteria:**
- [ ] AC-7.1: 기본 ffmpeg 설정: CRF 15, preset veryslow, pix_fmt yuv444p
- [ ] AC-7.2: 60fps 옵션 지원 (scene.json fps 필드 + RESEARCH_FPS env)
- [ ] AC-7.3: ProRes 4444 출력 옵션 (alpha 채널 보존)
- [ ] AC-7.4: 출력 파일 크기 로깅 + 비트레이트 보고

## 4. Technical Design

### 4.1 Architecture Overview

```
Input Image
    │
    ├─► VLM (Qwen3-VL) ──► Text Prompts (4-10)
    │                           │
    ├─► DA V2 ──► Depth Map     │
    │                           │
    │   ┌───────────────────────┘
    │   │
    ▼   ▼
SAM3 (Replicate/fal.ai) / GroundingDINO+SAM2 (Replicate) / EVF-SAM (fal.ai)
    │
    ▼
Raw Masks (binary, per-prompt)
    │
    ├─► Morphological Closing (fill interior holes)
    ├─► Alpha Matting (soft edges)
    │
    ▼
Processed RGBA Layers
    │
    ├─► Exclusive Ownership (uniqueCoverage calculation only)
    ├─► Role Assignment (depth + heuristics)
    ├─► Retention Rules (progressive relaxation)
    ├─► Background Plate Fill (FULL original, no holes)
    │
    ▼
scene.json + Layer PNGs
    │
    ├─► Depth Cinematic Effects (parallax, haze, feather)
    ├─► Three.js Rendering (z-stack + alpha blend)
    ├─► Post-Processing (bloom + chromatic aberration)
    │
    ▼
Puppeteer Frame Capture → ffmpeg H.264/ProRes → MP4
```

### 4.2 Data Model Changes

**ResearchConfigSchema 추가 필드:**

```typescript
// ── Mask Post-Processing ──
morphCloseEnabled: z.boolean().default(true),
morphCloseKernelScale: z.number().min(0.001).max(0.05).default(0.01),
alphaMatteEnabled: z.boolean().default(true),
alphaMatteRadiusScale: z.number().min(0.001).max(0.02).default(0.003),

// ── Model Selection ──
segmentationModel: z.enum(["sam3", "grounded-sam2", "evf-sam"]).default("sam3"),
apiProvider: z.enum(["replicate", "fal"]).default("replicate"),
```

**LayerCandidate 확장 없음** — 기존 필드로 충분.

### 4.3 API Design

CLI 변경:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--prompts` | string | (VLM auto) | 콤마 분리 수동 프롬프트 |
| `--model` | string | sam3 | 세그멘테이션 모델 선택 |
| `--no-morph` | boolean | false | morphological closing 비활성화 |
| `--no-matte` | boolean | false | alpha matting 비활성화 |
| `--fps` | number | 30 | 출력 프레임레이트 |
| `--prores` | boolean | false | ProRes 4444 출력 |

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| BG plate 구멍 해결 | (A) claimed 픽셀도 원본으로 채움 (B) exclusive ownership 제거 | A | 최소 변경, uniqueCoverage 보존 |
| Morphological closing | (A) sharp convolve (B) canvas 2D (C) OpenCV.js | A (sharp) | 이미 dependency, 추가 설치 불필요 |
| Alpha matting | (A) Gaussian blur on mask (B) distance transform (C) ViTMatte 모델 | A | 단순하고 빠름, 대부분 케이스 충분 |
| 멀티모델 | (A) SAM3 only (B) +GroundedSAM2 (C) +EVF-SAM (D) +GroundedZIM | B+C (hosted only) | ZIM은 hosted API 부재로 후속 PRD 분리. GroundingDINO bbox가 occlusion 완화 |
| API provider | (A) Replicate only (B) +fal.ai (C) +Modal | B | fal.ai: 더 빠르고 저렴. Modal은 ZIM과 함께 후속 PRD |
| Export codec | (A) H.264 only (B) +ProRes (C) +VP9 | B | ProRes는 편집용, H.264는 배포용 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | SAM3 모든 프롬프트에서 empty mask | VLM fallback 프롬프트 재생성 → 2차 시도 | P1 |
| E2 | Morphological closing이 마스크를 과도하게 확장 | convex hull intersection으로 제한 | P2 |
| E3 | Alpha matting으로 레이어 간 블리딩 | bg-plate 제외, blur radius 상한 제한 | P2 |
| E4 | GroundingDINO bbox가 전체 이미지 | bbox coverage > 90%이면 skip | P2 |
| E5 | Config 파싱 실패 | 에러 로그 + getDefaultConfig fallback | P2 |
| E6 | Replicate API rate limit | exponential backoff (1s→3s→9s) 이미 구현됨 | P3 |
| E7 | 입력 이미지 > 20MB | DA V2 자동 다운샘플 이미 구현됨 | P3 |
| E8 | ffmpeg 미설치 | 시작 시 which ffmpeg 체크 → 에러 메시지 | P1 |

## 6. Security & Permissions

### 6.1 Authentication
- Replicate API Token: `.env` 파일의 `REPLICATE_API_TOKEN` (기 구현)
- fal.ai API Key: `.env` 파일의 `FAL_KEY` (신규)
- 토큰 마스킹: 각 provider별 prefix 감지하여 `***` 처리 (`r8_***`, `fal_***`)
- `.env.example` 업데이트: 모든 provider 키 템플릿 포함
- `getToken(provider)` 유틸: provider별 env var 조회 + 미설정 시 명확한 에러 메시지

### 6.2 Authorization
N/A — 로컬 CLI 도구, 사용자 인증 없음

### 6.3 Data Protection
- 입력 이미지를 base64 data URI로 API 전송 (HTTPS)
- API 응답 URL 검증: `*.replicate.delivery` / `*.replicate.com` 만 허용 (SSRF 방어, 기 구현)
- 출력 파일은 로컬 `out/` 디렉토리에만 저장

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| E2E pipeline 시간 (decomposition + export) | < 5분 (1080p, 20s, 30fps) | console.time |
| SAM3 per-prompt latency | < 15s | API 응답 시간 로깅 |
| 프레임 캡처 속도 | > 15 fps | frames/elapsed time |
| ffmpeg 인코딩 | < 60s (600 frames) | ffmpeg stderr |
| 출력 파일 크기 | < 200MB (1080p 20s) | fs.stat |

### 7.1 Monitoring & Alerting
- 각 파이프라인 스텝 시간 측정 (console.log)
- API 호출 횟수 + 비용 추정 ($0.001/call 기준)
- decomposition-manifest.json에 전체 메타데이터 아카이브

## 8. Testing Strategy

### 8.1 Unit Tests
- `fillBackgroundPlate`: alpha=255 전체 확인 (synthetic 5x5)
- `morphologicalClose`: 도넛 마스크 → 채워진 마스크
- `alphaMatting`: 에지 gradient 확인
- `parseCliArgs`: --prompts, --model, --no-morph 파싱
- `ResearchConfigSchema`: round-trip validation
- `loadConfig`: 누락 필드 에러 메시지

### 8.2 Integration Tests
- E2E: synthetic 이미지 → pipeline-layers → scene.json + layers 생성
- 각 세그멘테이션 모델 경로 (mock API)
- config 변경 → scene.json 반영 확인

### 8.3 Edge Case Tests
- E1-E8 시나리오 테스트
- 0% coverage 마스크 → graceful skip
- 100% coverage 마스크 → bg-plate 할당

## 9. Rollout Plan

### 9.0 Implementation Waves (리뷰 반영)

```
Wave 1 (병렬, hosted API only):
  US-1 (bg-plate fix) + US-5 (config sync) + US-6 (렌더링) + US-7 (export)

Wave 2 (순차):
  US-2 (mask hole-filling via blur) → US-3 (alpha matting)

Wave 3 (순차):
  US-4 (멀티모델: fal.ai + GroundingDINO+SAM2, hosted API only)

후속 PRD (별도):
  ZIM alpha matting (Modal/로컬 배포), 로컬 추론 파이프라인
```

### 9.1 Migration Strategy
- 기존 `out/layered/` 아카이브와 호환 (scene.json v1 유지)
- SAM2 코드 경로는 이미 제거됨 (df6ad60)
- config 스키마 확장은 하위 호환 (새 필드에 default 있음)

### 9.2 Feature Flag
- `morphCloseEnabled`, `alphaMatteEnabled`로 개별 on/off
- `segmentationModel`로 모델 선택
- 기존 동작 재현: morph=false, matte=false, model=sam3

### 9.3 Rollback Plan
- `git revert` → SAM3-only 파이프라인으로 복귀
- config default가 기존 동작과 동일하므로 설정 변경만으로도 복귀 가능

## 10. Dependencies & Risks

### 10.1 Dependencies

| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| Replicate API | External | Active | 모든 세그멘테이션 중단 |
| SAM3 model (mattsays/sam3-image) | Community | Active | 기본 모델 사용 불가 |
| GroundingDINO on Replicate | Community | TBD | AC-4.2 지연 |
| Florence-2 on Replicate | Community | TBD | AC-4.3 지연 |
| sharp (Node.js) | npm | v0.33+ | morphological ops 지원 확인 필요 |
| Puppeteer | npm | Active | export 중단 |
| ffmpeg | System | Required | export 불가 |

### 10.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GroundingDINO Replicate 모델 미존재 | Medium | 대안 모델 선택 필요 | fal.ai, HuggingFace API 대안 |
| Morphological closing으로 마스크 왜곡 | Low | 마스크 품질 저하 | convex hull clamp + config disable |
| Alpha matting 블리딩 | Low | 레이어 간 간섭 | radius 상한 + bg-plate 제외 |
| sharp convolve 성능 (4K 이미지) | Low | 파이프라인 느림 | 1080p 다운샘플 후 처리 |
| Replicate API 비용 증가 | Medium | 멀티모델 → 호출 수 증가 | 비용 추정 로깅 + budget cap |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| Background plate 구멍 | 있음 (alpha=0 영역) | 없음 (alpha=255 전체) | pixel 검사 |
| Interior mask holes | 5-15% (SAM3 raw) | < 1% (post-morph) | hole pixel ratio |
| Edge quality | Binary (0/255) | Gradient (8px transition) | edge alpha histogram |
| Config parse 성공률 | ~50% (스키마 불일치) | 100% | loadConfig 에러 없음 |
| E2E 안정성 | 수동 개입 필요 | 단일 명령 완료 | exit code 0 |
| 영상 품질 (주관) | 구멍/에지 visible | 상업 품질 | Isaac 리뷰 |

## 12. Open Questions

- [x] OQ-1: GroundingDINO Replicate 존재? → **YES**: `adirik/grounding-dino` (<$0.001, <1s)
- [x] OQ-2: SAM 2.1 Replicate 존재? → **YES**: `meta/sam-2` (공식 Meta 모델)
- [x] OQ-3: ZIM alpha matting 사용 가능? → **YES**: `naver-iv/zim-anything-vitb` (HuggingFace, 로컬 또는 Modal 배포)
- [x] OQ-4: fal.ai 이점? → **YES**: SAM3 $0.005/req, near-zero cold start, EVF-SAM도 지원
- [ ] OQ-5: sharp convolve로 morphological closing 가능한가? → opencv-wasm 대안 검토 필요
- [ ] OQ-6: ProRes 4444 파일 크기 → 20s 1080p 테스트 필요
- [ ] OQ-7: ZIM 로컬 추론 (Apple Silicon M2 Pro) 성능 → Python subprocess 방식 테스트 필요

---
