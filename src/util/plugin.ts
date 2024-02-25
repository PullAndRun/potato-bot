import { readdir } from "fs/promises";

const plugins: any[] = [];

async function load() {
  const fileNames = await readdir("src/plugin");
  for (const fileName of fileNames) {
    plugins.push(await import(`@potato/bot/plugin/${fileName}`));
  }
}

async function init() {
  await load();
}

export { init, plugins };
