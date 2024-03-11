import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import translateConf from "@potato/config/translate.json";
import { md } from "node-forge";
import { encode } from "utf8";
import { z } from "zod";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "翻译",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：把一段外语翻译成中文`,
    `使用“${botConf.trigger}翻译 一段外语”命令把一段外语翻译成中文`,
  ],
  plugin: plugin,
};

//bot翻译
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg === "") {
    await replyGroupMsg(event, ["未发现需要翻译成中文的外语，请输入一段外语"]);
    return;
  }
  const translateResult = await translate(msg);
  if (translateResult === undefined) {
    await replyGroupMsg(event, ["翻译失败"]);
    return;
  }
  await replyGroupMsg(event, ["翻译的结果：\n", translateResult]);
}

async function translate(text: string) {
  const salt = new Date().getTime();
  const fetchTranslate = await createFetch(translateConf.api, 5000, {
    method: "post",
    body: new URLSearchParams({
      q: text,
      appid: translateConf.account.id,
      salt: salt.toString(),
      from: "auto",
      to: "zh",
      sign: md.md5
        .create()
        .update(
          translateConf.account.id +
            Buffer.from(encode(text), "utf-8").toString() +
            salt +
            translateConf.account.password
        )
        .digest()
        .toHex(),
    }),
  })
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const translateSchema = z.object({
    trans_result: z
      .array(
        z.object({
          dst: z.string(),
        })
      )
      .min(1),
  });
  const translateResult = translateSchema.safeParse(fetchTranslate);
  if (!translateResult.success) {
    return undefined;
  }
  return translateResult.data.trans_result.map((res) => res.dst).join("\n");
}

export { info };
