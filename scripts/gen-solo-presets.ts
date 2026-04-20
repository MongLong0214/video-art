/**
 * Generate 13 single-effect presets for shader-dev gallery preview.
 * Each preset isolates ONE technique so you can see its effect clearly.
 */
import fs from "node:fs";
import path from "node:path";

type AnimOverride = Record<string, unknown>;

interface Effect {
  id: string;
  name: string;
  label: string;
  override: AnimOverride;
}

// baseline animation — subtle ambience, lets solo effect stand out
const BASE_ANIM = {
  colorCycle: { speed: 2, period: 20, phaseOffset: 0 },
  saturationBoost: 1.8,
  luminanceKey: 0.5,
  lumExponent: 1.2,
  hueKey: 1.0,
  hueSpeed: 4,
  noiseScale: 3,
  noiseSpeed: 0.4,
  noiseAmount: 0.05,
};

const EFFECTS: Effect[] = [
  {
    id: "T1-domain-warp",
    name: "domain-warping",
    label: "Domain Warping (recursive fbm swirls)",
    override: { domainWarp: 2.5, noiseAmount: 0.3, noiseScale: 4 },
  },
  {
    id: "T2-tile-repeat",
    name: "domain-repetition",
    label: "Domain Repetition (fbm tiling)",
    override: { tileRepeat: 6, noiseAmount: 0.4, noiseScale: 2 },
  },
  {
    id: "T3-polar-twist",
    name: "polar-uv",
    label: "Polar UV Twist (spiral)",
    override: { polarTwist: 5.0 },
  },
  {
    id: "T4-voronoi",
    name: "voronoi-cells",
    label: "Voronoi Cellular (crystalline)",
    override: { voronoiScale: 15, voronoiAmount: 1.2 },
  },
  {
    id: "T5-iq-palette",
    name: "iq-palette",
    label: "IQ Cosine Palette (rainbow)",
    override: {
      paletteAmount: 0.9,
      paletteA: [0.5, 0.5, 0.5],
      paletteB: [0.5, 0.5, 0.5],
      paletteC: [2.0, 1.0, 0.0],
      paletteD: [0.5, 0.2, 0.25],
    },
  },
  {
    id: "T6-pattern-check",
    name: "pattern-check",
    label: "Procedural Pattern (checker)",
    override: { patternType: 1, patternScale: 40, patternAmount: 0.6 },
  },
  {
    id: "T7-sdf-star",
    name: "sdf-star",
    label: "SDF 2D Star overlay",
    override: { sdfType: 2, sdfScale: 3, sdfAmount: 0.7 },
  },
  {
    id: "T8-julia",
    name: "julia-fractal",
    label: "Julia Fractal overlay",
    override: { juliaAmount: 0.7, juliaC: [-0.7, 0.27015] },
  },
  {
    id: "T9-rotate",
    name: "matrix-rotate",
    label: "Matrix UV Rotation",
    override: { rotateSpeed: 0.4, scalePulse: 0.1 },
  },
  {
    id: "T10-aa-edges",
    name: "aa-rings",
    label: "Anti-Aliased Rings (derivative fwidth)",
    override: { ringIntensity: 1.0, ringFreq: 35, ringPeriod: 5 },
  },
  {
    id: "T11-bicubic",
    name: "bicubic-filter",
    label: "Bicubic Texture Sampling",
    override: { bicubicFilter: true },
  },
  {
    id: "T12-worley",
    name: "worley-veins",
    label: "Worley F2-F1 Veins",
    override: { worleyScale: 12, worleyAmount: 0.8 },
  },
  {
    id: "T13-baseline",
    name: "baseline",
    label: "Baseline (no shader-dev effect)",
    override: {},
  },
];

