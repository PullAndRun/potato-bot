import { GroupMessageEvent } from "@icqqjs/icqq";
import dayjs from "dayjs";
import * as userModel from "../model/user";
import { replyGroupMsg } from "../util/bot";
import { createFetch } from "../util/http";
import signConf from "@potato/config/sign.json";
import { shorten } from "./shorten";

const info = {
  name: "签到",
  type: "plugin",
  defaultActive: true,
  passive: true,
  comment: [`说明：签到并获取幸运词条`],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  const user = await userModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  if (user.signTime !== null && dayjs(user.signTime).isSame(dayjs(), "day")) {
    await replyGroupMsg(event, ["您今天已经签到过，无法重复签到。"]);
    return;
  }
  const updateResult = await userModel.updateSign(
    event.sender.user_id,
    event.group_id
  );
  const luckyWord = await createFetch(signConf.api.luckyWord)
    .then((resp) => decodeURI(resp?.url.split("/").slice(-1).join("") || ""))
    .catch((_) => undefined);
  const luckyWordUrl = await shorten(`${signConf.api.moeGirl}${luckyWord}`);
  await replyGroupMsg(event, [
    `签到成功！您累积签到 ${updateResult.sign} 天\n`,
    luckyWord ? `您今天的幸运词是：${luckyWord}\n` : "",
    luckyWordUrl ? `关于幸运词：${luckyWordUrl}` : "",
  ]);
}

export { info };
