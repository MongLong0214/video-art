# T1: 환경 설정 + 프로젝트 구조

**PRD Ref**: PRD-music-gen-system > Phase A Foundation
**Priority**: P0 (Blocker)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
SuperCollider + ffmpeg + sox 설치 검증, audio/ 디렉토리 구조 생성, setup.sh 스크립트 작성.

## 2. Acceptance Criteria
- [ ] AC-1: `audio/setup.sh` 실행 시 SC/ffmpeg/sox 설치 상태 체크 + 미설치 시 설치 안내
- [ ] AC-2: `sclang -i none -e "0.exit"` exit code 0 (headless 부팅 성공)
- [ ] AC-3: `audio/` 하위 디렉토리 구조 생성 (sc/synthdefs, sc/patterns, sc/lib, sc/scores, sc/scenes, render/)
- [ ] AC-4: `audio/sc/startup.scd` — SC 부팅 + SynthDef 경로 로드 스켈레톤
- [ ] AC-5: package.json에 `audio:setup`, `audio:test` scripts 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `setup.sh checks sclang` | Shell | sclang 미설치 시 에러 메시지 | exit 1 + 설치 안내 |
| 2 | `setup.sh checks ffmpeg` | Shell | ffmpeg 미설치 시 에러 메시지 | exit 1 + 설치 안내 |
| 3 | `setup.sh checks sox` | Shell | sox 미설치 시 에러 메시지 | exit 1 + 설치 안내 |
| 4 | `startup.scd loads without error` | Integration | sclang -i none startup.scd | exit 0, "ERROR" 0 |

### 3.2 Test File Location
- `audio/setup.sh` (self-testing via exit codes)
- `audio/sc/test-synthdefs.scd` (SC 로드 테스트, T2에서 확장)

### 3.3 Mock/Setup Required
- macOS 환경 (brew 가용)
- SuperCollider 설치 필요 (`brew install --cask supercollider`)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/setup.sh` | Create | 도구 설치 검증 스크립트 |
| `audio/sc/startup.scd` | Create | SC 부팅 + SynthDef 로드 스켈레톤 |
| `audio/sc/test-synthdefs.scd` | Create | SynthDef 로드 테스트 스켈레톤 |
| `audio/render/` | Create | 렌더 파이프라인 디렉토리 |
| `package.json` | Modify | scripts 추가 |
| `.gitignore` | Modify | out/audio/ 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `audio/` 디렉토리 구조 생성
2. `setup.sh` 작성 — which sclang/ffmpeg/sox 체크, 실패 시 brew install 안내
3. `startup.scd` 스켈레톤 — Server.default 설정, SynthDef 경로
4. `test-synthdefs.scd` 스켈레톤 — 로드 후 0.exit
5. package.json scripts 추가
6. .gitignore에 out/audio/ 추가

### 4.3 Refactor Phase
- N/A (초기 설정)

## 5. Edge Cases
- EC-1: SC 미설치 → setup.sh가 명확한 에러 + `brew install --cask supercollider` 안내
- EC-2: brew 미설치 → setup.sh가 brew 설치 안내

## 6. Review Checklist
- [ ] Red: setup.sh 테스트 → FAILED 확인됨
- [ ] Green: 테스트 → PASSED
- [ ] Refactor: PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
