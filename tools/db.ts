import { QQ } from "@potato/bot/model/qq.js";
import * as db from "@potato/bot/util/db.js";

async function insertQQAccount(qid: number, password: string) {
  const qq = new QQ();
  qq.uin = qid;
  qq.password = password;
  await qq.save();
}

async function showQQAccount() {
  const allUser = await QQ.find({
    order: {
      order: "ASC",
    },
  });
  console.log(allUser);
}

async function use() {
  await db.init();
  //await insertQQAccount();
  //await showQQAccount();
}

use();
