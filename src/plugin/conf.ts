import { GroupMessageEvent } from "@icqqjs/icqq";
import * as aiModel from "@potato/bot/model/ai.ts";
import * as groupModel from "@potato/bot/model/group.ts";
import * as pluginModel from "@potato/bot/model/plugin.ts";
import botConf from "@potato/config/bot.json";
import { msgNoCmd, replyGroupMsg, secondCmd } from "../util/bot";
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
  const cmdList = [
    {
      name: "插件",
      comment: `使用“${botConf.trigger}设置 插件“命令了解如何设置插件`,
      auth: false,
      plugin: plugins,
    },
    {
      name: "人格",
      comment: `使用“${botConf.trigger}设置 人格“命令了解如何改变AI人格`,
      auth: false,
      plugin: ai,
    },
    {
      name: "推送",
      auth: true,
      comment: `使用“${botConf.trigger}设置 推送“命令了解如何控制主动推送功能`,
      plugin: push,
    },
  ];
  await secondCmd(`${botConf.trigger}设置`, msg, cmdList, event);
}

//bot设置 插件
async function plugins(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["插件"]);
  const cmdList = [
    {
      name: "开启",
      comment: `使用“${botConf.trigger}设置 插件 开启 插件名“命令开启插件\n插件名源自“${botConf.trigger}帮助”命令`,
      auth: true,
      plugin: pluginsActive,
    },
    {
      name: "关闭",
      comment: `使用“${botConf.trigger}设置 插件 关闭 插件名“命令关闭插件\n插件名源自“${botConf.trigger}帮助”命令`,
      auth: true,
      plugin: pluginsDisable,
    },
    {
      name: "状态",
      comment: `使用“${botConf.trigger}设置 插件 状态“命令查询当前插件状态`,
      auth: false,
      plugin: pluginsState,
    },
    {
      name: "升级",
      comment: `使用“${botConf.trigger}设置 插件 升级 插件文件名“命令升级选定插件`,
      auth: true,
      plugin: pluginsUpdate,
    },
  ];
  await secondCmd(`${botConf.trigger}设置 插件`, msg, cmdList, event);
}

//bot设置 人格
async function ai(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["人格"]);
  const cmdList = [
    {
      name: "列表",
      auth: false,
      comment: `使用“${botConf.trigger}设置 人格 列表“命令展示可以切换的人格名`,
      plugin: aiNameList,
    },
    {
      name: "切换",
      comment: `使用“${botConf.trigger}设置 人格 切换 人格名“命令切换聊天AI人格`,
      auth: false,
      plugin: aiChangeName,
    },
    {
      name: "自定义",
      auth: true,
      comment: `使用“${botConf.trigger}设置 人格 自定义 自定义的人格“命令设置聊天AI的自定义人格`,
      plugin: aiChangePrompt,
    },
    {
      name: "还原",
      auth: false,
      comment: `使用“${botConf.trigger}设置 人格 还原“命令还原默认AI人格`,
      plugin: aiRestoreName,
    },
  ];
  await secondCmd(`${botConf.trigger}设置 人格`, msg, cmdList, event);
}

//bot设置 推送
async function push(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["推送"]);
  const cmdList = [
    {
      name: "新闻",
      auth: true,
      comment: `使用“${botConf.trigger} 设置 推送 新闻 开启或关闭”命令控制新闻推送`,
      plugin: pushSwitch,
    },
    {
      name: "闲聊",
      auth: true,
      comment: `使用“${botConf.trigger} 设置 推送 闲聊 开启或关闭”命令控制闲聊推送`,
      plugin: pushSwitch,
    },
  ];
  await secondCmd(`${botConf.trigger}设置 推送`, msg, cmdList, event);
}

