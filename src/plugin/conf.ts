import { GroupMessageEvent } from "@icqqjs/icqq";
import * as aiModel from "@potato/bot/model/ai.ts";
import * as groupModel from "@potato/bot/model/group.ts";
import * as pluginModel from "@potato/bot/model/plugin.ts";
import botConf from "@potato/config/bot.json";
import { msgNoCmd, replyGroupMsg } from "../util/bot";

const info = {
  name: "设置",
  type: "plugin",
  defaultActive: true,
  plugin: plugin,
};

//bot设置
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const secondCmd = [
    {
      name: "开启插件",
      comment: `功能：开启插件\n使用方式：${botConf.trigger}设置 开启插件 插件1 插件2`,
      auth: true,
      plugin: active,
    },
    {
      name: "关闭插件",
      comment: `功能：关闭插件\n使用方式：${botConf.trigger}设置 关闭插件 插件1 插件2`,
      auth: true,
      plugin: disable,
    },
    {
      name: "人格",
      comment: `功能：切换群聊AI人格\n使用方式：${botConf.trigger}设置 人格 人格名\n获取人格名：${botConf.trigger}帮助 人格列表`,
      auth: false,
      plugin: setPromptName,
    },
    {
      name: "自定义人格",
      auth: true,
      comment: `功能：切换群聊AI人格为自定义人格\n使用方式：${botConf.trigger}设置 自定义人格 人格内容`,
      plugin: setPrompt,
    },
    {
      name: "还原人格",
      auth: true,
      comment: `功能：还原群聊AI人格为猫娘\n使用方式：${botConf.trigger}设置 还原人格`,
      plugin: restorePromptName,
    },
  ];
  if (msg === "") {
    const reply = secondCmd
      .map(
        (cmd) =>
          `${cmd.name}\n${cmd.comment}\n需要管理员权限:${
            cmd.auth ? "是" : "否"
          }`
      )
      .join("\n");
    await replyGroupMsg(event, [reply], true);
    return;
  }
  for (const cmd of secondCmd) {
    if (!msg.startsWith(cmd.name)) {
      continue;
    }
    if (
      (cmd.auth && event.sender.role === "member") ||
      (cmd.auth && !botConf.admin.includes(event.sender.user_id))
    ) {
      await replyGroupMsg(
        event,
        ["您使用的命令需要群管理员权限，请联系群管理员。"],
        true
      );
      break;
    }
    cmd.plugin(cmd.name, event);
    break;
  }
}

//bot设置 还原人格
async function restorePromptName(_: string, event: GroupMessageEvent) {
  const updateResult = await groupModel.updatePromptName(
    event.group_id,
    "猫娘"
  );
  if (!updateResult) {
    await replyGroupMsg(event, [`人格还原失败，请联系管理员。`], true);
    return;
  }
  await replyGroupMsg(event, [`人格还原成功，请联系管理员。`], true);
}

//bot设置 人格
async function setPromptName(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["人格"]);
  if (msg === "") {
    await replyGroupMsg(
      event,
      [
        `命令错误。\n设置群聊人格命令：\n${botConf.trigger}设置 人格 人格名\n人格名获取方式：${botConf.trigger}帮助 人格列表`,
      ],
      true
    );
    return;
  }
  const ai = await aiModel.findOne(msg);
  if (ai === null) {
    await replyGroupMsg(
      event,
      [`未发现指定人格，请检查人格名是否正确。`],
      true
    );
    return;
  }
  const updateResult = await groupModel.updatePromptName(event.group_id, msg);
  if (!updateResult) {
    await replyGroupMsg(event, [`人格更新失败，请联系管理员。`], true);
    return;
  }
  await replyGroupMsg(event, [`人格更新成功，请联系管理员。`], true);
}

//bot设置 自定义人格
async function setPrompt(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["自定义人格"]);
  if (msg === "") {
    await replyGroupMsg(
      event,
      [
        `命令错误。\n自定义群聊人格命令：\n${botConf.trigger}设置 自定义人格 人格Prompt`,
      ],
      true
    );
    return;
  }
  const updateResult = await groupModel.updateCustomPrompt(event.group_id, msg);
  if (!updateResult) {
    await replyGroupMsg(event, [`人格更新失败，请联系管理员。`], true);
    return;
  }
  await replyGroupMsg(event, [`人格更新成功，请联系管理员。`], true);
}

//bot设置 开启
async function active(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["开启"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(
      event,
      [
        `命令错误。\n开启插件命令：\n${botConf.trigger}设置 开启 插件名1 插件名2 ...`,
      ],
      true
    );
    return;
  }
  const activeResult = await pluginSwitch(msg, event.group_id, true);
  if (activeResult.length === 0) {
    await replyGroupMsg(event, [`未搜索到需要开启的插件`], true);
    return;
  }
  await replyGroupMsg(event, [`已开启插件：${activeResult.join(" ")}`], true);
}

//bot设置 关闭
async function disable(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["关闭"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(
      event,
      [
        `命令错误，关闭插件命令：\n${botConf.trigger}设置 关闭 插件名1 插件名2 ...`,
      ],
      true
    );
    return;
  }
  const activeResult = await pluginSwitch(msg, event.group_id, false);
  if (activeResult.length === 0) {
    await replyGroupMsg(event, [`未搜索到需要关闭的插件`], true);
    return;
  }
  await replyGroupMsg(event, [`已关闭插件：${activeResult.join(" ")}`], true);
}

async function pluginSwitch(
  pluginNames: string[],
  group_id: number,
  active: boolean
) {
  const switchedPluginNames = await Promise.all(
    pluginNames.map(async (pluginName) => {
      const updateResult = await pluginModel.update(
        group_id,
        pluginName,
        active
      );
      if (!updateResult) {
        return undefined;
      }
      return pluginName;
    })
  );
  return switchedPluginNames.filter(
    (name): name is string => name !== undefined
  );
}

export { info };
