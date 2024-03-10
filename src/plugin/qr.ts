import { GroupMessageEvent, ImageElem, segment } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import jpegjs from "jpeg-js";
import jsqr from "jsqr";
import pngjs from "pngjs";
import qrcode from "qrcode";
import sharp from "sharp";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { fetchImage } from "../util/http";

const info = {
  name: "二维码",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：二维码和文本互转`,
    `使用“${botConf.trigger}二维码 文本|二维码”命令转换文本和二维码`,
  ],
  plugin: plugin,
};

//bot二维码
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const qrimg = event.message.filter(
    (msg): msg is ImageElem => msg.type === "image"
  )[0];
  if (msg === "" && qrimg === undefined) {
    await replyGroupMsg(event, [
      "未发现文本或二维码图片，请提供文本或二维码图片",
    ]);
    return;
  }
  if (qrimg && qrimg.url) {
    const imageBase64 = await fetchImage(qrimg.url);
    if (imageBase64 === undefined) {
      await replyGroupMsg(event, [`二维码解析失败`]);
      return;
    }
    const qrText = await decode(imageBase64.toString("base64"));
    if (qrText === undefined) {
      await replyGroupMsg(event, [`二维码解析失败`]);
      return;
    }
    await replyGroupMsg(event, [`从二维码中解析出：\n`, qrText]);
    return;
  }
  if (msg) {
    const qrImage = await encode(msg);
    if (qrImage === undefined) {
      await replyGroupMsg(event, [`生成二维码失败`]);
      return;
    }
    await replyGroupMsg(event, [
      `制作了包含文本“${msg}”的二维码：\n`,
      segment.image(`base64://${qrImage}`),
    ]);
  }
}

async function encode(text: string) {
  return qrcode
    .toDataURL(text, {
      errorCorrectionLevel: "H",
      margin: 0,
      scale: 6,
    })
    .then((base64) => base64.replace("data:image/png;base64,", ""))
    .catch((_) => undefined);
}

async function decode(base64: string) {
  const meta = await sharp(
    Buffer.from(base64.replace("data:image/png;base64,", ""), "base64")
  )
    .toBuffer({
      resolveWithObject: true,
    })
    .catch((_) => undefined);
  if (meta === undefined) {
    return undefined;
  }
  let imageBuffer: Buffer | undefined;
  switch (meta.info.format) {
    case "jpeg":
      try {
        imageBuffer = jpegjs.decode(Buffer.from(meta.data)).data;
      } catch (_) {
        imageBuffer = undefined;
      }
      break;
    case "png":
      try {
        imageBuffer = pngjs.PNG.sync.read(Buffer.from(meta.data)).data;
      } catch (_) {
        imageBuffer = undefined;
      }
      break;
  }
  if (imageBuffer === undefined) {
    return undefined;
  }
  const qr = jsqr(
    new Uint8ClampedArray(imageBuffer),
    meta.info.width,
    meta.info.height
  );
  if (qr === null) {
    return undefined;
  }
  return qr.data;
}

export { info };
