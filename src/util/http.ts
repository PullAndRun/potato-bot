import sharp from "sharp";

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

async function fetchBuffer(
  url: string,
  timeout: number = 5000,
  requestInit: RequestInit = {}
) {
  const ac = new AbortController();
  setTimeout(() => {
    ac.abort();
  }, timeout);
  return fetch(url, { ...requestInit, signal: ac.signal })
    .then(async (resp) => Buffer.from(await resp.arrayBuffer()))
    .catch((_) => undefined);
}

async function fetchImage(url: string) {
  const image = await fetchBuffer(url);
  if (image === undefined) {
    return undefined;
  }
  return sharp(image.toString("base64"))
    .metadata()
    .then((meta) => {
      if (meta.width === undefined || meta.height === undefined) {
        return undefined;
      }
      return {
        image: image.toString("base64"),
        width: meta.width,
        height: meta.height,
      };
    })
    .catch((_) => undefined);
}

export { createFetch, fetchBuffer, fetchImage };
