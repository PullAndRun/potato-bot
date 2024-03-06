import { GroupMessageEvent } from "@icqqjs/icqq";
import * as aiModel from "@potato/bot/model/ai.ts";
import * as groupModel from "@potato/bot/model/group.ts";
import * as pluginModel from "@potato/bot/model/plugin.ts";
import botConf from "@potato/config/bot.json";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { reload } from "../util/plugin";

const info = {
  name: "设置",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：设置机器人各项功能`,
    `使用“${botConf.trigger}设置”命令了解如何设置机器人`,
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
      comment: `使用“${botConf.trigger}设置 关闭插件 插件名“命令关闭插件\n插件名源自“${botConf.trigger}帮助”命令`,
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
      name: "升级插件",
      comment: `使用“${botConf.trigger}设置 升级插件“命令升级选定插件`,
      auth: true,
      plugin: updatePlugin,
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
    {
      name: "推送",
      auth: true,
      comment: `使用“${botConf.trigger}设置 推送“命令了解如何开关主动推送功能`,
      plugin: push,
    },
  ];
  for (const cmd of secondCmd) {
    if (!msg.startsWith(cmd.name)) {
      continue;
    }
    if (
      cmd.auth &&
      event.sender.role === "member" &&
      !botConf.admin.includes(event.sender.user_id)
    ) {
      await replyGroupMsg(event, [
        "您使用的命令需要群管理员权限，请联系群管理员。",
      ]);
      break;
    }
    cmd.plugin(msg, event);
    return;
  }
  const intro = secondCmd
    .map(
      (cmd) =>
        `指令：${botConf.trigger} ${info.name} ${cmd.name}\n说明：${
          cmd.comment
        }\n需要管理员权限:${cmd.auth ? "是" : "否"}`
    )
    .join("\n\n");
  await replyGroupMsg(event, [intro]);
}

//bot设置 升级插件
async function updatePlugin(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["升级插件"]);
  if (msg === "") {
    await replyGroupMsg(event, ["未输入升级需要的插件文件名。"]);
    return;
  }
  const plugin = reload(msg);
  if (plugin === undefined) {
    await replyGroupMsg(event, ["升级失败"]);
    return;
  }
  await replyGroupMsg(event, ["升级成功"]);
}

//bot设置 推送
async function push(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["推送"]);
  const secondCmd = [
    {
      name: "新闻",
      comment: `${botConf.trigger} 设置 推送 新闻 开启或关闭`,
      plugin: pushSwitch,
    },
    {
      name: "闲聊",
      comment: `${botConf.trigger} 设置 推送 闲聊 开启或关闭`,
      plugin: pushSwitch,
    },
  ];
  for (const cmd of secondCmd) {
    if (!msg.startsWith(cmd.name)) {
      continue;
    }
    cmd.plugin(msg, cmd.name, event);
    return;
  }
  const intro = secondCmd
    .map(
      (cmd) =>
        `指令：${botConf.trigger} ${info.name} 推送 ${cmd.name}\n说明：${cmd.comment}\n需要管理员权限:是`
    )
    .join("\n\n");
  await replyGroupMsg(event, [intro]);
}

//bot设置 推送 xxx 开启/关闭
async function pushSwitch(
  message: string,
  type: string,
  event: GroupMessageEvent
) {
  const msg = msgNoCmd(message, [type]);
  if (msg.startsWith("开启")) {
    const pluginState = await pluginModel.updateActivePlugin(
      event.group_id,
      `${type}推送`
    );
    if (pluginState === undefined) {
      await replyGroupMsg(event, [
        `开启群内${type}推送功能失败，请联系管理员。`,
      ]);
      return;
    }
    await replyGroupMsg(event, [`您开启了群内${type}推送功能`]);
    return;
  }
  if (msg.startsWith("关闭")) {
    const pluginState = await pluginModel.updateDisablePlugin(
      event.group_id,
      `${type}推送`
    );
    if (pluginState === undefined) {
      await replyGroupMsg(event, [
        `关闭群内${type}推送功能失败，请联系管理员。`,
      ]);
      return;
    }
    await replyGroupMsg(event, [`您关闭了群内${type}推送功能`]);
    return;
  }
  await replyGroupMsg(event, [
    `命令错误。请使用“${botConf.trigger} 设置 推送”获取命令的正确使用方式。`,
  ]);
}

//bot设置 插件状态
async function pluginState(message: string, event: GroupMessageEvent) {
  const state = await pluginModel.findByGid(event.group_id);
  if (state.length === 0) {
    await replyGroupMsg(event, [
      `未查询到任何插件状态\n插件在您首次使用的时候自动初始化\n请您先使用插件\n使用“${botConf.trigger}帮助”命令查询可使用的插件`,
    ]);
    return;
  }
  await replyGroupMsg(event, [
    state
      .filter((v) => v.name !== "")
      .map(
        (curr) => `插件名：${curr.name}\n状态：${curr.active ? "开启" : "关闭"}`
      )
      .join("\n\n"),
  ]);
}

//bot设置 还原人格
async function restorePromptName(_: string, event: GroupMessageEvent) {
  const updateResult = await groupModel.updatePromptName(
    event.group_id,
    "猫娘"
  );
  await replyGroupMsg(event, [`人格切换为猫娘。`]);
}

//bot设置 人格
async function setPromptName(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["人格"]);
  if (msg === "") {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const ai = await aiModel.findOne(msg);
  if (ai === null) {
    await replyGroupMsg(event, [
      `系统未录入您输入的人格，请使用“${botConf.trigger}帮助 AI人格”命令获取可用的AI人格。`,
    ]);
    return;
  }
  await groupModel.updatePromptName(event.group_id, msg);
  await replyGroupMsg(event, [`AI人格变更为“${msg}”`]);
}

//bot设置 自定义人格
async function setPrompt(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["自定义人格"]);
  if (msg === "") {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置”获取命令的正确使用方式。`,
    ]);
    return;
  }
  await groupModel.updateCustomPrompt(event.group_id, msg);
  await replyGroupMsg(event, [`AI人格变更为您定义的prompts`]);
}

//bot设置 开启插件
async function active(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["开启插件"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const activeResult = await pluginsSwitch(msg, event.group_id, true);
  if (activeResult.length === 0) {
    await replyGroupMsg(event, [
      `系统未录入您输入的插件名，请使用“${botConf.trigger}帮助“命令查询可启用的插件`,
    ]);
    return;
  }
  await replyGroupMsg(event, [`已开启插件：${activeResult.join(" ")}`]);
}

//bot设置 关闭插件
async function disable(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["关闭插件"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const activeResult = await pluginsSwitch(msg, event.group_id, false);
  if (activeResult.length === 0) {
    await replyGroupMsg(event, [
      `系统未录入您输入的插件名，请使用“${botConf.trigger}帮助“命令查询可关闭的插件`,
    ]);
    return;
  }
  await replyGroupMsg(event, [`已关闭插件：${activeResult.join(" ")}`]);
}

async function pluginsSwitch(
  pluginNames: string[],
  group_id: number,
  active: boolean
) {
  return Promise.all(
    pluginNames.map(async (pluginName) => {
      return await pluginModel.pluginSwitch(group_id, pluginName, active);
    })
  ).then((names) =>
    names
      .filter((name): name is pluginModel.Plugin => name !== undefined)
      .map((plugin) => plugin.name)
  );
}

export { info };
