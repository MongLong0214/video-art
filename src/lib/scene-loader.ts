import { sceneSchema, type SceneConfig } from "./scene-schema";

export async function loadScene(url: string): Promise<SceneConfig> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load scene: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return sceneSchema.parse(json);
}
