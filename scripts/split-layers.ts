/**
 * Re-splits an existing fg layer into silhouettes + light-rays without re-running API.
 * Reads public/layers/layer-1.png, writes layer-1.png + layer-2.png, updates scene.json.
 *
 * Usage: npx tsx scripts/split-layers.ts [--lum 160] [--layers-dir public/layers] [--scene public/scene.json]
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (name: string, def: string) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};

const LAYERS_DIR = flag("--layers-dir", path.join(process.cwd(), "public", "layers"));
const SCENE_PATH = flag("--scene", path.join(process.cwd(), "public", "scene.json"));
const LUM_THRESHOLD = parseInt(flag("--lum", "160"), 10);

const fgPath = path.join(LAYERS_DIR, "layer-1.png");
if (!fs.existsSync(fgPath)) {
  console.error(`Not found: ${fgPath}`);
  process.exit(1);
}

async function main() {
  const { data: raw, info } = await sharp(fgPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H } = info;
  console.log(`  fg: ${W}x${H} — splitting at lum ${LUM_THRESHOLD}`);

  const silBuf = Buffer.alloc(W * H * 4, 0);
  const rayBuf = Buffer.alloc(W * H * 4, 0);

  let silPx = 0, rayPx = 0;
  for (let i = 0; i < W * H; i++) {
    const r = raw[i * 4];
    const g = raw[i * 4 + 1];
    const b = raw[i * 4 + 2];
    const a = raw[i * 4 + 3];
    if (a < 10) continue;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= LUM_THRESHOLD) {
      rayBuf[i * 4] = r; rayBuf[i * 4 + 1] = g; rayBuf[i * 4 + 2] = b; rayBuf[i * 4 + 3] = a;
      rayPx++;
    } else {
      silBuf[i * 4] = r; silBuf[i * 4 + 1] = g; silBuf[i * 4 + 2] = b; silBuf[i * 4 + 3] = a;
      silPx++;
    }
  }

  const total = silPx + rayPx;
  console.log(`  silhouettes: ${silPx} px (${(silPx / total * 100).toFixed(1)}%)`);
  console.log(`  light rays:  ${rayPx} px (${(rayPx / total * 100).toFixed(1)}%)`);

  await sharp(silBuf, { raw: { width: W, height: H, channels: 4 } })
    .png().toFile(path.join(LAYERS_DIR, "layer-1.png"));
  console.log("  layer-1.png — silhouettes written");

  await sharp(rayBuf, { raw: { width: W, height: H, channels: 4 } })
    .png().toFile(path.join(LAYERS_DIR, "layer-2.png"));
  console.log("  layer-2.png — light rays written");

  // Update scene.json
  if (!fs.existsSync(SCENE_PATH)) {
    console.warn(`  scene.json not found at ${SCENE_PATH} — skipping update`);
    return;
  }

  const scene = JSON.parse(fs.readFileSync(SCENE_PATH, "utf-8"));

  // Ensure layer-1 uses normal blending (silhouettes don't need screen)
  const sil = scene.layers.find((l: { id: string }) => l.id === "layer-1");
  if (sil) {
    sil.blending = "normal";
  }

  // Remove any existing layer-2, then append
  scene.layers = scene.layers.filter((l: { id: string }) => l.id !== "layer-2");

  const sil1 = scene.layers.find((l: { id: string }) => l.id === "layer-1");
  const baseAnim = sil1?.animation ?? {};

  scene.layers.push({
    id: "layer-2",
    file: "layers/layer-2.png",
    zIndex: 2,
    opacity: 0.65,
    blending: "screen",
    role: "light-rays",
    meanDepth: 120,
    animation: {
      colorCycle: { speed: 3, period: baseAnim.colorCycle?.period ?? 10, phaseOffset: 90 },
      glow: { intensity: 0, pulse: 0, period: 10 },
      saturationBoost: 1.2,
      luminanceKey: 1,
      satBlendLow: 0.02,
      satBlendHigh: 0.1,
      satInjectionMul: 0.4,
      glowPulseFloor: 0,
      lumExponent: 1.2,
      hueKey: 2.0,
      hueSpeed: 4,
      breath: { amplitude: 0.015, frequency: 3.0, period: baseAnim.breath?.period ?? 10 },
    },
  });

  // Sort by zIndex
  scene.layers.sort((a: { zIndex: number }, b: { zIndex: number }) => a.zIndex - b.zIndex);

  fs.writeFileSync(SCENE_PATH, JSON.stringify(scene, null, 2));
  console.log(`  scene.json updated — ${scene.layers.length} layers`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
