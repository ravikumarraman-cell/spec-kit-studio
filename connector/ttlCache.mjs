/** Small bounded cache that also coalesces concurrent identical work. */
export function createTtlCache({ ttlMs, maxEntries = 24, now = () => Date.now() }) {
  const entries = new Map();
  const get = async (key, loader) => {
    const current = entries.get(key);
    if (current && current.expiresAt > now()) return current.value;
    const value = Promise.resolve().then(loader);
    entries.set(key, { value, expiresAt: now() + ttlMs });
    try { return await value; }
    catch (error) { if (entries.get(key)?.value === value) entries.delete(key); throw error; }
    finally {
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    }
  };
  const invalidate = (key) => key === undefined ? entries.clear() : entries.delete(key);
  return { get, invalidate };
}
