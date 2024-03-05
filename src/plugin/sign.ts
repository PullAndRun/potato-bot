import { GroupMessageEvent } from "@icqqjs/icqq";
import { findOrAddOne, updateSign } from "../model/user";
import dayjs from "dayjs";
import { replyGroupMsg } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "签到",
  type: "plugin",
  defaultActive: true,
  comment: [`说明：签到并获取幸运词条`],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  const user = await findOrAddOne(event.sender.user_id, event.group_id);
  if (dayjs(user.signTime).isSame(dayjs(), "day")) {
    await replyGroupMsg(event, ["您今天已经签到过，无法重复签到。"], true);
    return;
  }
  const updateResult = await updateSign(event.sender.user_id, event.group_id);
  const luckyWord = await createFetch(
    "https://zh.moegirl.org.cn/index.php?title=Special:Random"
  )
    .then((resp) => decodeURI(resp?.url.split("/").slice(-1).join("") || ""))
    .catch((_) => undefined);
  await replyGroupMsg(
    event,
    [
      `签到成功！您累积签到 ${updateResult.sign} 天\n`,
      luckyWord || `您今天的幸运词是：${luckyWord}\n`,
      luckyWord || `关于幸运词：https://zh.moegirl.org.cn/${luckyWord}`,
    ],
    true
  );
}

export { info };
