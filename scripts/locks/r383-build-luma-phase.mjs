// r383 mushroom-hand v9 (Isaac's reference: a luminance gradient map cycling through pink/orange/yellow/cyan): the phase
// field is the drawing's own luminance at near-full detail, so every line and ring gets its own palette band.
// median 3 + blur drop the brush-stroke speckle that turned into confetti on v6b.
//   node scripts/locks/r383-build-luma-phase.mjs [work-dir] [blur-sigma]   → layers/phase-luma-s<sigma>.png
import path from "node:path";
import sharp from "sharp";

const [, , wdArg, sigmaArg = "1.5"] = process.argv;
const layers = path.join(path.resolve(wdArg ?? "out/manual-runs/r383-mushroom-hand"), "layers");
await sharp(path.join(layers, "source.png")).removeAlpha().greyscale().median(3).blur(Number(sigmaArg))
  .toColourspace("srgb").png().toFile(path.join(layers, `phase-luma-s${sigmaArg}.png`));
console.log(`phase-luma-s${sigmaArg}.png written`);
