# Pipeline Status: GroundingDINO + SAM2 세그멘테이션 경로

**PRD**: docs/prd/PRD-grounded-sam2-pipeline.md
**Size**: L
**Current Phase**: 5 (TDD 개발)

## Tickets

| Ticket | Title | Wave | Size | Status | Review | Depends | Notes |
|--------|-------|------|------|--------|--------|---------|-------|
| T1 | GroundingDINO bbox 검출 | 1 | M | Todo | - | None | DINO_VERSION 핀 포함 |
| T2 | SAM2 bbox → mask | 1 | M | Todo | - | None | meta/sam-2 version 핀 |
| T3 | 파이프라인 디스패치 + buildCandidate 확장 | 2 | L | Todo | - | T1, T2 | 오케스트레이터 + manifest |

## Wave 구조

```
Wave 1 (병렬): T1 + T2
Wave 2 (순차): T3 (T1+T2 의존)
```

## 주요 기술 결정

- VLM 자동 프롬프트 폐기 → 사용자 수동 프롬프트 (--prompts) 필수
- GroundingDINO bbox: pixel 정수 xyxy (cog 소스 확인)
- SAM2: meta/sam-2 (bbox 입력 지원), lucataco 아님 (자동 마스크 전용)
- per-prompt SAM2 병렬화 (max 4 concurrent)
- maxTotalSam2Calls=12 비용 상한
