import { QQ } from "@potato/bot/model/qq.js";
import * as db from "@potato/bot/util/db.js";

async function insertQQAccount(qid: number, password: string) {
  await db.init();
  const qq = new QQ();
  qq.uin = qid;
  qq.password = password;
  await qq.save();
}

async function showQQAccount() {
  await db.init();
  const allUser = await QQ.find({
    order: {
      order: "ASC",
    },
  });
  console.log(allUser);
}
