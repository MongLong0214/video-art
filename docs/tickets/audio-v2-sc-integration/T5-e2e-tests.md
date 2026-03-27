# T5: E2E 통합 테스트

**PRD Ref**: PRD-audio-v2-sc-integration > US-5
**Priority**: P1 (High)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1, T2, T3, T4

---

## 1. Objective
전체 SC/Tidal 통합 파이프라인의 E2E 테스트를 vitest로 작성한다. SC 미설치 CI에서 안전하게 skip.

## 2. Acceptance Criteria
- [ ] AC-1: `describe.skipIf(!hasSclang)` 동기 감지 패턴 (PRD AC-5.1)
- [ ] AC-2: boot.scd + genre-presets.scd 로드 → 에러 0 (PRD AC-5.2)
- [ ] AC-3: BootTidal.hs 정적 검증 — 11 pF + setPreset/getPreset (PRD AC-5.3)
- [ ] AC-4: render-stems-nrt.scd sclang 파싱 에러 0 (PRD AC-5.4)
- [ ] AC-5: render-stems.ts execFile-only + ENOENT 처리 (PRD AC-5.5)
- [ ] AC-6: 284 기존 테스트 regression 0 (PRD AC-5.6)

## 3. TDD Spec
이 티켓 자체가 테스트 작성 티켓. T1-T4의 모든 테스트 케이스를 `e2e-integration.test.ts`에 통합.

총 테스트: T1(10) + T2(10) + T3(8) + T4(8) = **36개**

### 3.2 Test File Location
- `scripts/lib/e2e-integration.test.ts` (신규)

### 3.3 Mock/Setup Required
```typescript
import { execSync } from 'node:child_process';
const hasSclang = (() => {
  try { execSync('which sclang', { stdio: 'ignore' }); return true; }
  catch { return false; }
})();
```

## 4. Implementation Guide

### 4.1 Files
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/e2e-integration.test.ts` | Create | 36개 테스트 (unit + integration) |

### 4.2 Implementation Steps
1. hasSclang 동기 감지
2. Unit describe: 정적 파일 분석 (fs.readFileSync → regex/contains)
3. Integration describe.skipIf(!hasSclang): sclang 실행 테스트
