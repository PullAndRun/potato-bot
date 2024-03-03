import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import { pickAll } from "../util/plugin";
import { replyGroupMsg } from "../util/bot";

const info = {
  name: "帮助",
  type: "plugin",
  defaultActive: true,
  comment: [`${botConf}帮助\n说明：查询机器人可使用的各项功能。`],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  await replyGroupMsg(
    event,
    [
      pickAll()
        .map((plugin) => plugin.comment.join("\n"))
        .join("\n\n"),
    ],
    true
  );
}

export { info };
