import { sceneSchema, type SceneConfig } from "./scene-schema";

// Whitelist for ?scene= URLs. Prevents arbitrary-URL fetch DoS surface.
// Accepts: /scene.json, /presets/*.json (any depth under presets/).
// Dev-only debug (`/regress-explicit-tier-a-off.json`) also allowed for pixel-regression script.
const ALLOWED_PREFIXES = ["/scene.json", "/presets/", "/regress-"];

function isAllowedSceneUrl(url: string): boolean {
  // Only accept relative, absolute-path URLs. Reject protocol URLs.
  if (!url.startsWith("/")) return false;
  if (url.includes("..")) return false; // path traversal guard
  // Must match whitelist prefix
  for (const prefix of ALLOWED_PREFIXES) {
    if (url === prefix || url.startsWith(prefix)) return true;
  }
  return false;
}

export async function loadScene(url: string): Promise<SceneConfig> {
  if (!isAllowedSceneUrl(url)) {
    throw new Error(
      `Scene URL not allowed: ${url}. Only /scene.json, /presets/*, /regress-* permitted.`,
    );
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load scene: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return sceneSchema.parse(json);
}
