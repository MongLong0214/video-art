export const waitForServer = async (url: string, maxWait = 20_000): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} did not start within ${maxWait}ms`);
};
