//休眠
async function sleep(millisecond: number) {
  return new Promise((r) => setTimeout(r, millisecond));
}

//安全转换json
function parseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return undefined;
  }
}

export { sleep, parseJson };
