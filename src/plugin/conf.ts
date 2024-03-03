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
  comment: [
    `${botConf.trigger}设置\n说明：设置机器人各项功能，使用“${botConf.trigger}设置”命令查询有关“设置”的详细信息。`,
  ],
  plugin: plugin,
};

//bot设置
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const secondCmd = [
    {
      name: "开启插件",
      comment: `使用“${botConf.trigger}设置 开启插件 插件名“命令开启插件\n插件名源自“${botConf.trigger}帮助”命令`,
      auth: true,
      plugin: active,
    },
    {
      name: "关闭插件",
      comment: `使用“${botConf.trigger}设置 开启插件 插件名“命令关闭插件\n插件名源自“${botConf.trigger}帮助”命令`,
      auth: true,
      plugin: disable,
    },
    {
      name: "插件状态",
      comment: `使用“${botConf.trigger}设置 插件状态“命令查询目前插件状态`,
      auth: false,
      plugin: pluginState,
    },
    {
      name: "人格",
      comment: `使用“${botConf.trigger}设置 人格 人格名“命令切换聊天AI人格\n人格名源自“${botConf.trigger}帮助 AI人格”命令`,
      auth: false,
      plugin: setPromptName,
    },
    {
      name: "自定义人格",
      auth: true,
      comment: `使用“${botConf.trigger}设置 自定义人格 人格prompts“命令设置聊天AI的自定义人格\n人格prompts是自定义的人格prompts`,
      plugin: setPrompt,
    },
    {
      name: "还原人格",
      auth: true,
      comment: `使用“${botConf.trigger}设置 还原人格“命令还原默认AI人格`,
      plugin: restorePromptName,
    },
  ];
  if (msg === "") {
    const reply = secondCmd
      .map(
        (cmd) =>
          `功能：${cmd.name}\n说明：${cmd.comment}\n需要群管权限:${
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

//bot设置 插件状态
async function pluginState(message: string, event: GroupMessageEvent) {
  const state = await pluginModel.findByGid(event.group_id);
  if (state === null) {
    await replyGroupMsg(
      event,
      [
        `未查询到任何插件状态\n插件在您首次使用的时候自动初始化\n请您先使用插件\n使用“${botConf.trigger}帮助”命令查询可使用的插件`,
      ],
      true
    );
    return;
  }
  await replyGroupMsg(
    event,
    [
      state
        .filter((v) => v.name !== "")
        .map(
          (curr) =>
            `插件名：${curr.name}\n状态：${curr.active ? "开启" : "关闭"}\n`
        )
        .join("\n"),
    ],
    true
  );
}

//bot设置 还原人格
async function restorePromptName(_: string, event: GroupMessageEvent) {
  const updateResult = await groupModel.updatePromptName(
    event.group_id,
    "猫娘"
  );
  if (updateResult === undefined) {
    await replyGroupMsg(event, [`人格还原失败，请联系管理员。`], true);
    return;
  }
  await replyGroupMsg(event, [`人格切换为猫娘。`], true);
}

//bot设置 人格
async function setPromptName(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["人格"]);
  if (msg === "") {
    await replyGroupMsg(
      event,
      [`命令错误。请使用“${botConf.trigger}设置”命令获取命令正确使用方式。`],
      true
    );
    return;
  }
  const ai = await aiModel.findOne(msg);
  if (ai === null) {
    await replyGroupMsg(
      event,
      [
        `系统未录入您输入的人格，请使用“${botConf.trigger}帮助 AI人格”命令获取可用的AI人格。`,
      ],
      true
    );
    return;
  }
  const updateResult = await groupModel.updatePromptName(event.group_id, msg);
  if (!updateResult) {
    await replyGroupMsg(event, [`AI人格更新失败，请联系群管理员。`], true);
    return;
  }
  await replyGroupMsg(event, [`AI人格变更为“${msg}”`], true);
}

//bot设置 自定义人格
async function setPrompt(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["自定义人格"]);
  if (msg === "") {
    await replyGroupMsg(
      event,
      [`命令错误。请使用“${botConf.trigger}设置”命令获取命令正确使用方式。`],
      true
    );
    return;
  }
  const updateResult = await groupModel.updateCustomPrompt(event.group_id, msg);
  if (!updateResult) {
    await replyGroupMsg(event, [`AI人格更新失败，请联系管理员。`], true);
    return;
  }
  await replyGroupMsg(event, [`AI人格变更为您定义的prompts`], true);
}

//bot设置 开启
async function active(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["开启"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(
      event,
      [`命令错误。请使用“${botConf.trigger}设置”命令获取命令正确使用方式。`],
      true
    );
    return;
  }
  const activeResult = await pluginSwitch(msg, event.group_id, true);
  if (activeResult.length === 0) {
    await replyGroupMsg(
      event,
      [
        `系统未录入您输入的插件名，请使用“${botConf.trigger}帮助“命令查询可启用的插件`,
      ],
      true
    );
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
      [`命令错误。请使用“${botConf.trigger}设置”命令获取命令正确使用方式。`],
      true
    );
    return;
  }
  const activeResult = await pluginSwitch(msg, event.group_id, false);
  if (activeResult.length === 0) {
    await replyGroupMsg(
      event,
      [
        `系统未录入您输入的插件名，请使用“${botConf.trigger}帮助“命令查询可关闭的插件`,
      ],
      true
    );
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
