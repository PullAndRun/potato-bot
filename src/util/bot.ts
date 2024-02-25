import { Client, createClient } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import consola from "consola";
import schedule from "node-schedule";
import { getActiveAccount } from "../model/qq.js";
import { sleep } from "./util.js";

const bots: Array<Client | undefined> = [];

//启动30秒后每5分钟检测一次bot是否在线。
schedule.scheduleJob(`0 */5 * * * *`, async () => {
  await sleep(30000);
  bots.forEach(async (bot, index) => {
    if (!bot) {
      return;
    }
    let realOffline = true;
    for (let i = 0; i < 5; i++) {
      await sleep(5000);
      if (bot.isOnline()) {
        realOffline = false;
      }
    }
    if (realOffline) {
      bots[index] = undefined;
    }
  });
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
    if (bots.find((bot) => bot !== undefined && bot.uin === account.uin)) {
      continue;
    }
    await loginOneAccount(account.uin, account.password, account.order);
  }
}

//登陆
async function login() {
  const activeAccount = await getActiveAccount();
  await loginAllAccount(activeAccount);
}

//获取在线bot
async function getBots() {
  return bots.filter((client): client is Client => client !== undefined);
}

//初始化bot，登陆所有QQ账户
async function init() {
  await login();
}

export { getBots, init };
