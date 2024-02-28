import { Client, Sendable, createClient } from "@icqqjs/icqq";
import * as pluginUtil from "@potato/bot/util/plugin.ts";
import botConf from "@potato/config/bot.json";
import consola from "consola";
import schedule from "node-schedule";
import * as pluginModel from "../model/plugin.ts";
import { findActiveAccount } from "../model/qq.ts";
import { logger } from "./logger.ts";
import { sleep } from "./util.ts";

const bots: Array<Client | undefined> = [];
let masterBotUin: number | undefined = undefined;

//启动30秒后每5分钟检测一次bot是否在线
schedule.scheduleJob(`0 */5 * * * *`, async () => {
  await sleep(30000);
  bots.forEach(async (bot, index) => {
    if (!bot) {
      return;
    }
    //如果bot掉线
    for (let i = 0; i < 5; i++) {
      await sleep(5000);
      if (bot.isOnline()) {
        return;
      }
    }
    //移除bot
    bots[index] = undefined;
    //如果移除的bot是主bot，重新注册主bot
    if (bot.uin === masterBotUin) {
      masterBotListener();
    }
  });
  //如果没有可用bot，程序退出
  if (bots.filter((client) => client !== undefined).length === 0) {
    throw new Error("没有可用机器人");
  }
});

//登陆一个QQ账户
async function loginOneAccount(uin: number, password: string, order: number) {
  const client = createClient({
    sign_api_addr: botConf.sign_api_addr,
    ffmpeg_path: botConf.ffmpeg_path,
    ffprobe_path: botConf.ffprobe_path,
    data_dir: botConf.data_dir,
  });
  client
    .on("system.login.slider", async (v) => {
      const ticket = await consola.prompt(
        `\nQQ登陆 -> 输入Ticket\nbot -> ${uin}\nurl -> ${v.url}`,
        { type: "text" }
      );
      await client.submitSlider(ticket);
    })
    .on("system.login.device", async (v) => {
      await client.sendSmsCode();
      const smsCode = await consola.prompt(
        `\nQQ登陆 -> 输入短信验证码\nbot -> ${uin}`,
        {
          type: "text",
        }
      );
      await client.submitSmsCode(smsCode);
    });
  await client.login(uin, password);
  bots[order] = client;
}

//登陆所有QQ账户
async function loginAllAccount(
  accounts: { uin: number; password: string; order: number }[]
) {
  for (const account of accounts) {
    //跳过已登录过的QQ账户
    if (bots.find((bot) => bot !== undefined && bot.uin === account.uin)) {
      continue;
    }
    //登陆QQ账户
    await loginOneAccount(account.uin, account.password, account.order);
  }
}

//获取账户并登陆所有bot
async function login() {
  const activeAccount = await findActiveAccount();
  await loginAllAccount(activeAccount);
}

//获取在线bot
function getBots() {
  return bots.filter((client): client is Client => client !== undefined);
}

//发送群消息
async function sendGroupMsg(
  client: Client | undefined,
  gid: number,
  message: Sendable
) {
  if (client === undefined) {
    return;
  }
  client.sendGroupMsg(gid, message).catch((e) => {
    logger.error(`\n错误：群消息发送失败\n消息内容：${message}`);
  });
}

//主bot监听器
function masterBotListener() {
  masterBotUin = getBots()[0]?.uin;
  getBots()[0]?.on("message.group", async (event) => {
    //群消息去空格
    const raw_message = event.raw_message.replaceAll(" ", "");
    //不是命令或只有触发词就返回
    if (
      !raw_message.startsWith(botConf.trigger) ||
      raw_message === botConf.trigger
    ) {
      return;
    }
    //获取插件
    const pickPlugin = pluginUtil.pick(raw_message);
    if (!pickPlugin) {
      return;
    }
    //数据库查询插件状态
    const findPlugin = await pluginModel.findOne(
      event.group_id,
      pickPlugin?.info.name
    );
    //插件没注册就注册
    if (!findPlugin) {
      await pluginModel.add(
        event.group_id,
        pickPlugin.info.name,
        pickPlugin.info.defaultActive
      );
    }
    //插件没激活，或者没注册过但是默认不激活，就返回
    if (
      (findPlugin && !findPlugin.active) ||
      (!findPlugin && !pickPlugin.info.defaultActive)
    ) {
      sendGroupMsg(
        getBots()[0],
        event.group_id,
        `错误：${pickPlugin.info.name}功能未激活，联系管理员激活。`
      );
      return;
    }
    //执行插件
    pickPlugin.plugin(event);
  });
}

//监听器
function listener() {
  getBots().forEach((bot) => {
    //自动接受邀请入群
    bot.on("request.group.invite", async (event) => {
      await event.approve(true);
      await sleep(5000);
      await bot.reloadGroupList();
    });
    //管理员退群，机器人退群
    bot.on("notice.group.decrease", async (event) => {
      for (const admin of botConf.admin) {
        if (event.operator_id === admin) {
          await bot.setGroupLeave(event.group_id);
          await sleep(5000);
          await bot.reloadGroupList();
          logger.warn(
            `\n警告：机器人账号 ${bot.uin} 退出了群 ${event.group_id}`
          );
        }
      }
    });
  });
}

function msgNoCmd(msg: string, info: { name: string }) {
  return msg.replace(
    new RegExp(`(^\\s*${botConf.trigger}\\s*${info.name}\\s*)|(\\s*$)`, "g"),
    ""
  );
}

//初始化bot，登陆所有QQ账户
async function init() {
  await login();
  await sleep(10000);
  masterBotListener();
  listener();
}

export { getBots, init, msgNoCmd, sendGroupMsg };
