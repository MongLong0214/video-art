# T1: 환경 설정 + 프로젝트 구조

**Size**: M
**Priority**: P0
**Depends on**: -
**AC**: AC10

## Description

API 토큰 하드코딩 제거, `.env` 기반 관리 전환, 신규 의존성 설치, Node/Browser 코드 분리 구조 확립.

## Tasks

1. `.env` 파일 생성 (`REPLICATE_API_TOKEN=...`) + `.env.example` 생성
2. `.gitignore`에 `.env`, `output/`, `layers/` 추가
3. npm 의존성 설치: `sharp`, `postprocessing`, `puppeteer`
4. vitest 설치 + 설정 (Node 로직 테스트용)
5. **프로젝트 구조 분리**:
   - `scripts/` — Node.js CLI 스크립트 (replicate, sharp, ffmpeg 호출)
   - `src/` — 브라우저 전용 (Three.js, shaders, sketches)
   - `scripts/tsconfig.json` — Node 전용 tsconfig (module: NodeNext)
6. `src/lib/image-layered.ts` → `scripts/lib/image-layered.ts`로 이동 + 토큰을 `process.env.REPLICATE_API_TOKEN`으로 전환
7. ffmpeg 설치 확인 유틸: `scripts/lib/check-deps.ts`
8. `tsx` 설치 (scripts 실행용)

## Verification

### 자동 테스트 (vitest)
- [ ] `scripts/lib/image-layered.ts`에 하드코딩 토큰 없음 (grep)
- [ ] `REPLICATE_API_TOKEN` 미설정 시 명확한 에러 throw
- [ ] ffmpeg 미설치 시 에러 메시지

### 수동 확인
- [ ] `npm run dev` (Vite) 정상 기동 — Node 모듈 번들 충돌 없음
- [ ] `npx tsx scripts/...` 정상 실행

## Files

- `scripts/lib/image-layered.ts` (이동+수정)
- `scripts/lib/check-deps.ts` (생성)
- `scripts/tsconfig.json` (생성)
- `.env` + `.env.example` (생성)
- `.gitignore` (수정)
- `package.json` (수정)
- `vitest.config.ts` (생성)
