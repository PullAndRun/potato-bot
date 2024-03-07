import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import * as pluginUtil from "../util/plugin";

const info = {
  name: "帮助",
  type: "plugin",
  passive: false,
  defaultActive: true,
  comment: [`说明：查询机器人可使用的各项功能。`],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const helpInfo = pluginUtil.pickAll().map((plugin) => {
    return [`功能：${plugin.name}`, plugin.comment.join("\n")].join("\n");
  });
  const maxPage = Math.ceil(helpInfo.length / 6);
  let page: number = Number.parseInt(msg);
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  if (page > maxPage) {
    page = maxPage;
  }
  await replyGroupMsg(event, [
    `\n机器人使用说明书：\n\n`,
    helpInfo.filter((_, i) => i >= (page - 1) * 6 && i < page * 6).join("\n\n"),
    `\n\n您在第 ${page} 页，说明书共有 ${maxPage} 页\n`,
    `输入“${botConf.trigger}帮助 页码”进行翻页`,
  ]);
}

export { info };
