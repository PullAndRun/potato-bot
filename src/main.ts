import * as db from "./util/db.js";
import * as bot from "./util/bot.js";

async function init() {
  await db.init();
  await bot.init();
}

init();
