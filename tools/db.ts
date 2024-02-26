import { QQ } from "@potato/bot/model/qq.ts";
import * as db from "@potato/bot/util/db.ts";
import { addPlugin } from "@potato/bot/model/plugin";

async function use() {
  await db.init();
  await addPlugin(123, "shits");
}

use();
