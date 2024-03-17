import { GroupMessageEvent, segment } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import fs from "fs/promises";
import path from "path";
import { replyGroupMsg } from "../util/bot";

const info = {
  name: "看原批",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：看一则原批笑话`,
    `使用“${botConf.trigger}看原批”命令看一则原批笑话`,
  ],
  plugin: plugin,
};

//bot看原批
async function plugin(event: GroupMessageEvent) {
  const image = await genshit();
  if (image === undefined) {
    await replyGroupMsg(event, ["原批暂时没有笑话，请稍候重试。"]);
    return;
  }
  await replyGroupMsg(event, [segment.image(`base64://${image}`)]);
}

async function genshit() {
  const files = await fs.readdir(
    path.resolve("data/resource/GenshitJokes/genshitjokes"),
    { withFileTypes: true, recursive: true }
  );
  const jpgFiles = files.filter((file) => file.name.endsWith(".jpg"));
  const jpgFile = jpgFiles[Math.floor(Math.random() * jpgFiles.length)];
  if (jpgFile === undefined) {
    return undefined;
  }
  const readFile = await fs.readFile(
    path.resolve(jpgFile.path + "/" + jpgFile.name)
  );
  return readFile.toString("base64");
}

genshit();
