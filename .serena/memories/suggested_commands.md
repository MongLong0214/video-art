# Suggested Commands

## Testing
- `npx vitest run` — Run all tests
- `npx vitest run scripts/lib/candidate-extraction.test.ts` — Run specific test file
- `npx vitest --watch` — Watch mode

## Build / Type Check
- `npx tsc --noEmit` — TypeScript type check (note: tsconfig only includes src/)
- `npm run build` — Full build (tsc + vite)

## Pipeline
- `npm run pipeline:layers` — Run layer decomposition
- `npm run render:av` — Render audio+video

## Git
- `git status` / `git log --oneline -10`