const MINIMAL_EFFECTS = {
  bloom: { strength: 0.3, radius: 0.4, threshold: 0.7 },
  chromaticAberration: { offset: 0.5, modulationOffset: 0.2 },
  parallax: { scale: 0 },
  haze: { intensity: 0 },
  feather: { radius: 0 },
  trails: { strength: 0 },
  kaleidoscope: { segments: 0, blend: 0 },
  godRays: {
    intensity: 0,
    decay: 0.94,
    density: 0.9,
    weight: 0.4,
    threshold: 0.6,
    samples: 64,
    centerX: 0.5,
    centerY: 0.5,
  },
  aura: { intensity: 0, radius: 0.04, hueSpeed: 0.1, samples: 16 },
  mandala: {
    opacity: 0,
    segments: 12,
    rings: 8,
    rotationSpeed: 0.08,
    breathSpeed: 0.4,
    hueSpeed: 0.05,
  },
  filmGrade: {
    grain: 0.02,
    vignetteIntensity: 0.3,
    vignetteRadius: 0.95,
    vignetteTintR: 0.08,
    vignetteTintG: 0.04,
    vignetteTintB: 0.18,
    contrast: 1.05,
    sCurve: 0.15,
  },
};

const OUTDIR = path.resolve(
  import.meta.dirname,
  "..",
  "public",
  "presets",
  "solo",
);
fs.mkdirSync(OUTDIR, { recursive: true });

for (const effect of EFFECTS) {
  const preset = {
    version: 1,
    source: `solo-${effect.id}.PNG`,
    resolution: [1080, 1080],
    duration: 20,
    fps: 30,
    _preset: `Solo ${effect.id}: ${effect.label}`,
    layers: [
      {
        id: "layer-0",
        file: "layers/layer-0.png",
        zIndex: 0,
        opacity: 1,
        blending: "normal",
        role: "background-plate",
        meanDepth: 50,
        animation: { ...BASE_ANIM, ...effect.override },
      },
      {
        id: "layer-1",
        file: "layers/layer-1.png",
        zIndex: 1,
        opacity: 1,
        blending: "normal",
        role: "subject",
        meanDepth: 180,
        animation: { ...BASE_ANIM, ...effect.override },
      },
      {
        id: "layer-2",
        file: "layers/layer-2.png",
        zIndex: 2,
        opacity: 1,
        blending: "normal",
        role: "light-rays",
        meanDepth: 120,
        animation: { ...BASE_ANIM, ...effect.override },
      },
    ],
    effects: MINIMAL_EFFECTS,
  };
  const outPath = path.join(OUTDIR, `${effect.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(preset, null, 2) + "\n", "utf-8");
}

// Write index.html gallery for grid preview
const galleryHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>shader-dev Solo Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: #eee; font-family: system-ui, sans-serif; padding: 1rem; }
    h1 { margin-bottom: 0.5rem; font-size: 1.2rem; }
    p.hint { margin-bottom: 1rem; opacity: 0.7; font-size: 0.85rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem; }
    .cell { background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
    .cell h2 { padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #ffa; background: #181818; }
    .cell iframe { border: 0; width: 100%; aspect-ratio: 1/1; display: block; }
    a { color: #8cf; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>shader-dev Solo Gallery — 13 techniques on the mushroom-hand source</h1>
  <p class="hint">Click a title to open full-size. Each cell shows exactly ONE technique cranked up on the otherwise-baseline pipeline.</p>
  <div class="grid">
${EFFECTS.map(
  (e) => `    <div class="cell">
      <h2><a href="/?mode=layered&scene=/presets/solo/${e.id}.json" target="_blank">${e.id} · ${e.label}</a></h2>
      <iframe src="/?mode=layered&scene=/presets/solo/${e.id}.json" loading="lazy"></iframe>
    </div>`,
).join("\n")}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(OUTDIR, "gallery.html"), galleryHtml, "utf-8");

console.log(`✓ Generated ${EFFECTS.length} solo presets in ${OUTDIR}`);
console.log(`✓ Gallery: public/presets/solo/gallery.html`);
console.log();
console.log("Run:  npm run pipeline:preview");
console.log("Open: http://localhost:5299/presets/solo/gallery.html");
