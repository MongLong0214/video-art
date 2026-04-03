# T5: Step 3 — LLM Interpretation (Replicate)

**Size**: M
**Depends**: T4
**Milestone**: M2
**AC**: AC-4.1 ~ AC-4.6

## Goal
analysis.json → Replicate LLM → interpretation.json. 303/909 문법으로 음악적 재해석.

## Implementation

### `scripts/lib/acid/prompt.ts`
장르 특화 시스템 프롬프트:
- 303 아티큘레이션 규칙 (accent: velocity > 0.8, slide: 연속 노트 간 피치 차이 > 2 semitone, cutoff range 200-2000)
- 909 패턴 규칙 (kick: 4-on-floor 기본, hat: 16th 기본, snare: backbeat)
- 에너지 커브 → filter/velocity 오토메이션 매핑 규칙
- 구체적 입출력 예시 1개 포함 (few-shot)
- "반드시 유효한 JSON만 출력" 지침

### `scripts/lib/acid/interpret.ts`

#### 입력
- `analysisPath: string` — analysis.json 경로
- `outPath: string` — interpretation.json 출력 경로

#### 로직
1. analysis.json 로드 + Zod 검증
2. 프롬프트 조립 (system + analysis data)
3. Replicate API 호출 (meta/llama-4-maverick, temperature=0.3, max_tokens=4096)
4. 응답 JSON 파싱
5. Zod interpretationSchema 검증
6. 실패 시 에러 메시지 포함하여 1회 재시도
7. 2회 실패 → abort
8. 성공 → interpretation.json 저장

#### 에러 처리
- Zod 검증 실패 → 에러 내용을 재시도 프롬프트에 추가
- API 타임아웃 (60초) → 1회 재시도
- 2회 연속 실패 → Error throw

## TDD Spec
- `scripts/lib/acid/interpret.test.ts`
  - test: "builds prompt with analysis data" — 프롬프트에 bpm/key/drums/bass 포함
  - test: "calls Replicate with correct params" — mock API, model/temperature/max_tokens 검증
  - test: "parses valid LLM response" — mock 유효 JSON → interpretation.json 생성
  - test: "retries on Zod validation failure" — 첫 응답 잘못됨 → 두 번째 성공
  - test: "aborts after 2 failures" — 두 번 Zod 실패 → Error
  - test: "interpretation has all required tracks" — bass_303, riff_303, kick_909, hat_909, snare_909 존재
