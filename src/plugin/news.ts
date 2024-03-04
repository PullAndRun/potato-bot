import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";

const info = {
  name: "新闻",
  type: "plugin",
  defaultActive: true,
  comment: [
    `说明：向群内推送b站up主的开播通知和动态`,
    `使用“${botConf.trigger}订阅”了解如何订阅b站up主`,
  ],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {}

export { info };
