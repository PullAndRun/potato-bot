import * as db from "./util/db.js";
async function init() {
  await db.init();
}

init();
