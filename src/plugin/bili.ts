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
import { getBots, msgNoCmd, replyGroupMsg, sendGroupMsg } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "订阅",
  type: "plugin",
  defaultActive: true,
  comment: [
    `${botConf.trigger}订阅\n说明：向群内推送b站up主的开播通知和动态\n使用“${botConf.trigger}订阅”了解如何订阅b站up主。`,
  ],
  plugin: plugin,
};

schedule.scheduleJob(`0 */5 * * * *`, async () => {
  const biliFindAll = await biliModel.findAll();
  biliFindAll.forEach(async (bili) => {
    const pluginState = await pluginModel.findOne(bili.gid, "订阅");
    if (pluginState === null) {
      return;
    }
    const live = await findLive(bili.rid);
    const dynamic = await findDynamic(bili.mid);
    if (
      live !== undefined &&
      dayjs().subtract(5, "minute").isBefore(dayjs(live.pubDate))
    ) {
      await sendGroupMsg(getBots()[0], bili.gid, [
        `【${bili.name}】正在直播！\n`,
        `标题：${live.title}\n`,
        `传送门：${live.link}`,
      ]);
    }
    if (
      dynamic &&
      dayjs().subtract(5, "minute").isBefore(dayjs(dynamic.pubDate))
    ) {
      await sendGroupMsg(getBots()[0], bili.gid, [
        `【${bili.name}】 有新动态！\n`,
        `动态：${dynamic.description}\n`,
        `传送门：${dynamic.link}`,
      ]);
    }
  });
});

async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const secondCmd = [
    {
      name: "新增",
      comment: `使用“${botConf.trigger}订阅 新增 up主昵称“命令新增订阅up主`,
      auth: true,
      plugin: addSub,
    },
    {
      name: "取消",
      comment: `使用“${botConf.trigger}订阅 取消 up主昵称“命令取消订阅up主`,
      auth: true,
      plugin: removeSub,
    },

    {
      name: "列表",
      comment: `使用“${botConf.trigger}列表“命令展示已订阅up主列表`,
      auth: false,
      plugin: subList,
    },
  ];
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
    return;
  }
  const intro = secondCmd
    .map(
      (cmd) =>
        `功能：${cmd.name}\n说明：${cmd.comment}\n需要群管权限:${
          cmd.auth ? "是" : "否"
        }`
    )
    .join("\n\n");
  await replyGroupMsg(event, [intro], true);
}

async function addSub(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["新增"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(
      event,
      [`命令错误。请使用“${botConf.trigger}订阅”获取命令的正确使用方式。`],
      true
    );
    return;
  }
  const users = await Promise.all(
    msg.map(async (up) => {
      const user = await findUser(up);
      if (user?.uname !== up) {
        return undefined;
      }
      await biliModel.add(user.uname, event.group_id, user.mid, user.room_id);
      return up;
    })
  ).then((users) => users.filter((user) => user !== undefined));
  if (users.length === 0) {
    await replyGroupMsg(
      event,
      [`新增订阅失败，请检查up主昵称是否拼写正确。`],
      true
    );
    return;
  }
  await replyGroupMsg(
    event,
    [`新增订阅成功，本次新增订阅：\n`, users.join("\n")],
    true
  );
}

async function removeSub(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["取消"]).split(" ");
  if (msg.length === 0) {
    await replyGroupMsg(
      event,
      [`命令错误。请使用“${botConf.trigger}订阅”获取命令的正确使用方式。`],
      true
    );
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
    await replyGroupMsg(
      event,
      [`取消订阅失败，请检查up主昵称是否拼写正确。`],
      true
    );
    return;
  }
  await replyGroupMsg(
    event,
    [`取消订阅成功，本次取消订阅：\n`, users.join("\n")],
    true
  );
}

async function subList(_: string, event: GroupMessageEvent) {
  const findByGid = await biliModel.findByGid(event.group_id);
  if (findByGid.length === 0) {
    await replyGroupMsg(
      event,
      [
        `本群还未订阅过任何up主。\n如需订阅up主，请参考“${botConf.trigger}订阅”命令。`,
      ],
      true
    );
    return;
  }
  await replyGroupMsg(
    event,
    [
      "本群订阅过的b站up主列表：\n",
      findByGid.map((sub) => sub.name).join("\n"),
    ],
    true
  );
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
      result: z.array(
        z.object({
          uname: z.string(),
          mid: z.number(),
          room_id: z.number(),
        })
      ),
    }),
  });
  const userParse = userSchema.safeParse(userInfo);
  if (!userParse.success) {
    return undefined;
  }
  return userParse.data.data.result[0];
}

async function findLive(room_id: number) {
  const roomInfo = await createFetch(
    `${biliConf.api.live}${room_id}`,
    5000
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
    5000
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
        item: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            pubDate: z.string(),
            link: z.string(),
          })
        ),
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
    description: cheerio.load(dynamicItem?.description || "空").text(),
  };
}

export { info };
