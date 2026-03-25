import { describe, it, expect, vi, afterEach } from "vitest";
import { loadScene } from "./scene-loader";

const validScene = {
  version: 1,
  source: "test.png",
  resolution: [1080, 1080],
  duration: 20,
  fps: 30,
  layers: [
    {
      id: "bg",
      file: "layers/layer-0.png",
      zIndex: 0,
      animation: {
        colorCycle: { speed: 0.3, hueRange: 360, period: 20 },
      },
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadScene", () => {
  it("should parse valid scene.json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validScene),
      }),
    );

    const config = await loadScene("/scene.json");
    expect(config.version).toBe(1);
    expect(config.layers.length).toBe(1);
    expect(config.duration).toBe(20);
  });

  it("should throw on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(loadScene("/missing.json")).rejects.toThrow(
      "Failed to load scene: 404",
    );
  });

  it("should throw on invalid schema (bad period)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...validScene,
            layers: [
              {
                ...validScene.layers[0],
                animation: {
                  colorCycle: { speed: 0.3, hueRange: 360, period: 7 },
                },
              },
            ],
          }),
      }),
    );

    await expect(loadScene("/bad.json")).rejects.toThrow();
  });

  it("should throw on missing required fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 1 }),
      }),
    );

    await expect(loadScene("/incomplete.json")).rejects.toThrow();
  });
});
