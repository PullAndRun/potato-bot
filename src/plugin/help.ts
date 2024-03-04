import { GroupMessageEvent } from "@icqqjs/icqq";
import { replyGroupMsg } from "../util/bot";
import * as pluginModel from "../util/plugin";

const info = {
  name: "帮助",
  type: "plugin",
  defaultActive: true,
  comment: [`说明：查询机器人可使用的各项功能。`],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  await replyGroupMsg(
    event,
    [
      `机器人使用说明书：\n`,
      pluginModel
        .pickAll()
        .map((plugin) => {
          if (plugin.name === "") {
            plugin.name = "AI聊天";
          }
          return [`功能：${plugin.name}`, plugin.comment.join("\n")].join("\n");
        })
        .join("\n\n"),
    ],
    true
  );
}

export { info };
