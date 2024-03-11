import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import abbrConf from "@potato/config/abbr.json";
import { createFetch } from "../util/http";
import { z } from "zod";

const info = {
  name: "缩写展开",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：猜测一段缩写代表的完整含义`,
    `使用“${botConf.trigger}缩写展开 一段缩写”命令展开一段缩写`,
  ],
  plugin: plugin,
};

//bot缩写展开
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg === "") {
    await replyGroupMsg(event, ["未发现需要展开的缩写，请输入缩写"]);
    return;
  }
  const abbrResult = await translate(msg);
  if (abbrResult === undefined) {
    await replyGroupMsg(event, ["展开失败"]);
    return;
  }
  await replyGroupMsg(event, ["展开的结果：\n", abbrResult]);
}

async function translate(text: string) {
  const fetchTranslate = await createFetch(abbrConf.api, 5000, {
    method: "post",
    body: new URLSearchParams({
      text: text,
    }),
  })
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const translateSchema = z
    .array(
      z.object({
        trans: z.array(z.string()).min(1),
      })
    )
    .min(1);
  const translateResult = translateSchema.safeParse(fetchTranslate);
  if (!translateResult.success) {
    return undefined;
  }
  return translateResult.data[0]?.trans.join("、");
}

export { info };
