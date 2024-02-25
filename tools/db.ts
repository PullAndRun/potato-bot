import * as db from "@potato/bot/util/db.js";
import { QQ } from "@potato/bot/model/qq.js";

async function insertQQAccount(qid: number, password: string) {
  await db.init();
  const qq = new QQ();
  qq.qid = qid;
  qq.password = password;
  await qq.save();
}

async function showQQAccount() {
  await db.init();
  const allUser = await QQ.find();
  console.log(allUser);
}
