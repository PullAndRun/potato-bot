import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import * as aiModel from "../model/ai";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import * as pluginUtil from "../util/plugin";

const info = {
  name: "帮助",
  type: "plugin",
  defaultActive: true,
  comment: [`说明：查询机器人可使用的各项功能。`],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg.startsWith("AI人格")) {
    const prompt = await prompts();
    await replyGroupMsg(event, [prompt]);
    return;
  }
  await replyGroupMsg(event, [
    `机器人使用说明书：\n`,
    pluginUtil
      .pickAll()
      .map((plugin) => {
        if (plugin.name === "") {
          plugin.name = "AI聊天";
        }
        return [`功能：${plugin.name}`, plugin.comment.join("\n")].join("\n");
      })
      .join("\n\n"),
  ]);
}

async function prompts() {
  const allPrompts = await aiModel.findAll();
  return allPrompts
    .map((prompt, index) => `${index}、人格名：${prompt.promptName}`)
    .join("\n");
}

export { info };
