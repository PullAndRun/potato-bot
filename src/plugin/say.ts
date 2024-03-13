import { GroupMessageEvent, segment } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import { z } from "zod";
import {
  getMasterBot,
  msgNoCmd,
  replyGroupMsg,
  sendGroupMsg,
} from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "说",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：机器人说一句话`,
    `使用“${botConf.trigger}说 说的话”命令说一句话`,
  ],
  plugin: plugin,
};

//bot说
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg === "") {
    await replyGroupMsg(event, [
      "未发现需要让机器人说的话，请输入要让机器人说的话",
    ]);
    return;
  }
  const audio = await say(msg);
  if (audio === undefined) {
    await replyGroupMsg(event, ["说话失败"]);
    return;
  }
  await sendGroupMsg(getMasterBot(), event.group_id, [segment.record(audio)]);
}

async function say(text: string) {
  const audioUrl = await createFetch(
    "https://v2.genshinvoice.top/run/predict",
    5000,
    {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          text,
          "派蒙_ZH",
          0.5,
          0.6,
          0.9,
          1,
          "ZH",
          true,
          1,
          0.2,
          null,
          "Happy",
          "",
          0.7,
        ],
        event_data: null,
        fn_index: 0,
      }),
    }
  )
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const audioUrlSchema = z.object({
    data: z.tuple([
      z.string(),
      z.object({
        name: z.string(),
      }),
    ]),
  });
  const safeAudioUrl = audioUrlSchema.safeParse(audioUrl);
  if (!safeAudioUrl.success || safeAudioUrl.data.data[0] !== "Success") {
    return undefined;
  }
  return `https://v2.genshinvoice.top/file=${safeAudioUrl.data.data[1].name}`;
}

export { info };
