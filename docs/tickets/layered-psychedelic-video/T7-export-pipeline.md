# T7: 영상 출력 파이프라인 (Step 4) + CLI 통합

**Size**: L
**Priority**: P0
**Depends on**: T6
**AC**: AC7, AC8

## Description

Puppeteer headless Chrome으로 프레임 단위 캡처 → ffmpeg H.264 mp4.
CLI 통합으로 전체 파이프라인 1회 실행.

## Tasks

1. `scripts/capture-frames.ts` — Frame-by-frame 캡처:
   - Vite dev 서버 자동 기동 (child_process, 포트 감지)
   - 서버 ready 대기: `page.goto()` 성공까지 retry
   - Puppeteer headless Chrome 페이지 로드 (1080x1080 viewport)
   - `preserveDrawingBuffer: true` 확인 (기존 renderer.ts에 이미 설정됨)
   - Recording mode 진입: `page.evaluate(() => window.startFrameCapture())`
   - 매 프레임: `page.evaluate` → `renderer.render()` + `gl.readPixels()` → base64 → Node에서 PNG 저장
   - 600 프레임(20s × 30fps), 프로그레스 바 표시
   - 디스크 공간 체크: 예상 ~2.4GB 필요 (600 × ~4MB)
   - Vite 서버 종료
2. 브라우저↔Node 통신 프로토콜:
   - `window.startFrameCapture()`: Clock을 recording mode(dt=1/30s)로 전환
   - `window.captureFrame()`: 1프레임 렌더 → readPixels → base64 반환
   - `page.evaluate(() => window.captureFrame())` per frame
3. `scripts/encode-video.ts` — ffmpeg 변환:
   - `ffmpeg -framerate 30 -i frame-%04d.png -c:v libx264 -pix_fmt yuv420p -b:v 15M output.mp4`
   - 출력: `output/{input-name}-{timestamp}.mp4`
4. 프레임 폴더 정리: 기본 삭제, `--keep-frames` 플래그로 보존
5. `scripts/pipeline.ts` — 전체 CLI 통합:
   - `npm run pipeline <input.png>`: Step 1→4 전체
   - `npm run pipeline:layers <input.png>`: Step 1+2
   - `npm run pipeline:preview`: `npm run dev` (Vite)
   - `npm run pipeline:export`: Step 4만
6. 기존 `Recorder` 클래스는 브라우저 미리보기용으로 유지 (R키 빠른 테스트용)

## Verification

### 자동 테스트 (vitest)
- [ ] ffmpeg 존재 확인 유틸 동작
- [ ] 출력 파일명에 타임스탬프 포함

### 스크립트 검증
- [ ] 출력 mp4: 1080x1080 (ffprobe width/height)
- [ ] 출력 mp4: 30fps (ffprobe r_frame_rate)
- [ ] 출력 mp4: H.264 (ffprobe codec_name)
- [ ] 출력 mp4: 10Mbps+ (ffprobe bit_rate)
- [ ] `--keep-frames` 없을 시 프레임 폴더 삭제
- [ ] `--keep-frames` 시 프레임 폴더 보존
- [ ] `npm run pipeline <input.png>` 1회 실행으로 mp4 출력

## Files

- `scripts/capture-frames.ts` (생성)
- `scripts/encode-video.ts` (생성)
- `scripts/pipeline.ts` (생성)
- `src/lib/frame-capture-api.ts` (생성 — 브라우저 측 window.captureFrame)
- `package.json` (수정 — scripts 추가)
