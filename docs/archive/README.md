# Archive — OUTPUT_GAP_ANALYSIS history

## Policy

| File | Who reads | Purpose |
|------|-----------|---------|
| `/OUTPUT_GAP_ANALYSIS.md` (repo root) | **Every agent, every session** | Operating system: runbook, rules, killed axes, golden paths |
| Files in this directory | **Only when** debugging recurrence / needing evidence for a rule | Full case ledger, theory, long chronicles |

**Do not** paste archive content back into the root OS file.  
**Do not** follow archive peacock/legacy defaults when they conflict with the root OS.

## Snapshots

| File | Source commit | Lines (approx) | Contents |
|------|---------------|----------------|----------|
| `OUTPUT_GAP_ANALYSIS.pre-refactor-2026-07-15.md` | `be59eb8` | ~1640 | Pre-enterprise full knowledge base: detailed cases, PART 0–K style evidence, knob/theory depth |
| `OUTPUT_GAP_ANALYSIS.enterprise-compress-2026-07-15.md` | `5b5d017` | ~331 | First compression pass (rules table heavy, less runbook) |

Root OS after `8ed7192` is the production agent runbook (~450 lines) + `recipes/golden/*`.

## Restore note

```bash
git show be59eb8:OUTPUT_GAP_ANALYSIS.md | wc -l
```
