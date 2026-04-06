/**
 * Frame Texture Pool — loads and caches frame sequence textures for motion layers.
 *
 * Two modes:
 * - Capture mode: preloadAll() loads all frames into a Map for sync access (frame-perfect)
 * - Preview mode: sliding window ±5 frames with lazy loading (memory-efficient)
 */

import * as THREE from "three";

/**
 * Compute frame index from normalized time [0, 1) and total frame count.
 * Clamps to valid range [0, frameCount - 1].
 */
export function computeFrameIndex(
  normalizedTime: number,
  frameCount: number,
): number {
  const clamped = Math.max(0, Math.min(1, normalizedTime));
  return Math.min(Math.floor(clamped * frameCount), frameCount - 1);
}

export class FrameTexturePool {
  private readonly framesDir: string;
  readonly frameCount: number;
  private preloadedFrames: Map<number, THREE.Texture> | null = null;
  private readonly textureLoader = new THREE.TextureLoader();
  private lastTexture: THREE.Texture | null = null;

  constructor(framesDir: string, frameCount: number) {
    this.framesDir = framesDir;
    this.frameCount = frameCount;
  }

  /**
   * Preload all frames into memory (capture mode).
   * Must be awaited before calling getTexture() in capture mode.
   */
  async preloadAll(): Promise<void> {
    const map = new Map<number, THREE.Texture>();

    for (let i = 0; i < this.frameCount; i++) {
      const url = this.frameUrl(i);
      const texture = await this.loadTextureAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      map.set(i, texture);
    }

    this.preloadedFrames = map;
  }

  /**
   * Get texture for a given frame index.
   * In capture mode (after preloadAll), returns from Map synchronously.
   * In preview mode, returns cached texture or last-used fallback.
   */
  getTexture(frameIndex: number): THREE.Texture | null {
    const idx = Math.max(0, Math.min(frameIndex, this.frameCount - 1));

    // Capture mode: preloaded Map
    if (this.preloadedFrames) {
      const tex = this.preloadedFrames.get(idx) ?? null;
      if (tex) this.lastTexture = tex;
      return tex;
    }

    // Preview mode: return last texture as fallback (lazy loading not implemented in MVP)
    return this.lastTexture;
  }

  /**
   * Dispose all cached textures.
   */
  dispose(): void {
    if (this.preloadedFrames) {
      for (const tex of this.preloadedFrames.values()) {
        tex.dispose();
      }
      this.preloadedFrames.clear();
      this.preloadedFrames = null;
    }
    this.lastTexture = null;
  }

  private frameUrl(index: number): string {
    const padded = String(index + 1).padStart(5, "0");
    return `/${this.framesDir}frame_${padded}.png`;
  }

  private loadTextureAsync(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });
  }
}
