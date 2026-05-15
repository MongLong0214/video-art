/**
 * FBO Float Texture Spike (T0-b)
 *
 * Validates Puppeteer + ANGLE RGBA32F support for Tier B particles / cellular.
 * See docs/tickets/shader-dev-tier-abc/T0-b-fbo-float-spike.md
 *
 * Usage: npm run spike:fbo
 * Exit 0 if float supported with ≤1e-4 error. Else 1.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  startViteServer,
  waitForVite,
  killVite,
  launchHeadlessBrowser,
  runInPuppeteerPage,
} from "./lib/headless-browser.js";

export const expectedVec4 = [1.234, 5.678, 9.0, 42.0];
export const TOL = 1e-4;

export interface SpikeResult {
  floatSupported: boolean;
  halfFloatSupported: boolean;
  precisionError: number;
  readback: number[];
}

export function validateSpikeResult(r: SpikeResult): boolean {
  return r.floatSupported && r.precisionError <= TOL;
}

const PORT = 5299;
const RESULT_DOC = path.resolve(
  "docs/tickets/shader-dev-tier-abc/T0-b-spike-result.md",
);

// In-browser spike code — raw WebGL2 (no bundler dependency)
const spikeCode = `
(() => {
  const expected = [${expectedVec4.join(", ")}];
  const size = 128;
  const result = {
    floatSupported: false,
    halfFloatSupported: false,
    precisionError: Infinity,
    readback: [0, 0, 0, 0],
  };

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const gl = canvas.getContext('webgl2');
  if (!gl) { result.error = 'no-webgl2'; return result; }

  const floatExt = gl.getExtension('EXT_color_buffer_float');
  const halfExt = gl.getExtension('EXT_color_buffer_half_float');
  result.floatSupported = !!floatExt;
  result.halfFloatSupported = !!halfExt || !!floatExt;

  if (!floatExt) return result;

  // Create float texture as color attachment
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const fboStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (fboStatus !== gl.FRAMEBUFFER_COMPLETE) {
    result.error = 'fbo-incomplete-' + fboStatus.toString(16);
    return result;
  }

  // Quad
  const vtxShaderSrc = '#version 300 es\\nin vec2 pos;void main(){gl_Position=vec4(pos,0.0,1.0);}';
  const fragShaderSrc = '#version 300 es\\nprecision highp float;out vec4 oCol;void main(){oCol=vec4(' +
    expected[0].toFixed(6) + ',' + expected[1].toFixed(6) + ',' + expected[2].toFixed(6) + ',' + expected[3].toFixed(6) + ');}';

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('shader compile: ' + gl.getShaderInfoLog(s));
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, vtxShaderSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragShaderSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'pos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(prog));
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.viewport(0, 0, size, size);
  gl.useProgram(prog);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // Readback
  const buf = new Float32Array(4);
  gl.readPixels(size / 2, size / 2, 1, 1, gl.RGBA, gl.FLOAT, buf);
  result.readback = [buf[0], buf[1], buf[2], buf[3]];
  let maxErr = 0;
  for (let k = 0; k < 4; k++) {
    const err = Math.abs(result.readback[k] - expected[k]);
    if (err > maxErr) maxErr = err;
  }
  result.precisionError = maxErr;

  return result;
})()
`;

async function writeResultDoc(r: SpikeResult): Promise<void> {
  const ts = new Date().toISOString();
  const block = `
## Spike run @ ${ts}

\`\`\`json
${JSON.stringify(r, null, 2)}
\`\`\`

- **floatSupported**: ${r.floatSupported ? "YES" : "NO"}
- **halfFloatSupported**: ${r.halfFloatSupported ? "YES" : "NO"}
- **precisionError**: ${r.precisionError.toExponential(3)} (tolerance ≤ ${TOL})
- **readback**: [${r.readback.map((n) => n.toFixed(6)).join(", ")}]
- **Verdict**: ${validateSpikeResult(r) ? "✅ PASS — Tier B particles/cellular can use THREE.FloatType" : r.halfFloatSupported ? "⚠️  FALLBACK — use THREE.HalfFloatType" : "❌ ABORT — neither float nor halfFloat supported"}

---
`;
  const existing = fs.existsSync(RESULT_DOC) ? fs.readFileSync(RESULT_DOC, "utf-8") : "# T0-b FBO Float Spike — Result Log\n\n";
  fs.writeFileSync(RESULT_DOC, existing + block, "utf-8");
}

export async function main(_argv: string[] = process.argv.slice(2)): Promise<number> {
  console.log("fbo-float-spike: starting vite + puppeteer");
  const viteProc = startViteServer(PORT);
  const onExit = () => viteProc.kill();
  process.on("exit", onExit);

  let browser;
  let result: SpikeResult | null = null;

  try {
    await waitForVite(PORT);
    browser = await launchHeadlessBrowser();

    const { result: spikeResult, logs } = await runInPuppeteerPage(
      browser,
      `http://localhost:${PORT}/?mode=layered`,
      async (page) => {
        // wait for main init
        await page.waitForFunction("window.__captureReady === true", { timeout: 15000 });
        const r = (await page.evaluate(spikeCode)) as SpikeResult;
        return r;
      },
    );
    result = spikeResult;

    // Dump pageerror/console errors if any
    const errors = logs.filter((l) => /pageerror|error\]/.test(l));
    if (errors.length) {
      console.log("Page errors during spike:");
      errors.slice(0, 5).forEach((l) => console.log("  " + l));
    }
  } finally {
    await browser?.close().catch(() => {});
    await killVite(viteProc);
    process.removeListener("exit", onExit);
  }

  if (!result) {
    console.error("Spike failed — no result returned");
    return 1;
  }

  console.log("\nSpike result:");
  console.log(JSON.stringify(result, null, 2));

  await writeResultDoc(result);
  console.log(`\nResult appended to ${RESULT_DOC}`);

  const pass = validateSpikeResult(result);
  console.log(pass ? "\n✅ PASS" : "\n❌ FAIL — Tier B fallback needed (HalfFloat or CPU)");
  return pass ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code));
}
