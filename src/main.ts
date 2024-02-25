import * as db from "@potato/bot/util/db.js";
import * as bot from "@potato/bot/util/bot.js";
import * as plugin from "@potato/bot/util/plugin.js";
async function init() {
  await db.init();
  await bot.init();
  await plugin.init();
}

init();
