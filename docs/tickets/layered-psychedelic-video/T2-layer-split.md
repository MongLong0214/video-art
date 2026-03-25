# T2: 레이어 분해 모듈 (Step 1)

**Size**: M
**Priority**: P0
**Depends on**: T1
**AC**: AC1, AC9

## Description

Replicate API로 입력 이미지를 RGBA 레이어로 분해. Node.js CLI 스크립트로 실행.
입력 검증, 에러 핸들링(401/429/500/timeout), 수동 레이어 입력 폴백 포함.

## Tasks

1. `scripts/lib/image-layered.ts` 리팩토링 (T1에서 이동된 파일):
   - Node.js fs 기반 파일 입출력 (브라우저 API 제거)
   - 에러 핸들링: 401→"토큰 확인", 429→"rate limit 대기", 500→"서버 에러", timeout→재시도 1회
2. `scripts/lib/input-validator.ts`:
   - 파일 크기 ≤ 20MB (초과 시 reject)
   - 해상도 ≤ 4096x4096 (초과 시 sharp 리사이즈)
   - 포맷: PNG/JPG/WEBP (기타 reject)
   - CMYK → sRGB 자동 변환 (sharp)
3. 수동 레이어 입력 감지: `layers/` 폴더에 `layer-{N}.png` 존재 시 API 호출 건너뜀
   - 수동 레이어가 RGBA가 아닌 경우 자동 변환 (sharp ensureAlpha)
4. 레이어 저장: `layers/layer-{N}.png` (N=0이 배경)
5. CLI: `npm run pipeline:layers <input.png>` → `npx tsx scripts/pipeline-layers.ts`

## Verification

### 자동 테스트 (vitest)
- [ ] 유효한 PNG 입력 시 4개 이상 레이어 파일 생성 (mock API)
- [ ] 각 레이어 파일이 RGBA 채널 보유 (sharp metadata)
- [ ] 20MB 초과 파일 → reject 에러
- [ ] 4096x4096 초과 → 자동 리사이즈 후 처리
- [ ] CMYK JPG 입력 → sRGB 변환 후 처리
- [ ] WEBP 입력 → 정상 처리
- [ ] REPLICATE_API_TOKEN 미설정 → "토큰 확인" 에러
- [ ] API 401 응답 → "토큰 확인" 안내
- [ ] API 429 응답 → "rate limit" 안내
- [ ] `layers/` 폴더에 수동 PNG 존재 → API 미호출
- [ ] 수동 레이어 RGB → RGBA 자동 변환

## Files

- `scripts/lib/image-layered.ts` (수정)
- `scripts/lib/input-validator.ts` (생성)
- `scripts/pipeline-layers.ts` (생성)
