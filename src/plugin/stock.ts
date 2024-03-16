import { GroupMessageEvent } from "@icqqjs/icqq";
import * as stockModel from "@potato/bot/model/stock.ts";
import * as userModel from "@potato/bot/model/user.ts";
import botConf from "@potato/config/bot.json";
import stockConf from "@potato/config/stock.json";
import { z } from "zod";
import { getMasterBot, msgNoCmd, replyGroupMsg, secondCmd } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "股票",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：卖买股票`,
    `使用“${botConf.trigger}股票”命令了解如何卖买股票。`,
  ],
  plugin: plugin,
};

//bot股票
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const cmdList = [
    {
      name: "查询",
      comment: `使用“${botConf.trigger}股票 查询 股票名称“命令查询一种股票的价格。`,
      auth: false,
      plugin: search,
    },
    {
      name: "买",
      comment: `使用“${botConf.trigger}股票 买 股票名称 您剩余资金的百分比（0-100）“命令购买一种股票。`,
      auth: false,
      plugin: buy,
    },
    {
      name: "卖",
      comment: `使用“${botConf.trigger}股票 卖 股票名称 您剩余股票的百分比（0-100）“命令出售一种股票。`,
      auth: false,
      plugin: sell,
    },
    {
      name: "背包",
      auth: false,
      comment: `使用“${botConf.trigger}股票 背包“命令查看您的资产。`,
      plugin: bag,
    },
    {
      name: "还原",
      auth: false,
      comment: `使用“${botConf.trigger}股票 还原“命令清空您拥有的所有股票并重置资产为1000元。`,
      plugin: restore,
    },
    {
      name: "榜单",
      auth: false,
      comment: `使用“${botConf.trigger}股票 榜单“命令查看本群资产前10名玩家。`,
      plugin: rank,
    },
  ];
  await secondCmd(`${botConf.trigger}股票`, msg, cmdList, event);
}

//bot 股票 查询
async function search(message: string, event: GroupMessageEvent) {
  const msg = msgNoCmd(message, ["查询"]);
  const stock = await find(msg);
  if (stock === undefined) {
    await replyGroupMsg(event, [
      `未查询到股票 ${msg} 的信息。请检查股票名或稍后重试。`,
    ]);
    return;
  }
  await replyGroupMsg(event, [
    `股票： ${msg} 代码：${stock.code} 的价格：${stock.price}`,
  ]);
}

//bot股票 买
async function buy(message: string, event: GroupMessageEvent) {
  const [stockName, perStr] = msgNoCmd(message, ["买"]).split(" ");
  const per = Number.parseInt(perStr || "");
  if (
    stockName === undefined ||
    perStr === undefined ||
    isNaN(per) ||
    per <= 0 ||
    per > 100
  ) {
    await replyGroupMsg(event, [
      `命令错误！请使用“${botConf.trigger}股票 买 股票名 您剩余资金的百分比(0-100)”命令购买一种股票。\n`,
      `注意“股票名”和“剩余资金百分比”需要用空格分隔。`,
    ]);
    return;
  }
  const findStock = await stockModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  const findUser = await userModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  const stock = await find(stockName);
  if (stock === undefined) {
    await replyGroupMsg(event, [
      `未查询到名为”${stockName}“的股票，请检查股票名。\n也可能是网络卡顿，如股票名正确，请稍后重试。`,
    ]);
    return;
  }
  const hasStock = findStock.stock.filter((stock) => stock.name === stockName);
  if (findStock.stock.length === 5 && hasStock.length === 0) {
    await replyGroupMsg(event, [`您最多购买5种股票，您已经购买了5种股票`]);
    return;
  }
  const buyNum = Math.floor((findUser.stockCoin * (per / 100)) / stock.price);
  if (buyNum === 0) {
    await replyGroupMsg(event, [`您的钱不够，连一股也买不了`]);
    return;
  }
  findUser.stockCoin = findUser.stockCoin - buyNum * stock.price;
  await findUser.save().catch((_) => undefined);
  await stockModel.updateStock(
    event.sender.user_id,
    event.group_id,
    stock.code,
    stock.name,
    buyNum,
    stock.price
  );
  await replyGroupMsg(event, [
    `您使用 ${(buyNum * stock.price).toFixed(2)} 金币购买了 ${buyNum} 股“${
      stock.name
    }“股票。`,
  ]);
}

//bot股票 卖
async function sell(message: string, event: GroupMessageEvent) {
  const [stockName, perStr] = msgNoCmd(message, ["卖"]).split(" ");
  const per = Number.parseInt(perStr || "");
  if (
    stockName === undefined ||
    perStr === undefined ||
    isNaN(per) ||
    per <= 0 ||
    per > 100
  ) {
    await replyGroupMsg(event, [
      `命令错误！请使用“${botConf.trigger}股票 卖 股票名 您剩余股票的百分比(0-100)”命令出售一种股票。\n`,
      `注意“股票名”和“剩余股票数量”需要用空格分隔。`,
    ]);
    return;
  }
  const stock = await find(stockName);
  if (stock === undefined) {
    await replyGroupMsg(event, [
      `未查询到名为”${stockName}“的股票，请检查股票名。\n也可能是网络卡顿，如股票名正确，请稍后重试。`,
    ]);
    return;
  }
  const findStock = await stockModel.findOneByCode(
    event.sender.user_id,
    event.group_id,
    stock.code
  );
  if (findStock === undefined) {
    await replyGroupMsg(event, [`您没有名为“${stock.name}“的股票。`]);
    return;
  }
  const saleNum = Math.floor(findStock.number * (per / 100));
  if (saleNum === 0) {
    await replyGroupMsg(event, [`您的股票不够，连一股也卖不了`]);
    return;
  }
  const findUser = await userModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  findUser.stockCoin += saleNum * stock.price;
  await findUser.save().catch((_) => undefined);
  await stockModel.updateStock(
    event.sender.user_id,
    event.group_id,
    stock.code,
    stock.name,
    saleNum * -1
  );
  await replyGroupMsg(event, [
    `您出售了 ${saleNum} 股 ${stock.name} 股票\n`,
    `收入 ${(saleNum * stock.price).toFixed(2)}金币\n`,
    `${stock.price >= findStock.price ? "净赚" : "净亏"} ${(
      Math.abs(stock.price - findStock.price) * saleNum
    ).toFixed(2)} 金币`,
  ]);
}

//bot股票 背包
async function bag(_: string, event: GroupMessageEvent) {
  const { stockCoin } = await userModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  const findStock = await stockModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  const stock = await Promise.all(
    findStock.stock.map(async (stock) => {
      const price = await find(stock.name);
      if (price === undefined) {
        return `-${stock.name}\n 代码：${stock.code}\n 数量：${stock.number}\n 均价：${stock.price}\n 现价：获取失败`;
      }
      return `-${stock.name}\n 代码：${stock.code}\n 数量：${
        stock.number
      }\n 均价：${stock.price.toFixed(2)}\n 现价：${price.price.toFixed(
        2
      )} \n 涨幅：${(((price.price - stock.price) / stock.price) * 100).toFixed(
        2
      )}%`;
    })
  );
  await replyGroupMsg(event, [
    `您的背包：\n`,
    `金币：${stockCoin.toFixed(2)} 枚`,
    stock.length ? "\n股票：\n" + stock.join("\n") : "",
  ]);
}

//bot股票 还原
async function restore(_: string, event: GroupMessageEvent) {
  const user = await userModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  user.stockCoin = 1000;
  await user.save().catch((_) => undefined);
  const stock = await stockModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  stock.stock = [];
  await stock.save().catch((_) => undefined);
  await replyGroupMsg(event, [
    `还原完成，您现在拥有1000金币。您的背包已被清空。`,
  ]);
}

//bot股票 榜单
async function rank(_: string, event: GroupMessageEvent) {
  const rank = await userModel.stockRank(event.group_id);
  if (rank.length === 0) {
    await replyGroupMsg(event, [`本群没人炒股`]);
    return;
  }
  const rankList = await Promise.all(
    rank.map(async (user) => {
      const member = await getMasterBot().getGroupMemberInfo(
        event.group_id,
        user.uin
      );
      return `${member.nickname} 拥有 ${user.stockCoin.toFixed(2)} 金币`;
    })
  );
  await replyGroupMsg(event, [
    `财富榜前10名玩家：\n`,
    rankList.filter((_, i) => i < 10).join("\n"),
  ]);
}

async function find(name: string) {
  const fetchStock: any = await createFetch(stockConf.api + name, 5000, {
    headers: { cookie: stockConf.cookie },
  })
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const stockSchema = z.object({
    Result: z.object({
      stock: z
        .array(
          z.object({
            name: z.string(),
            price: z.string(),
            code: z.string(),
          })
        )
        .min(1),
    }),
  });
  const safeStock = stockSchema.safeParse(fetchStock);
  if (!safeStock.success || !safeStock.data.Result.stock[0]) {
    return undefined;
  }
  return {
    name: safeStock.data.Result.stock[0].name,
    code: safeStock.data.Result.stock[0].code,
    price: Number.parseFloat(safeStock.data.Result.stock[0].price),
  };
}

export { info };
