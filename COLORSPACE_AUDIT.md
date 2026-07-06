# COLORSPACE_AUDIT

Scope: report-only audit for OUTPUT_GAP_ANALYSIS D-5c. No code changes are applied here.

## A. Layer texture sampling and ShaderMaterial math space

Evidence:
- `package.json:35` pins `three` at `^0.172.0`.
- `src/sketches/layered-psychedelic.ts:40` tags layer textures as `THREE.SRGBColorSpace`.
- `src/sketches/layered-psychedelic.ts:46` creates a custom `THREE.ShaderMaterial`; `src/sketches/layered-psychedelic.ts:50` passes that texture as `uTexture`.
- `src/shaders/layer.frag:330` samples `uTexture` directly, then `src/shaders/layer.frag:348` and `src/shaders/layer.frag:349` run luminance and HSV math on `texColor.rgb`.
- Three r172 uploads RGBA unsigned-byte sRGB textures as `SRGB8_ALPHA8`: `node_modules/three/src/renderers/webgl/WebGLTextures.js:207` to `node_modules/three/src/renderers/webgl/WebGLTextures.js:213`.
- Three injects an output conversion helper for ShaderMaterial programs (`linearToOutputTexel`), but custom shaders must call it or include the relevant chunk: `node_modules/three/src/renderers/webgl/WebGLProgram.js:835` to `node_modules/three/src/renderers/webgl/WebGLProgram.js:836`.

Conclusion:
- ShaderMaterial does not know that arbitrary `uTexture` is a color map the way built-in materials know `material.map`; it does not wrap `texture2D(uTexture, ...)` in a built-in map decode expression for this shader.
- In this specific r172/WebGL2 path, the `SRGBColorSpace` + RGBA/UnsignedByte upload should still make the GPU sample from an sRGB internal texture, so `texColor.rgb` is expected to be decoded linear values before `layer.frag` math.
- That means `layer.frag` HSV, luminance, IQ palette blending, add/screen decisions, and phase hue math are effectively linear-space math. This is not automatically the same as perceptual HSV over display/sRGB values.

Minimal fix proposal:
- Decide and document one invariant. Either keep layer math linear and calibrate palette linter/presets against linear math, or explicitly convert sampled layer color to display/sRGB for HSV-style operations and convert back to linear before output/compositing.
- Keep phase textures as data. Current phase load uses `THREE.NoColorSpace` in `src/sketches/layered-psychedelic.ts:193`, with the null phase texture also tagged `NoColorSpace` at `src/sketches/layered-psychedelic.ts:206`; this is correct.

## B. EffectComposer targets and pass spaces

Evidence:
- App renderer output is sRGB: `src/main.ts:55`.
- Layered mode creates the custom composer in `src/main.ts:162` to `src/main.ts:172`.
- `src/lib/effect-composer.ts:373` to `src/lib/effect-composer.ts:375` constructs `postprocessing` `EffectComposer` with `frameBufferType: THREE.HalfFloatType`.
- `postprocessing` recommends/accepts `frameBufferType` for internal frame buffers at `node_modules/postprocessing/build/index.cjs:1048` to `node_modules/postprocessing/build/index.cjs:1059`.
- `postprocessing` only tags composer buffers as sRGB when the frame buffer type is `UnsignedByteType`: `node_modules/postprocessing/build/index.cjs:1129` to `node_modules/postprocessing/build/index.cjs:1133`, and in buffer creation at `node_modules/postprocessing/build/index.cjs:1268` to `node_modules/postprocessing/build/index.cjs:1273`.
- Bloom and chromatic aberration are added through `EffectPass` in `src/lib/effect-composer.ts:466` to `src/lib/effect-composer.ts:480`; because the composer is HalfFloat, these intermediate buffers are HalfFloat and not 8-bit sRGB-tagged.
- Multipass/trails feedback uses a separate `THREE.WebGLRenderTarget` with `THREE.HalfFloatType`: `src/lib/effect-composer.ts:529` to `src/lib/effect-composer.ts:535`.
- Feedback mode copies `composer.outputBuffer.texture` into the feedback target and then to the screen using a custom blit shader: `src/lib/effect-composer.ts:613` to `src/lib/effect-composer.ts:621`.

Conclusion:
- Bloom accumulation, CA, trails, and multipass feedback are not 8-bit intermediates in the current layered composer path. They are HalfFloat render targets and should be treated as linear working buffers.
- The feedback echo itself is linear HalfFloat, which is good for avoiding precision loss.
- The likely mismatch is the final custom blit path in feedback mode: it samples a linear composer output texture and renders to the default framebuffer through a plain `ShaderMaterial` blit shader. That shader does not visibly call `linearToOutputTexel` or include `<colorspace_fragment>`, so it can bypass the intended final linear->sRGB conversion.
- Custom `ShaderPass` materials that can become the last pass have the same risk unless `postprocessing` wraps them with an output conversion pass. The local custom shader strings in `src/lib/effect-composer.ts` do not include explicit output conversion.

Minimal fix proposal:
- For feedback mode, replace the manual screen blit with a postprocessing copy pass that performs color-space conversion, or update `blitFragmentShader` to output `linearToOutputTexel(vec4(...))` with the required colorspace shader chunk.
- Audit custom final-capable `ShaderPass` materials (`kaleido`, `filmGrade`, `lens`, `trails`, `multipass`) and either make each final-safe or force a single final copy/encode pass after them.

## C. sRGB encode before PNG capture

Evidence:
- `src/main.ts:55` sets `renderer.outputColorSpace = THREE.SRGBColorSpace`.
- `src/main.ts:60` to `src/main.ts:62` applies tone mapping/exposure before rendering.
- Capture drives the real render path, then reads the canvas PNG with `renderer.domElement.toDataURL("image/png")` at `src/main.ts:382` to `src/main.ts:387`.

Conclusion:
- The intended PNG capture boundary is the browser canvas after renderer output conversion and tone mapping.
- This is correct when the final render path actually uses three/postprocessing's output colorspace conversion. It is suspect in the custom feedback blit path described in B.

Minimal fix proposal:
- After fixing the final blit/copy path, keep PNG capture at `toDataURL`; it is the correct surface for the current Puppeteer export path.

## D. ffmpeg full-to-tv range conversion

Evidence:
- `scripts/export-layered.ts:131` scales with `in_range=full` and `out_range=tv`.
- `scripts/export-layered.ts:142` tags `-color_range tv`.
- `scripts/export-layered.ts:143` to `scripts/export-layered.ts:145` tags BT.709 primaries/matrix and sRGB transfer.

Conclusion:
- PNG frames are full-range RGB at capture, but the default H.264 export compresses luma/chroma to limited/video range. Correctly tagged players should expand it, but mismatched players can show reduced contrast and saturation.

Minimal fix proposal:
- Add a future export option for full-range output, or provide a side-by-side QA encode that keeps full range for platforms where playback honors it.
- If the default remains TV range, include a tiny calibration strip or automated frame-stat comparison in export QA so washed-out output is caught before review.

## Concrete mismatches to fix later

1. Final feedback blit likely bypasses linear->sRGB output conversion.
2. Custom final-capable ShaderPass materials do not visibly encode to output color space.
3. Palette lint/preset values are currently display-number assumptions, while `layer.frag` likely performs HSV/palette math on decoded linear texture samples.
4. H.264 export intentionally converts full-range PNG capture to TV range; this is tagged, but still a practical review mismatch risk.
