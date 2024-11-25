import * as db from "@potato/bot/util/db.ts";
import * as bot from "@potato/bot/util/bot.ts";
import * as plugin from "@potato/bot/util/plugin.ts";

process.on("uncaughtException", () => undefined);

async function init() {
  await db.init();
  await bot.init();
  await plugin.init();
}

init();
