# video-art Project Overview

## Purpose
Generative video art pipeline: takes images, decomposes them into layers using Qwen AI model, applies shaders (Three.js), renders to video with audio.

## Tech Stack
- TypeScript (ES2020, ESModules)
- Vite (dev server + build)
- Three.js (WebGL rendering)
- sharp (image processing)
- Replicate API (Qwen image-layered, ZoeDepth)
- Zod v4 (schema validation)
- Puppeteer (headless rendering)
- Vitest (testing)

## Key Directories
- `src/` — Frontend: shaders, scene rendering, Three.js viewer
- `scripts/` — Pipeline scripts (layer decomposition, rendering, audio)
- `scripts/lib/` — Core library modules (image processing, scene generation)
- `docs/` — PRD, tickets, architecture docs
- `audio/` — Audio pipeline (SuperCollider, Tidal)
- `out/` — Output directory

## Commands
- `npm test` / `npx vitest run` — Run all tests
- `npm run build` — TypeScript check + Vite build
- `npm run pipeline:layers` — Layer decomposition pipeline
- `npm run render:av` — Audio+Video render

## Code Style
- ESModules (`"type": "module"`)
- `.js` extensions in imports (TypeScript ESM convention)
- `describe`/`it`/`expect` from vitest
- Tests colocated: `foo.test.ts` next to `foo.ts`
- sharp for image I/O in scripts

## Testing
- Vitest config: `scripts/**/*.test.ts` and `src/**/*.test.ts`
- Node environment
- ~195 existing tests
