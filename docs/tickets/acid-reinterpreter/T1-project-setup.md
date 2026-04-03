# T1: Project Setup — 909 Samples + Dependencies + File Structure

**Size**: S
**Depends**: T0 (PoC 통과 확인)
**Milestone**: M1
**AC**: AC-6.1, AC-2.4

## Goal
프로젝트 기반 구조 세팅. 909 무료 샘플 확보, Python 의존성, 파일 구조 생성.

## Tasks

### 909 샘플 확보
- Drumkito TR-909 무료 샘플팩 다운로드
- `audio/samples/909/` 디렉토리에 배치: kick.wav, snare.wav, hat-closed.wav, hat-open.wav, clap.wav, ride.wav
- 각 샘플 WAV 검증 (존재 + RMS > -60dBFS)

### 파일 구조 생성
```
scripts/lib/acid/
  separate.ts
  analyze.py
  interpret.ts
  render.py
  master.py
  schemas.ts
  prompt.ts
```

### 의존성
- `.env.example`에 `REPLICATE_API_TOKEN=` 추가
- `.gitignore`에 `.env` 확인
- `@anthropic-ai/sdk` 제거 확인 (필요 없음)

## TDD Spec
- `scripts/lib/acid/setup.test.ts`
  - test: "909 samples exist and are audible" — 6개 파일 존재 + size > 1KB
  - test: "REPLICATE_API_TOKEN env is checked" — 미설정 시 명확한 에러 메시지
  - test: "acid directory structure exists" — 필수 파일 경로 존재
