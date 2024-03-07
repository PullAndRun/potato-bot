import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import { msgNoCmd, replyGroupMsg } from "../util/bot";

const info = {
  name: "占卜",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：占卜各种事情`,
    `使用“${botConf.trigger}占卜 占卜的事情”进行占卜`,
  ],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg === "") {
    await replyGroupMsg(event, [
      `命令错误。请输入您想占卜的内容。例如：${botConf.trigger}占卜 今天运气`,
    ]);
    return;
  }
  await replyGroupMsg(event, [`您占卜的“${msg}”结果是“${divination()}”`]);
}

function divination() {
  const fortunes = ["大吉", "中吉", "小吉", "小凶", "凶", "大凶"];
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}

export { info };
