// Buffer index range partition for NRT — wavetable, samples, granular
// 0-7 reserved for SC system. Phase 2 PRD §4.3.

export const BUFFER_RANGES = {
  wavetable: { start: 8, end: 39 },     // 32 buffers (max 4 VOsc sets × 8)
  samples: { start: 100, end: 299 },    // 200 buffers (extracted hits/loops)
  granular: { start: 300, end: 319 },   // 20 buffers (grain sources)
  reserved: { start: 320, end: 1023 },  // future use
} as const;

export const MAX_BUFFERS = 1024;

export type BufferRange = keyof typeof BUFFER_RANGES;

export class BufferAllocator {
  private allocated = new Map<number, string>();

  allocate(range: BufferRange, label: string): number {
    const { start, end } = BUFFER_RANGES[range];
    for (let i = start; i <= end; i++) {
      if (!this.allocated.has(i)) {
        this.allocated.set(i, label);
        return i;
      }
    }
    throw new Error(`Buffer range '${range}' exhausted (${start}-${end})`);
  }

  allocateConsecutive(range: BufferRange, count: number, label: string): number {
    const { start, end } = BUFFER_RANGES[range];
    for (let i = start; i <= end - count + 1; i++) {
      const available = Array.from(
        { length: count },
        (_, j) => !this.allocated.has(i + j),
      ).every(Boolean);
      if (available) {
        for (let j = 0; j < count; j++) {
          this.allocated.set(i + j, `${label}[${j}]`);
        }
        return i;
      }
    }
    throw new Error(
      `Cannot allocate ${count} consecutive buffers in '${range}'`,
    );
  }

  getAllocated(): ReadonlyMap<number, string> {
    return this.allocated;
  }
}
