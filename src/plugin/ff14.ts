import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import ff14Conf from "@potato/config/ff14.json";
import { z } from "zod";
import { msgNoCmd, replyGroupMsg, secondCmd } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "ff14",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：最终幻想14相关查询`,
    `使用“${botConf.trigger}ff14”命令了解如何查询最终换想14游戏资讯`,
  ],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const cmdList = [
    {
      name: "板子",
      comment: `使用“${botConf.trigger}ff14 板子 猫|猪|狗|鸟 商品名“命令查询所有服务器的市场布告板商品最低价格`,
      auth: false,
      plugin: biliBoard,
    },
  ];
  await secondCmd(`${botConf.trigger}ff14`, msg, cmdList, event);
}

//botff14板子
async function biliBoard(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["板子"]);
  const gameServer = [
    ["猫", "猫小胖"],
    ["猪", "莫古力"],
    ["狗", "豆豆柴"],
    ["鸟", "陆行鸟"],
  ];
  const region = gameServer.filter((server) =>
    msg.startsWith(server[0] || "")
  )[0];
  if (
    region === undefined ||
    region.length == 0 ||
    region[0] === undefined ||
    region[1] === undefined
  ) {
    await replyGroupMsg(event, [
      `命令错误。请使用“${botConf.trigger}ff14”获取命令的正确使用方式。`,
    ]);
    return;
  }
  const goods = msgNoCmd(msg, [region[0]]);
  const info = await goodsInfo(region[1], goods);
  if (info === undefined) {
    await replyGroupMsg(event, [
      `未查询到“${goods}”商品信息，请检查商品名是否正确。`,
    ]);
    return;
  }
  if (info.hq.average === 0 && info.nq.average === 0) {
    await replyGroupMsg(event, [`您查询的“${goods}”商品目前全区缺货。`]);
    return;
  }
  await replyGroupMsg(event, [
    `您查询的“${info.item}”商品信息：\n`,
    info.hq.average !== 0
      ? `-高品质：\n  服务器：${info.hq.worldName}\n  卖家：${info.hq.retainerName}\n  均价：${info.hq.average}\n  现价：${info.hq.pricePerUnit}\n  数量：${info.hq.quantity}\n  总价：${info.hq.total}\n  税费：${info.hq.tax}\n`
      : "",
    info.nq.average !== 0
      ? `-普通品质：\n  服务器：${info.nq.worldName}\n  卖家：${info.nq.retainerName}\n  均价：${info.nq.average}\n  现价：${info.nq.pricePerUnit}\n  数量：${info.nq.quantity}\n  总价：${info.nq.total}\n  税费：${info.nq.tax}`
      : "",
  ]);
}

async function goodsInfo(region: string, goods: string) {
  const fetchItemMeta = await createFetch(
    ff14Conf.api.goods.meta +
      new URLSearchParams({
        indexes: "item",
        sort_order: "asc",
        limit: "1",
        columns: "ID,Name",
        string: goods,
      }),
    10000
  )
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const itemMetaSchema = z.object({
    Results: z
      .array(
        z.object({
          ID: z.number(),
          Name: z.string(),
        })
      )
      .min(1),
  });
  const itemMeta = itemMetaSchema.safeParse(fetchItemMeta);
  if (!itemMeta.success) {
    return undefined;
  }
  const fetchItem = await fetch(
    `${ff14Conf.api.goods.item}/${encodeURI(region)}/${
      itemMeta.data.Results[0]?.ID
    }`
  )
    .then((v) => v.json())
    .catch((_) => undefined);
  const itemSchema = z.object({
    averagePriceNQ: z.number(),
    averagePriceHQ: z.number(),
    minPriceNQ: z.number(),
    minPriceHQ: z.number(),
    listings: z
      .array(
        z.object({
          hq: z.boolean(),
          pricePerUnit: z.number(),
          worldName: z.string(),
          total: z.number(),
          quantity: z.number(),
          retainerName: z.string(),
          tax: z.number(),
        })
      )
      .min(1),
  });
  const item = itemSchema.safeParse(fetchItem);
  if (!item.success) {
    return undefined;
  }
  const stock = {
    averagePriceNQ: item.data.averagePriceNQ,
    averagePriceHQ: item.data.averagePriceHQ,
    minPriceNQ: item.data.listings.filter(
      (v) => v.hq === false && v.pricePerUnit === item.data.minPriceNQ
    )[0],
    minPriceHQ: item.data.listings.filter(
      (v) => v.hq === true && v.pricePerUnit === item.data.minPriceHQ
    )[0],
  };
  return {
    item: itemMeta.data.Results[0]?.Name,
    hq: {
      average: stock.averagePriceHQ,
      worldName: stock.minPriceHQ?.worldName,
      total: stock.minPriceHQ?.total,
      pricePerUnit: stock.minPriceHQ?.pricePerUnit,
      quantity: stock.minPriceHQ?.quantity,
      tax: stock.minPriceHQ?.tax,
      retainerName: stock.minPriceHQ?.retainerName,
    },
    nq: {
      average: item.data.averagePriceNQ,
      worldName: stock.minPriceNQ?.worldName,
      total: stock.minPriceNQ?.total,
      pricePerUnit: stock.minPriceNQ?.pricePerUnit,
      quantity: stock.minPriceNQ?.quantity,
      tax: stock.minPriceNQ?.tax,
      retainerName: stock.minPriceNQ?.retainerName,
    },
  };
}

export { info };
