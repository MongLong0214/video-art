# T0: PoC Validation — JC-303 + Pedalboard + Replicate LLM

**Size**: S
**Depends**: none
**Milestone**: M0
**AC**: AC-5.1, AC-4.1

## Goal
M0 gate. 3가지 핵심 의존성이 실제로 동작하는지 검증. 실패 시 파이프라인 설계 변경 필요.

## PoC 항목

### PoC-1: pedalboard + JC-303 VST3 MIDI→WAV
- JC-303 VST3 설치 (GitHub releases → ~/Library/Audio/Plug-Ins/VST3/)
- macOS quarantine 해제
- Python pedalboard로 VST3 로드
- MIDI note (G2, 0.5s) 전송 → WAV 렌더
- 출력 WAV에 소리가 있는지 확인 (RMS > -60dBFS)

### PoC-2: JC-303 파라미터 제어
- cutoff, resonance, envMod, accent 파라미터 접근 가능한지 확인
- 파라미터 변경 시 소리가 변하는지 확인

### PoC-3: Replicate LLM 구조화 출력
- meta/llama-4-maverick (또는 동급) 호출
- 303/909 매핑 프롬프트 + 샘플 analysis.json → JSON 응답
- 응답이 파싱 가능한 유효 JSON인지 확인

### PoC-4: JC-303 재현성 (reproducibility)
- 동일 MIDI 입력 + 동일 파라미터로 2회 렌더
- 두 WAV 출력이 bit-identical 또는 RMS 차이 < 0.01dBFS

## 성공 기준
- PoC-1,2 통과 → JC-303 경로 확정
- PoC-1,2 실패 → SC tb303 fallback 결정 (Isaac 에스컬레이션)
- PoC-3 통과 → Replicate LLM 확정
- PoC-3 실패 → 규칙 기반 매핑 fallback

## TDD Spec
- `scripts/lib/acid/poc.test.ts`
  - test: "pedalboard loads JC-303 VST3" — Python subprocess 실행, exit 0
  - test: "JC-303 renders MIDI to audible WAV" — 출력 파일 존재 + size > 1KB
  - test: "Replicate LLM returns valid JSON" — JSON.parse 성공 + 필수 키 존재
  - test: "JC-303 renders are reproducible" — 동일 입력 2회 → RMS 차이 < 0.01dBFS
