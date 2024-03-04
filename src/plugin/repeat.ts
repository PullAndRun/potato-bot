import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import repeatConf from "@potato/config/repeat.json";
import { getBots, sendGroupMsg } from "../util/bot";
const info = {
  name: "复读",
  type: "plugin",
  defaultActive: true,
  comment: [`说明：复读重复3次的群聊文本消息`],
  plugin: plugin,
};

const repeatMap: Map<number, { msg: string; times: number }> = new Map();
async function plugin(event: GroupMessageEvent) {
  if (
    event.raw_message.trim().startsWith(botConf.trigger) ||
    event.raw_message.replace(
      new RegExp(`(\\s+)|(\\[\\])|(\\[(.+?)\\])`, "g"),
      ""
    ) === ""
  ) {
    return;
  }
  const repeatText = repeat(
    event.group_id,
    event.raw_message,
    repeatConf.count
  );
  if (repeatText === undefined) {
    return;
  }
  for (const client of getBots()) {
    await sendGroupMsg(client, event.group_id, [repeatText]);
  }
}

function repeat(gid: number, message: string, count: number = 3) {
  const times = repeatMap.get(gid)?.times;
  const msg = repeatMap.get(gid)?.msg;
  if (!times || !msg || message !== msg) {
    repeatMap.set(gid, { msg: message, times: 1 });
    return undefined;
  }
  const nowTimes = times + 1;
  repeatMap.set(gid, { msg: message, times: nowTimes });
  if (nowTimes === count) {
    return message;
  }
  return undefined;
}

export { info };
