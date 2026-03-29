/**
 * Process items in batches with concurrency limit.
 * Preserves input order in results.
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (batchSize < 1) throw new Error(`batchSize must be >= 1, got ${batchSize}`);
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, batchIdx) => fn(item, i + batchIdx)),
    );
    results.push(...batchResults);
  }

  return results;
}
