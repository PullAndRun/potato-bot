import { GroupMessageEvent, segment } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import fs from "fs/promises";
import path from "path";
import { getMasterBot, replyGroupMsg, sendGroupMsg } from "../util/bot";
import { say } from "./say";

const info = {
  name: "吟诗",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [`说明：吟一首唐诗`, `使用“${botConf.trigger}吟诗”命令吟一首唐诗`],
  plugin: plugin,
};

//bot吟诗
async function plugin(event: GroupMessageEvent) {
  const text = await poem();
  const audio = await say(
    `${text.title}，${text.author}，${text.paragraphs.join("，")}`
  );
  if (audio === undefined) {
    await replyGroupMsg(event, ["吟诗失败"]);
    return;
  }
  await sendGroupMsg(getMasterBot(), event.group_id, [segment.record(audio)]);
}

async function poem() {
  const fileNames = await fs.readdir(path.resolve("data/resource/poem"));
  const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
  const file = await fs.readFile(
    path.resolve("data/resource/poem") + `/${fileName}`
  );
  const poems: Array<{
    author: string;
    paragraphs: Array<string>;
    title: string;
  }> = JSON.parse(file.toString());
  const result = poems[Math.floor(Math.random() * poems.length)];
  if (
    result === undefined ||
    result.paragraphs.length === 0 ||
    result.paragraphs.length > 6
  ) {
    return poem();
  }
  return result;
}

export { info };
