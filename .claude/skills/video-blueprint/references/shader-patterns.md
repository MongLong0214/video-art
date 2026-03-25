# Shader Patterns Reference

Claude uses these patterns when writing layer body GLSL code in Phase E Step 2.

## File Location Index

| File | Purpose |
|------|---------|
| `templates/shader.frag.j2` | Jinja2 skeleton (uniforms, SDF lib, main structure) |
| `templates/post.frag.j2` | Post-processing shader template (CA, vignette, grain) |
| `scripts/generate-shader.py` | Renders skeleton + layer body patterns |
| `references/shader-patterns.md` | This file — GLSL pattern reference |

## Pattern 1: Per-Instance Rotation (Back Layer)

```glsl
for (int b = 0; b < COUNT; b++) {
  float fb = float(b);
  float bRatio = fb / float(COUNT - 1);
  float bScale = BASE_SCALE * pow(SCALE_STEP, fb) * breathe;
  float halfTurns = fb * SPEED_STEP + SPEED_BASE;
  float bAngle = -lt * PI * halfTurns / LOOP_DUR;
  vec2 bP = rot(bAngle) * uv;
  float d = sdRoundedBox(bP, vec2(bScale * ASPECT, bScale), bScale * CORNER_R);
  float thick = mix(STROKE_NEAR, STROKE_FAR, bRatio);
  float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));
  float glow = exp(-abs(d) * mix(DECAY_NEAR, DECAY_FAR, bRatio)) * GLOW_AMP;
  float depthFade = mix(ATT_NEAR, ATT_FAR, bRatio);
  vec3 bCol = mix(COLOR_NEAR, COLOR_FAR, bRatio);
  col += bCol * (line * 1.1 + glow) * depthFade;
}
```

## Pattern 2: Index-Scroll Zoom (Front Layer)

```glsl
float zoomPhase = fract(lt * CYCLES / LOOP_DUR);
for (int i = 0; i < COUNT; i++) {
  float fi = float(i);
  float idx = fi + zoomPhase;
  float scale = pow(BASE_EXP, idx) * breathe;
  if (scale < DISAPPEAR_SCALE) continue;
  float ratio = clamp(idx / float(COUNT - 1), 0.0, 1.0);
  // Gold frame
  float gH = scale * HEIGHT_FACTOR_A;
  float dG = sdRoundedBox(uv, vec2(gH * ASPECT_A, gH), gH * CORNER_A);
  // Navy frame
  float nH = scale * HEIGHT_FACTOR_B;
  float dN = sdRoundedBox(uv, vec2(nH * ASPECT_B, nH), nH * CORNER_B);
  float thick = mix(STROKE_NEAR, STROKE_FAR, ratio);
  float lineG = smoothstep(thick + 0.001, thick - 0.0005, abs(dG));
  float lineN = smoothstep(thick * 0.85 + 0.001, thick * 0.85 - 0.0005, abs(dN));
  float depthFade = mix(ATT_NEAR, ATT_FAR, ratio);
  float fadeIn = smoothstep(0.0, 1.5, idx);
  float fadeOut = smoothstep(DISAPPEAR_SCALE, 0.02, scale);
  float alpha = fadeIn * fadeOut * depthFade;
  col += COLOR_A * (lineG * 1.2 + glowG) * alpha;
  col += COLOR_B * (lineN * 1.0 + glowN) * alpha;
}
```

## Pattern 3: Additive Blending

```glsl
col += shapeColor * (line * intensity + glow) * depthFade;
```

## Pattern 4: Depth Attenuation

```glsl
float depthFade = mix(NEAR_VALUE, FAR_VALUE, ratio);
```

## Pattern 5: Glow (Exponential Decay)

```glsl
float glow = exp(-abs(d) * mix(DECAY_NEAR, DECAY_FAR, ratio)) * AMPLITUDE;
```