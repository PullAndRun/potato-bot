import { GroupMessageEvent, segment } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import { createFetch, fetchImage } from "../util/http";
import seeConf from "@potato/config/see.json";
import { z } from "zod";
import { msgNoCmd, replyGroupMsg } from "../util/bot";

const info = {
  name: "看",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：看一张图片`,
    `使用“${botConf.trigger}看 看什么图片”命令看一张图片`,
  ],
  plugin: plugin,
};

//bot看
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg === "") {
    await replyGroupMsg(event, [`未发现您想看的图片，请输入您想看的图片名`]);
    return;
  }
  const image = await search(msg);
  if (image === undefined) {
    await replyGroupMsg(event, [`看图失败，请换一张图看`]);
    return;
  }
  await replyGroupMsg(event, [
    segment.image(`base64://${image.toString("base64")}`),
  ]);
}

async function search(text: string) {
  const fetchImageInfo = await createFetch(
    seeConf.api +
      new URLSearchParams({
        tn: "resultjson_com",
        word: text,
        pn: "1",
        rn: "10",
      }),
    5000
  )
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const imageInfoSchema = z.object({
    data: z.array(z.object({ thumbURL: z.string().nullish() })).min(1),
  });
  const safeImageInfo = imageInfoSchema.safeParse(fetchImageInfo);
  if (!safeImageInfo.success) {
    return undefined;
  }
  const images = safeImageInfo.data.data.filter(
    (url): url is { thumbURL: string } => url.thumbURL !== undefined
  );
  if (images.length === 0) {
    return undefined;
  }
  const randomImage = images[Math.floor(Math.random() * images.length)];
  if (randomImage === undefined) {
    return undefined;
  }
  return fetchImage(randomImage.thumbURL);
}
