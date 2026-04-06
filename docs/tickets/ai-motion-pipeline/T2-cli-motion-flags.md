# T2: CLI에 motion 플래그 추가

**PRD Ref**: PRD-ai-motion-pipeline > US-1, US-2, US-3
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

pipeline-cli.ts의 PipelineCliArgs에 motion 관련 플래그(--motion, --motion-model, --motion-intensity, --skip-flow)를 추가하고, publish.ts에서 파싱하여 pipeline-pro.ts로 전달.

## 2. Acceptance Criteria

- [ ] AC-1: `--motion` 플래그 파싱 (boolean, default false)
- [ ] AC-2: `--motion-model` 파싱 (wan-2.2 | veo-3.1 | seedance, default wan-2.2)
- [ ] AC-3: `--motion-intensity` 파싱 (low | medium | high, default medium)
- [ ] AC-4: `--skip-flow` 파싱 (boolean, default false)
- [ ] AC-5: --motion 없이 기존 동작 불변
- [ ] AC-6: --motion + --duration 동시 사용 시 duration 무시 + 경고 (E11)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `parses --motion flag` | Unit | `['--motion']` | motion=true |
| 2 | `defaults motion to false` | Unit | `[]` | motion=false |
| 3 | `parses --motion-model` | Unit | `['--motion-model', 'veo-3.1']` | motionModel='veo-3.1' |
| 4 | `rejects invalid motion model` | Unit | `['--motion-model', 'invalid']` | 에러 또는 default |
| 5 | `parses --motion-intensity` | Unit | `['--motion-intensity', 'low']` | motionIntensity='low' |
| 6 | `parses --skip-flow` | Unit | `['--skip-flow']` | skipFlow=true |
| 7 | `motion + duration warns` | Unit | `['--motion', '--duration', '30']` | 경고 + duration 무시 |

### 3.2 Test File Location

- `scripts/lib/__tests__/pipeline-cli.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required

- 없음. 순수 argv 파싱 테스트.

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/pipeline-cli.ts` | Modify | PipelineCliArgs에 motion 필드 추가 + 파싱 |
| `scripts/publish.ts` | Modify | motion 플래그를 pipeline-pro.ts 호출 시 전달 |

### 4.2 Implementation Steps (Green Phase)

1. PipelineCliArgs 인터페이스에 motion, motionModel, motionIntensity, skipFlow 추���
2. parseCliArgs()에 파싱 로직 추가
3. publish.ts의 proArgs 배열에 --motion, --motion-model, --motion-intensity, --skip-flow 조건부 추가 (기존 --duration 패턴 ��일)

## 5. Edge Cases

- EC-1: --motion 없이 기존 동작 (E10)
- EC-2: --motion + --duration 충돌 (E11)

## 6. Review Checklist

- [ ] Red/Green/Refactor 완료
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
