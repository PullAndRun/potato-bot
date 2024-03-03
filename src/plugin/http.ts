async function createFetch(
  url: string,
  timeout: number = 5000,
  requestInit: RequestInit = {}
) {
  const ac = new AbortController();
  setTimeout(() => {
    ac.abort();
  }, timeout);
  return fetch(url, { ...requestInit, signal: ac.signal }).catch(
    (_) => undefined
  );
}

export { createFetch };
