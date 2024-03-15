import { GroupMessageEvent, segment } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import fs from "fs/promises";
import path from "path";
import * as aiModel from "../model/ai";
import { getMasterBot, replyGroupMsg, sendGroupMsg } from "../util/bot";
import { createChat } from "./chat";
import { say } from "./say";

const info = {
  name: "吟诗",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [`说明：AI改写一首诗`, `使用“${botConf.trigger}吟诗”命令吟一首诗`],
  plugin: plugin,
};

//bot吟诗
async function plugin(event: GroupMessageEvent) {
  const text = await poem();
  const prompt = await aiModel.findOne("诗歌赏析");
  if (prompt === null) {
    return;
  }
  const poemText = [
    `《${text.title}》\n`,
    `作者：${text.author}\n`,
    `诗文：\n`,
    `${text.paragraphs.join("\n")}`,
  ];
  const apperText = await createChat(poemText.join("\n"), prompt.prompt);
  const finalText = [...poemText, `\n——\n`, `AI赏析：\n`, apperText];
  await replyGroupMsg(event, finalText);
  const audio = await say(apperText);
  if (audio === undefined) {
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
  if (result === undefined || result.paragraphs.length === 0) {
    return poem();
  }
  return result;
}

export { info };
