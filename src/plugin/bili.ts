import { GroupMessageEvent } from "@icqqjs/icqq";
import * as biliModel from "@potato/bot/model/bili.ts";
import * as pluginModel from "@potato/bot/model/plugin.ts";
import biliConf from "@potato/config/bili.json";
import botConf from "@potato/config/bot.json";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import schedule from "node-schedule";
import { z } from "zod";
import {
  getMasterBot,
  msgNoCmd,
  replyGroupMsg,
  secondCmd,
  sendGroupMsg,
} from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "订阅",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：向群内推送b站up主的开播通知和动态`,
    `使用“${botConf.trigger}订阅”了解如何订阅b站up主`,
  ],
  plugin: plugin,
};

schedule.scheduleJob(`0 0 0 */1 * *`, async () => {
  const biliFindAll = await biliModel.findAll();
  biliFindAll.forEach(async (bili) => {
    if (bili.rid === 0) {
      const user = await findUser(bili.name);
      if (user === undefined || user.room_id === 0) {
        return;
      }
      await biliModel.updateRid(bili.mid, user.room_id);
    }
  });
});

schedule.scheduleJob(`0 */${biliConf.frequency} * * * *`, async () => {
  getMasterBot()
    .getGroupList()
    .forEach(async (group) => {
      const pluginState = await pluginModel.findOrAddOne(
        group.group_id,
        "订阅推送",
        true
      );
      if (pluginState.active === false) {
        return;
      }
      const biliGroup = await biliModel.findByGid(group.group_id);
      biliGroup.forEach(async (bili) => {
        const live = await findLive(bili.rid);
        const dynamic = await findDynamic(bili.mid);
        if (
          live !== undefined &&
          dayjs()
            .subtract(biliConf.frequency, "minute")
            .isBefore(dayjs(live.pubDate))
        ) {
          await sendGroupMsg(getMasterBot(), bili.gid, [
            `【${bili.name}】正在直播！\n`,
            `标题：${live.title}\n`,
            `传送门：${live.link}`,
          ]);
        }
        if (
          dynamic !== undefined &&
          dayjs()
            .subtract(biliConf.frequency, "minute")
            .isBefore(dayjs(dynamic.pubDate))
        ) {
          await sendGroupMsg(getMasterBot(), bili.gid, [
            `【${bili.name}】 有新动态！\n`,
            `动态：${dynamic.description}\n`,
            `传送门：${dynamic.link}`,
          ]);
        }
      });
    });
});

async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const cmdList = [
    {
      name: "新增",
      comment: `使用“${botConf.trigger}订阅 新增 up主昵称“命令新增订阅up主`,
      auth: true,
      plugin: subAdd,
    },
    {
      name: "取消",
      comment: `使用“${botConf.trigger}订阅 取消 up主昵称“命令取消订阅up主`,
      auth: true,
      plugin: subRemove,
    },
    {
      name: "列表",
      comment: `使用“${botConf.trigger}订阅 列表“命令展示已订阅up主列表`,
      auth: false,
      plugin: subList,
    },
    {
      name: "查询",
      comment: `使用“${botConf.trigger}订阅 查询“命令查询up主直播状态`,
      auth: false,
      plugin: liveSearch,
    },
  ];
  await secondCmd(`${botConf.trigger}订阅`, msg, cmdList, event);
}

async function liveSearch(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["查询"]);
  if (msg.length === 0) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}订阅”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const user = await findUser(msg);
  if (user === undefined) {
    await replyGroupMsg(event, [`没查询到up主"${msg}"`]);
    return;
  }
  const liveState = await findLive(user.room_id);
  if (liveState === undefined) {
    await replyGroupMsg(event, [`没查询到直播间"${user.room_id}"的信息`]);
    return;
  }
  await replyGroupMsg(event, [
    `up主"${user.uname}"的直播信息：\n`,
    `标题：${liveState.title}\n`,
    `简介：${liveState.description}\n`,
    `开播时间：${liveState.pubDate}`,
    `直播间链接：${liveState.link}`,
  ]);
}

//bot订阅 新增
async function subAdd(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["新增"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}订阅”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const users = await Promise.all(
    msg.map(async (up) => {
      const user = await findUser(up);
      if (user === undefined || user.uname !== up) {
        return undefined;
      }
      await biliModel.add(user.uname, event.group_id, user.mid, user.room_id);
      return up;
    })
  ).then((users) => users.filter((user) => user !== undefined));
  if (users.length === 0) {
    await replyGroupMsg(event, [`新增订阅失败，请检查up主昵称是否拼写正确。`]);
    return;
  }
  await replyGroupMsg(event, [
    `新增订阅成功，本次新增订阅：\n`,
    users.join("\n"),
  ]);
}

//bot订阅 取消
async function subRemove(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["取消"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}订阅”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const users = await Promise.all(
    msg.map(async (up) => {
      const removeByName = await biliModel.removeByName(up);
      if (removeByName === undefined) {
        return undefined;
      }
      return up;
    })
  ).then((users) => users.filter((user) => user !== undefined));
  if (users.length === 0) {
    await replyGroupMsg(event, [`取消订阅失败，请检查up主昵称是否拼写正确。`]);
    return;
  }
  await replyGroupMsg(event, [
    `取消订阅成功，本次取消订阅：\n`,
    users.join("\n"),
  ]);
}

async function subList(_: string, event: GroupMessageEvent) {
  const findByGid = await biliModel.findByGid(event.group_id);
  if (findByGid.length === 0) {
    await replyGroupMsg(event, [
      `本群还未订阅过任何up主。\n如需订阅up主，请参考“${botConf.trigger}订阅”命令。`,
    ]);
    return;
  }
  await replyGroupMsg(event, [
    "本群订阅过的b站up主列表：\n",
    findByGid.map((sub) => sub.name).join("\n"),
  ]);
}

async function findUser(userName: string) {
  const userInfo = await createFetch(`${biliConf.api.user}${userName}`, 5000, {
    headers: {
      cookie: biliConf.cookie,
    },
  })
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  if (!userInfo) {
    return undefined;
  }
  const userSchema = z.object({
    data: z.object({
      result: z
        .array(
          z.object({
            uname: z.string(),
            mid: z.number(),
            room_id: z.number(),
          })
        )
        .min(1),
    }),
  });
  const userParse = userSchema.safeParse(userInfo);
  if (!userParse.success) {
    return undefined;
  }
  return userParse.data.data.result[0];
}

async function findLive(room_id: number) {
  if (room_id === 0) {
    return undefined;
  }
  const roomInfo = await createFetch(
    `${biliConf.api.live}${room_id}`,
    50000
  ).then(async (resp) => {
    const text = await resp?.text();
    if (text === undefined) {
      return undefined;
    }
    return new XMLParser().parse(text);
  });
  const roomSchema = z.object({
    rss: z.object({
      channel: z.object({
        item: z.object({
          title: z.string(),
          description: z.string(),
          pubDate: z.string(),
          link: z.string(),
        }),
      }),
    }),
  });
  const roomParse = roomSchema.safeParse(roomInfo);
  if (!roomParse.success) {
    return undefined;
  }
  const liveResult = roomParse.data.rss.channel.item;
  return {
    ...liveResult,
    title: liveResult.title.split(" ")[0],
  };
}

async function findDynamic(mid: number) {
  const dynamicInfo: any = await createFetch(
    `${biliConf.api.dynamic}${mid}`,
    50000
  ).then(async (resp) => {
    const text = await resp?.text();
    if (text === undefined) {
      return undefined;
    }
    return new XMLParser().parse(text);
  });
  const dynamicSchema = z.object({
    rss: z.object({
      channel: z.object({
        item: z
          .array(
            z.object({
              title: z.string(),
              description: z.string(),
              pubDate: z.string(),
              link: z.string(),
            })
          )
          .min(1),
      }),
    }),
  });
  const dynamicParse = dynamicSchema.safeParse(dynamicInfo);
  if (!dynamicParse.success) {
    return undefined;
  }
  const dynamicItem = dynamicParse.data.rss.channel.item[0];
  return {
    ...dynamicItem,
    description: cheerio
      .load(dynamicItem?.description || "空")
      .text()
      .replaceAll("\n\n", "\n"),
  };
}

export { info };
