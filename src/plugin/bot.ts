import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import {
  getBotByUin,
  getBots,
  getMasterBot,
  msgNoCmd,
  replyGroupMsg,
  secondCmd,
  sendGroupMsg,
} from "../util/bot";

const info = {
  name: "机器人",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：机器人相关设置`,
    `使用“${botConf.trigger}机器人”命令了解如何设置机器人`,
  ],
  plugin: plugin,
};

//bot机器人
async function plugin(event: GroupMessageEvent) {
  if (!botConf.admin.includes(event.sender.user_id)) {
    await replyGroupMsg(event, ["机器人命令需要系统管理员权限"]);
    return;
  }
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const cmdList = [
    {
      name: "退群",
      comment: `使用“${botConf.trigger}机器人 退群“命令让机器人退出一个群`,
      auth: true,
      plugin: groupLeave,
    },
    {
      name: "广播",
      auth: true,
      comment: `使用“${botConf.trigger}机器人 广播“命令向所有群推送消息`,
      plugin: broadCast,
    },
  ];
  await secondCmd(`${botConf.trigger}机器人`, msg, cmdList, event);
}

async function groupLeave(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, ["退群"]);
  const gid = isNaN(Number.parseFloat(msg))
    ? undefined
    : Number.parseFloat(msg);
  if (gid === undefined) {
    await replyGroupMsg(event, ["输入想要退出的群号"]);
    return;
  }
  for (const bot of getBots()) {
    await bot.setGroupLeave(gid);
  }
  await replyGroupMsg(event, [`机器人退出了群 ${gid}`]);
}

async function broadCast(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, ["广播"]);
  if (msg === "") {
    await replyGroupMsg(event, ["输入想要广播的消息"]);
    return;
  }
  getMasterBot()
    .getGroupList()
    .forEach(async (group) => {
      await sendGroupMsg(getMasterBot(), group.group_id, [msg]);
    });
  await replyGroupMsg(event, ["消息广播完成"]);
}

export { info };
