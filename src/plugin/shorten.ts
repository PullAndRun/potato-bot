import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import shortenConf from "@potato/config/shorten.json";
import { z } from "zod";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "短链接",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：转换长链接为短链接`,
    `使用“${botConf.trigger}短链接 长链接”命令把长链接转换为短链接`,
  ],
  plugin: plugin,
};

//bot缩写展开
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg === "") {
    await replyGroupMsg(event, ["未发现需要转换的长链接，请输入长链接网址"]);
    return;
  }
  const shortenResult = await shorten(msg);
  if (shortenResult === undefined) {
    await replyGroupMsg(event, ["转换失败"]);
    return;
  }
  await replyGroupMsg(event, ["短链接：\n", shortenResult]);
}

async function shorten(url: string) {
  const fetchShorten = await createFetch(shortenConf.api, 5000, {
    method: "post",
    body: JSON.stringify({
      url: url,
    }),
  })
    .then((resp) => resp?.json())
    .catch((e) => console.log(e));
  const shortenSchema = z.object({
    url: z.string(),
  });
  const shortenResult = shortenSchema.safeParse(fetchShorten);
  if (!shortenResult.success) {
    return undefined;
  }
  return shortenResult.data.url;
}

export { info };
