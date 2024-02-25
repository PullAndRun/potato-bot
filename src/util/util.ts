async function sleep(millisecond: number) {
  return new Promise((r) => setTimeout(r, millisecond));
}

function parseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return undefined;
  }
}

export { sleep, parseJson };
