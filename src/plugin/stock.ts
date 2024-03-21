import { GroupMessageEvent } from "@icqqjs/icqq";
import * as stockModel from "@potato/bot/model/stock.ts";
import * as userModel from "@potato/bot/model/user.ts";
import * as aiModel from "@potato/bot/model/ai.ts";
import botConf from "@potato/config/bot.json";
import stockConf from "@potato/config/stock.json";
import { z } from "zod";
import { getMasterBot, msgNoCmd, replyGroupMsg, secondCmd } from "../util/bot";
import { createFetch } from "../util/http";
import { createChat } from "./chat";

const info = {
  name: "股票",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：交易股票`,
    `使用“${botConf.trigger}股票”命令了解如何交易股票。`,
  ],
  plugin: plugin,
};

//bot股票
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const cmdList = [
    {
      name: "查询",
      comment: `使用“${botConf.trigger}股票 查询 股票代码或名称“命令查询一种股票的价格信息。`,
      auth: false,
      plugin: search,
    },
    {
      name: "买",
      comment: `使用“${botConf.trigger}股票 买 股票代码或名称 您资金余量的百分比（0-100）“命令购买一种股票。`,
      auth: false,
      plugin: buy,
    },
    {
      name: "卖",
      comment: `使用“${botConf.trigger}股票 卖 股票代码 对应股票余量的百分比（0-100）“命令出售一种股票。`,
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
      comment: `使用“${botConf.trigger}股票 还原“命令清空您拥有的所有股票并重置资产为1000金币。`,
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
      `未查询到股票 ${msg} 的信息。请检查股票代码或名称，或者稍后重试。`,
    ]);
    return;
  }
  const stockResult = [
    `股票名称：${msg}\n`,
    `代码：${stock.code}\n`,
    `状态：${stock.stockStatusInfoChs}(${stock.stockStatusInfo})\n`,
    `市值：${stock.capitalization}\n`,
    `成交量：${stock.amount}\n`,
    `振幅：${stock.amplitudeRatio}\n`,
    `周转率：${stock.turnoverRatio}\n`,
    `市盈率：${stock.peRate}\n`,
    `市净率：${stock.pbRate}\n`,
    `${Number.parseFloat(stock.ratio) >= 0 ? "涨幅" : "跌幅"}：${
      stock.ratio
    }\n`,
    `${Number.parseFloat(stock.increase) >= 0 ? "涨" : "跌"}：${
      stock.increase
    } 金币\n`,
    `价格：${stock.price} 金币`,
  ];
  const ai = await aiModel.findOne("金融分析师");
  if (ai !== null) {
    const aiResult = await createChat(stockResult.join(""), ai.prompt);
    stockResult.push(`\n————\nAI分析：${aiResult}`);
  }
  await replyGroupMsg(event, stockResult);
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
      `命令错误！请使用“${botConf.trigger}股票 买 股票代码或名称 您资金余量的百分比（0-100）“命令购买一种股票。\n`,
      `注意“股票代码或名称”和“您资金余量的百分比”之间需要用空格分隔。`,
    ]);
    return;
  }

  const stock = await find(stockName);
  if (stock === undefined) {
    await replyGroupMsg(event, [
      `未查询到名为”${stockName}“的股票，请检查“股票代码或名称“是否正确。\n如“股票代码或名称“正确，请稍后重试。`,
    ]);
    return;
  }
  const findStock = await stockModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  const hasStock = findStock.stock.filter(
    (stocks) => stocks.code === stock.code
  );
  if (findStock.stock.length === 5 && hasStock.length === 0) {
    await replyGroupMsg(event, [
      `您最多购买5种股票，您已经购买了5种股票，您不能购买更多种类的股票。`,
    ]);
    return;
  }
  const findUser = await userModel.findOrAddOne(
    event.sender.user_id,
    event.group_id
  );
  const buyNum = Math.floor((findUser.stockCoin * (per / 100)) / stock.price);
  if (buyNum === 0) {
    await replyGroupMsg(event, [`您的金币不够，连一股也买不了`]);
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
    `您使用 ${(buyNum * stock.price).toFixed(2)} 枚金币以每股 ${
      stock.price
    } 金币的价格购买了 ${buyNum} 股“${stock.name}“股票。`,
  ]);
}

//bot股票 卖
async function sell(message: string, event: GroupMessageEvent) {
  const [code, perStr] = msgNoCmd(message, ["卖"]).split(" ");
  const per = Number.parseInt(perStr || "");
  if (
    code === undefined ||
    perStr === undefined ||
    isNaN(per) ||
    per <= 0 ||
    per > 100
  ) {
    await replyGroupMsg(event, [
      `命令错误！请使用“${botConf.trigger}股票 卖 股票代码 对应股票余量的百分比（0-100）“命令出售一种股票。\n`,
      `注意“股票代码或名称”和“对应股票余量的百分比”之间需要用空格分隔。`,
    ]);
    return;
  }
  const stock = await find(code);
  if (stock === undefined) {
    await replyGroupMsg(event, [
      `未查询到代码为”${code}“的股票\n请使用“${botConf.trigger}股票 背包”命令在背包内检查“股票代码“是否正确。\n如“股票代码“正确，请稍后重试。`,
    ]);
    return;
  }
  const findStock = await stockModel.findOneByCode(
    event.sender.user_id,
    event.group_id,
    code
  );
  if (findStock === undefined) {
    await replyGroupMsg(event, [
      `您没有代码为“${code}“的股票。\n请使用“${botConf.trigger}股票 背包”命令在背包内检查“股票代码“是否正确。`,
    ]);
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
    `您以每股 ${stock.price} 枚金币的价格出售了 ${saleNum} 股 ${stock.name} 股票\n`,
    `收入 ${(saleNum * stock.price).toFixed(2)} 金币\n`,
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
      )}\n 涨幅：${(((price.price - stock.price) / stock.price) * 100).toFixed(
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
    await replyGroupMsg(event, [`本群暂时没人炒股`]);
    return;
  }
  const rankList = await Promise.all(
    rank.map(async (user) => {
      const member = await getMasterBot().getGroupMemberInfo(
        event.group_id,
        user.uin
      );
      let coin = 0;
      const stock = await stockModel.findOrAddOne(user.uin, event.group_id);
      stock.stock.forEach((sto) => {
        coin += sto.number * sto.price;
      });
      return {
        user: member.nickname,
        coin: coin + user.stockCoin,
      };
    })
  ).catch((_) => undefined);
  if (rankList === undefined) {
    return;
  }
  const sortList = rankList
    .sort((a, b) => b.coin - a.coin)
    .filter((_, i) => i < 10)
    .map((list) => `${list.user} 拥有 ${list.coin.toFixed(2)} 金币`);
  await replyGroupMsg(event, [`财富榜前10名玩家：\n`, sortList.join("\n")]);
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
            //股票名
            name: z.string(),
            //价格
            price: z.string(),
            //代码
            code: z.string(),
            //价格变化
            increase: z.string(),
            //价格变化率
            ratio: z.string(),
            //振幅
            amplitudeRatio: z.string(),
            //周转率
            turnoverRatio: z.string(),
            //市盈率
            peRate: z.string(),
            //市净率
            pbRate: z.string(),
            //状态
            stockStatusInfo: z.string(),
            //成交量
            amount: z.string(),
            //市值
            capitalization: z.string(),
          })
        )
        .min(1),
    }),
  });
  const safeStock = stockSchema.safeParse(fetchStock);
  if (!safeStock.success || !safeStock.data.Result.stock[0]) {
    return undefined;
  }
  const stockResult = safeStock.data.Result.stock[0];
  const stockStatusInfoChs = (info: string) => {
    switch (info) {
      case "ADD":
        return "产品未上市";
      case "START":
        return "启动";
      case "OCALL":
        return "开市集合竞价";
      case "TRADE":
        return "连续自动撮合";
      case "SUSP":
        return "停牌";
      case "CLOSE":
        return "闭市";
      case "ENDTR":
        return "交易结束";
      default:
        return info;
    }
  };
  return {
    ...stockResult,
    price: Number.parseFloat(stockResult.price),
    stockStatusInfoChs: stockStatusInfoChs(stockResult.stockStatusInfo),
  };
}

export { info };
