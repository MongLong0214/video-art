# T2: Step 1 — Demucs Stem Separation via Replicate

**Size**: M
**Depends**: T1
**Milestone**: M1
**AC**: AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5

## Goal
Replicate API로 Demucs v4 실행. 입력 WAV → drums/bass/other 3-stem 분리.

## Implementation: `scripts/lib/acid/separate.ts`

### 입력
- `inputPath: string` — WAV/FLAC/MP3 파일 경로
- `outDir: string` — stems 출력 디렉토리

### 출력
- `stems/drums.wav`, `stems/bass.wav`, `stems/other.wav`
- vocals.wav는 다운로드 후 삭제

### 로직
1. `REPLICATE_API_TOKEN` 확인
2. Replicate `cjwbw/demucs` 모델 호출 (htdemucs)
3. 타임아웃 300초
4. 실패 시 1회 재시도
5. 결과 URL에서 각 stem 다운로드 → 로컬 저장
6. 파일 경로 안전: `path.resolve()` 사용

### 에러 처리
- API 토큰 없음 → `Error: REPLICATE_API_TOKEN not set`
- 타임아웃 → 1회 재시도 → abort
- 네트워크 오류 → 1회 재시도 → abort

## TDD Spec
- `scripts/lib/acid/separate.test.ts`
  - test: "throws when REPLICATE_API_TOKEN missing" — env 미설정 시 에러
  - test: "calls Demucs model with correct input" — mock Replicate, 호출 파라미터 검증
  - test: "downloads and saves 3 stems" — mock 응답 → drums/bass/other 파일 생성
  - test: "retries once on failure" — 첫 호출 실패 → 두 번째 성공 → 정상 완료
  - test: "aborts after 2 failures" — 두 번 실패 → 에러 throw
  - test: "discards vocals stem" — vocals.wav 존재하지 않음
