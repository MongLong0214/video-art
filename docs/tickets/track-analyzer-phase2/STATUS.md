# Pipeline Status: Track Analyzer Phase 2

**PRD**: docs/prd/PRD-track-analyzer-phase2.md (v0.5.2, Approved)
**Size**: XL
**Current Phase**: 5 (Rework — 17 ACs 미구현 발견)

## Tickets

| Ticket | Title | Size | Status | Remaining ACs |
|--------|-------|------|--------|---------------|
| T1 | presetSchema + synth-stem-map + BufferAllocator | L | Done | 0 |
| T2 | acid_bass SynthDef + MoogFF/RLPFD | L | **Rework** | 1 (RLPFD detect) |
| T3 | fm_lead SynthDef | S | Done | 0 |
| T4 | layered_kick SynthDef | M | Done | 0 |
| T5 | squelch SynthDef | S | Done | 0 |
| T6 | wavetable_pad + NRT Buffer | M | Done | 0 |
| T7 | granular_pad + Buffer | M | Done | 0 |
| T8 | sample_player + sample_extract.py | L | **Rework** | 1 (other stem) |
| T9 | pitch contour 3-tier fallback | M | Done | 0 |
| T10 | temporal dynamics + buildNrtScore | L | **NOT DONE** | 7 (핵심 전부) |
| T11 | calibration framework | M | **Rework** | 4 (dual-score, per-stem) |
| T12 | genre preset update | S | Done | 0 |
| T13 | sample-utils.ts | M | Done | 0 |
| T14 | E2E integration | L | **NOT DONE** | 3 (sections, buildNrt, dual-score) |
