import { describe, it, expect } from "vitest";
import { batchProcess } from "./batch-process.js";

describe("batchProcess", () => {
  it("limits concurrency to batchSize", async () => {
    let maxConcurrent = 0;
    let current = 0;
    const items = Array.from({ length: 8 }, (_, i) => i);

    await batchProcess(items, 4, async (item) => {
      current++;
      if (current > maxConcurrent) maxConcurrent = current;
      await new Promise((r) => setTimeout(r, 10));
      current--;
      return item * 2;
    });

    expect(maxConcurrent).toBeLessThanOrEqual(4);
  });

  it("preserves result order", async () => {
    const items = [3, 1, 4, 1, 5, 9, 2, 6];
    const result = await batchProcess(items, 4, async (item) => {
      await new Promise((r) => setTimeout(r, Math.random() * 10));
      return item * 10;
    });
    expect(result).toEqual([30, 10, 40, 10, 50, 90, 20, 60]);
  });

  it("fails entirely on single error", async () => {
    const items = [1, 2, 3, 4, 5];
    await expect(
      batchProcess(items, 3, async (item) => {
        if (item === 3) throw new Error("boom");
        return item;
      }),
    ).rejects.toThrow("boom");
  });

  it("handles fewer items than batch size", async () => {
    const result = await batchProcess([1, 2], 4, async (x) => x + 1);
    expect(result).toEqual([2, 3]);
  });

  it("handles empty array", async () => {
    const result = await batchProcess([], 4, async (x) => x);
    expect(result).toEqual([]);
  });
});
