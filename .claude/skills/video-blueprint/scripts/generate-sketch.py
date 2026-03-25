#!/usr/bin/env python3
"""
Generate Three.js sketch (.ts) + main.ts patch + post-processing shader from blueprint.

Phase E: Creates the TypeScript sketch file that loads the generated GLSL shader,
and optionally an EffectComposer setup for post-processing effects.

Usage:
  python3 generate-sketch.py <blueprint.json> [--name <mode_name>] [--output-dir <dir>]
"""

import argparse
import json
import re
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, BaseLoader

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


def hex_to_glsl(hex_color: str) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    return f"{r:.3f}, {g:.3f}, {b:.3f}"


def generate_sketch(blueprint: dict, output_path: str, name: str) -> str:
    """Generate a Three.js sketch TypeScript file."""
    canvas = blueprint.get("canvas", {})
    effects = blueprint.get("effects", {})
    has_effects = any(e.get("enabled") for e in effects.values() if isinstance(e, dict))

    sketch_code = f'''import * as THREE from "three";
import {{ createShaderPlane }} from "@/lib/shader-plane";
import vertexShader from "@/shaders/base.vert";
import fragmentShader from "@/shaders/{name}.frag";
import type {{ Sketch }} from "./psychedelic";

export const create{name.capitalize()} = (): Sketch => {{
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const {{ mesh, material, geometry }} = createShaderPlane(
    vertexShader,
    fragmentShader,
  );
  scene.add(mesh);

  return {{
    scene,
    camera,
    update(time: number) {{
      material.uniforms.uTime.value = time;
    }},
    resize(width: number, height: number) {{
      material.uniforms.uResolution.value.set(width, height);
    }},
    dispose() {{
      geometry.dispose();
      material.dispose();
    }},
  }};
}};
'''

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write(sketch_code)

    return sketch_code


def generate_main_patch(blueprint: dict, name: str) -> str:
    """Generate the main.ts patch code for adding a new mode."""
    canvas = blueprint.get("canvas", {})
    meta = blueprint.get("meta", {})
    width = canvas.get("width", 1080)
    height = canvas.get("height", 1920)
    fps = meta.get("fps", 60)
    dur = meta.get("duration_sec", 10.0)
    upper = name.upper()

    return f'''// --- {name} mode patch ---
const IS_{upper} = MODE === "{name}";
// Config: WIDTH = IS_{upper} ? {width} : ...
// HEIGHT = IS_{upper} ? {height} : ...
// FPS = IS_{upper} ? {fps} : ...
// LOOP_DUR = IS_{upper} ? {dur} : ...
// toneMapping = IS_{upper} ? THREE.NoToneMapping : ...

// loadSketch():
//   if (IS_{upper}) {{
//     const {{ create{name.capitalize()} }} = await import("@/sketches/{name}");
//     const sketch = create{name.capitalize()}();
//     sketch.resize(WIDTH, HEIGHT);
//     return sketch;
//   }}

// post-processing:
//   if (IS_{upper}) {{
//     composerRender = () => renderer.render(sketch.scene, sketch.camera);
//     updatePostUniforms = () => {{}};
//   }}
'''


def generate_post_shader(blueprint: dict) -> str:
    """Generate post-processing fragment shader from blueprint effects."""
    effects = blueprint.get("effects", {})
    ca = effects.get("chromatic_aberration", {})
    vig = effects.get("vignette", {})
    grain = effects.get("grain", {})

    lines = [
        "uniform sampler2D tDiffuse;",
        "uniform float uTime;",
        "varying vec2 vUv;",
        "",
        "float hash(vec2 p) {",
        "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
        "}",
        "",
        "void main() {",
        "  vec2 uv = vUv;",
        "  vec2 center = uv - 0.5;",
    ]

    if ca.get("enabled"):
        shift = ca.get("max_shift_ratio", 0.006)
        lines.append(f"  // Chromatic aberration")
        lines.append(f"  float aberration = length(center) * {shift};")
        lines.append(f"  vec3 col;")
        lines.append(f"  col.r = texture2D(tDiffuse, uv + center * aberration).r;")
        lines.append(f"  col.g = texture2D(tDiffuse, uv).g;")
        lines.append(f"  col.b = texture2D(tDiffuse, uv - center * aberration).b;")
    else:
        lines.append(f"  vec3 col = texture2D(tDiffuse, uv).rgb;")

    if vig.get("enabled"):
        start_r = vig.get("start_radius", 0.7)
        opacity = vig.get("opacity", 0.85)
        lines.append(f"  // Vignette")
        lines.append(f"  float vigDist = length(center * 2.0);")
        lines.append(f"  float vig = smoothstep({start_r}, 1.4, vigDist);")
        lines.append(f"  col *= 1.0 - vig * {opacity};")

    if grain.get("enabled"):
        intensity = grain.get("intensity", 0.02)
        fps = grain.get("frame_rate", 24)
        lines.append(f"  // Grain")
        lines.append(f"  float grainT = floor(uTime * {fps}.0);")
        lines.append(f"  float grain = (hash(gl_FragCoord.xy + grainT) - 0.5) * {intensity};")
        lines.append(f"  col += grain;")

    lines.append(f"  col = clamp(col, 0.0, 1.0);")
    lines.append(f"  gl_FragColor = vec4(col, 1.0);")
    lines.append(f"}}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate Three.js sketch from blueprint")
    parser.add_argument("blueprint", help="Path to blueprint.json")
    parser.add_argument("--name", default=None, help="Mode name (default: from source_file)")
    parser.add_argument("--output-dir", default="src/sketches", help="Output directory")
    args = parser.parse_args()

    with open(args.blueprint) as f:
        bp = json.load(f)

    name = args.name or bp.get("meta", {}).get("source_file", "generated").split(".")[0]

    sketch_path = f"{args.output_dir}/{name}.ts"
    generate_sketch(bp, sketch_path, name)
    print(f"Sketch: {sketch_path}")

    patch = generate_main_patch(bp, name)
    print(f"\nmain.ts patch:\n{patch}")

    effects = bp.get("effects", {})
    if any(e.get("enabled") for e in effects.values() if isinstance(e, dict)):
        post = generate_post_shader(bp)
        post_path = f"src/shaders/{name}-post.frag"
        Path(post_path).parent.mkdir(parents=True, exist_ok=True)
        with open(post_path, "w") as f:
            f.write(post)
        print(f"Post shader: {post_path}")


if __name__ == "__main__":
    main()