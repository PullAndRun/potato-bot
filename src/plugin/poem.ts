import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import fs from "fs/promises";
import path from "path";
import * as aiModel from "../model/ai";
import { replyGroupMsg } from "../util/bot";
import { createChat } from "./chat";

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
  const prompt = await aiModel.findOne("二创诗人");
  if (prompt === null) {
    return;
  }
  const sameText = await createChat(text.paragraphs.join(""), prompt.prompt);
  await replyGroupMsg(event, [
    `《${text.title}》\n`,
    `原作者：${text.author}\n`,
    sameText,
  ]);
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
  if (result === undefined || result.paragraphs.length === 0) {
    return poem();
  }
  return result;
}

export { info };
