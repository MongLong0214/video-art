# T13: SKILL.md v3 워크플로우 통합

**PRD Ref**: PRD-video-blueprint-v3 > 전체 (최종 스킬 문서)
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T12

---

## 1. Objective

video-blueprint 스킬의 SKILL.md를 v3 워크플로우로 전면 재작성한다. Phase A~F 파이프라인, 신규 스크립트 사용법, Claude 시각적 검증 절차, hybrid 코드 생성 가이드를 통합.

## 2. Acceptance Criteria
- [ ] AC-1: SKILL.md description에 v3 기능 반영 (레이어 분리, 줌 감지, 코드 생성, 검증)
- [ ] AC-2: Phase A~F 워크플로우가 순서대로 기술 (A: 추출, B: 분석, C: 검증, D: 조립, E: 코드생성, F: 검증)
- [ ] AC-3: Phase B에서 analyze-layers.py 사용법 + colors.json 의존순서 명시
- [ ] AC-4: Phase C는 Claude 수동 단계임을 명시. 자동화 대상 아님. SKILL.md Phase C에서 Claude가 수행하는 구체적 절차(입력 파일 읽기 → 시각적 비교 → layers.json 수동 수정) 기술
- [ ] AC-5: Phase E에서 hybrid 코드 생성 절차 (Step 1: Jinja2 뼈대, Step 2: Claude 레이어 본문)
- [ ] AC-6: Phase F에서 verify-output.py 사용법 + SSIM 임계값 명시
- [ ] AC-7: references/output-schema.md가 v3 스키마 반영
- [ ] AC-8: references/analysis-workflow.md 업데이트 (레이어 분석 절차)
- [ ] AC-9: references/shader-patterns.md 포함 (T9에서 생성)
- [ ] AC-10: pip install 원라이너 업데이트 (v3 전체 의존성)
- [ ] AC-11: Anti-patterns 테이블 업데이트

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_skill_md_has_all_phases` | Unit | SKILL.md에 Phase A~F 섹션 존재 | 6개 Phase 헤더 |
| 2 | `test_skill_md_references_exist` | Unit | 참조된 references 파일이 모두 존재 | 파일 존재 확인 |
| 3 | `test_pip_install_command_valid` | Unit | pip install 원라이너의 패키지가 전부 유효 | pip check 통과 |
| 4 | `test_psy_mov_e2e_with_skill` | Integration | /video-blueprint 스킬로 psy.mov 분석 → 코드 생성 → 검증 | 전체 파이프라인 동작 |
| 5 | `test_skill_md_phase_c_documented` | Unit | SKILL.md Phase C에 수동 검증 절차 기술 | Phase C 섹션 존재 + 입력/액션/출력 명시 |
| 6 | `test_output_schema_v3_fields` | Unit | output-schema.md에 v3 전체 필드 정의 존재 | blend_mode, depth_attenuation 등 |
| 7 | `test_analysis_workflow_layers_section` | Unit | analysis-workflow.md에 레이어 분석 절차 섹션 존재 | layers 섹션 포함 |
| 8 | `test_anti_patterns_updated` | Unit | SKILL.md Anti-patterns에 v3 패턴 추가 | v3 안티패턴 항목 존재 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_skill_integration.py`

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/SKILL.md` | Modify (전면 재작성) | v3 워크플로우 |
| `.claude/skills/video-blueprint/references/output-schema.md` | Modify | v3 스키마 (T1 산출물 반영) |
| `.claude/skills/video-blueprint/references/analysis-workflow.md` | Modify | 레이어 분석 절차 추가 |

### 4.2 Implementation Steps (Green Phase)
1. SKILL.md frontmatter description 업데이트
2. Dependencies 섹션 업데이트 (pip install v3)
3. Phase A~F 워크플로우 작성
4. Anti-patterns 업데이트 (v3 추가 패턴)
5. references 파일들 v3 반영
6. E2E 테스트: psy.mov로 전체 파이프라인 실행

## 5. Edge Cases
- 없음 (문서 티켓)

## 6. Review Checklist
- [ ] SKILL.md 단독으로 v3 파이프라인 실행 가능한 수준의 명확성
- [ ] 모든 스크립트 경로/옵션이 정확
- [ ] references 파일 참조 유효