//bot设置 人格 列表
async function aiNameList(_: string, event: GroupMessageEvent) {
  const allPrompts = await aiModel.findAll();
  if (allPrompts.length === 0) {
    await replyGroupMsg(event, [`未发现可以切换的AI人格`]);
    return;
  }
  await replyGroupMsg(event, [
    `您可用的人格名：\n`,
    allPrompts
      .map((prompt, index) => `${index + 1}、${prompt.promptName}`)
      .join("\n"),
    `\n使用“${botConf.trigger}设置 人格 切换 人格名”命令切换AI人格`,
  ]);
}

//bot设置 人格 切换
async function aiChangeName(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["切换"]);
  if (msg === "") {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置 人格”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const aiFindOne = await aiModel.findOne(msg);
  if (aiFindOne === null) {
    await replyGroupMsg(event, [
      `系统未录入您输入的人格，请使用“${botConf.trigger}设置 人格 列表”命令获取可用的AI人格。`,
    ]);
    return;
  }
  await groupModel.updatePromptName(event.group_id, msg);
  await replyGroupMsg(event, [`AI人格变更为“${msg}”`]);
}

//bot设置 人格 自定义
async function aiChangePrompt(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["自定义"]);
  if (msg === "") {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置 人格”获取命令的正确使用方式。`,
    ]);
    return;
  }
  await groupModel.updateCustomPrompt(event.group_id, msg);
  await replyGroupMsg(event, [`AI人格切换为自定义人格`]);
}

//bot设置 人格 还原
async function aiRestoreName(_: string, event: GroupMessageEvent) {
  await groupModel.updatePromptName(event.group_id, "猫娘");
  await replyGroupMsg(event, [`人格切换为猫娘。`]);
}

//bot设置 插件 开启
async function pluginsActive(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["开启"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置 插件”获取命令的正确使用方式。`,
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

//bot设置 插件 关闭
async function pluginsDisable(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["关闭"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}设置 插件”获取命令的正确使用方式。`,
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

//bot设置 插件 状态
async function pluginsState(message: string, event: GroupMessageEvent) {
  const state = await pluginModel.findByGid(event.group_id);
  if (state.length === 0) {
    await replyGroupMsg(event, [
      `未查询到任何插件状态\n`,
      `插件在您首次使用的时候自动初始化，请您先使用插件\n`,
      `使用“${botConf.trigger}帮助”命令查询当前可用插件`,
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

//bot设置 升级
async function pluginsUpdate(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["升级"]);
  if (msg === "") {
    await replyGroupMsg(event, ["未输入升级需要的插件文件名。"]);
    return;
  }
  const plugin = reload(msg);
  if (plugin === undefined) {
    await replyGroupMsg(event, [`${msg}插件升级失败`]);
    return;
  }
  await replyGroupMsg(event, [`${msg}插件升级成功`]);
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

//bot设置 推送 xxx 开启/关闭
async function pushSwitch(
  message: string,
  event: GroupMessageEvent,
  pluginName: string
) {
  const msg = msgNoCmd(message, [pluginName]);
  if (msg.startsWith("开启")) {
    const pluginState = await pluginModel.updateActivePlugin(
      event.group_id,
      `${pluginName}推送`
    );
    if (pluginState === undefined) {
      await replyGroupMsg(event, [
        `开启群内${pluginName}推送功能失败，请联系管理员。`,
      ]);
      return;
    }
    await replyGroupMsg(event, [`您开启了群内${pluginName}推送功能`]);
    return;
  }
  if (msg.startsWith("关闭")) {
    const pluginState = await pluginModel.updateDisablePlugin(
      event.group_id,
      `${pluginName}推送`
    );
    if (pluginState === undefined) {
      await replyGroupMsg(event, [
        `关闭群内${pluginName}推送功能失败，请联系管理员。`,
      ]);
      return;
    }
    await replyGroupMsg(event, [`您关闭了群内${pluginName}推送功能`]);
    return;
  }
  await replyGroupMsg(event, [
    `命令错误。请使用“${botConf.trigger} 设置 推送”获取命令的正确使用方式。`,
  ]);
}

export { info };
