import botConf from "@potato/config/bot.json";
import decache from "decache";
import { readdir } from "fs/promises";
import path from "path";
import { logger } from "./logger";

const pluginPaths: string[] = [];

//载入所有插件，不会刷新缓存
async function load() {
  const fileNames = await readdir("src/plugin");
  for (const fileName of fileNames) {
    const pluginPath = path.resolve(`src/plugin/${fileName}`);
    require(pluginPath);
    pluginPaths.push(pluginPath);
  }
}

//使用插件文件名重载插件，会刷新缓存
function reload(fileName: string) {
  const pluginPath = path.resolve(`src/plugin/${fileName}.ts`);
  decache(pluginPath);
  try {
    require(pluginPath);
    return fileName;
  } catch (e) {
    logger.error(`\n错误：载入插件失败\n插件名：${fileName}\n错误：${e}`);
    return undefined;
  }
}

//使用bot插件名 聊天内容的文本格式获取插件
function pick(message: string) {
  const pickPluginPath = pluginPaths
    .filter(
      (pluginPath) =>
        message
          .replaceAll(" ", "")
          .startsWith(
            botConf.trigger + require.cache[pluginPath]?.exports.info.name
          ) && require.cache[pluginPath]?.exports.info.type === "plugin"
    )
    .sort((prev, next) => {
      const prevPluginName = require.cache[prev]?.exports.info.name;
      const nextPluginName = require.cache[next]?.exports.info.name;
      return nextPluginName.length - prevPluginName.length;
    })[0];
  if (!pickPluginPath) {
    return undefined;
  }
  return require.cache[pickPluginPath]?.exports.info;
}

async function init() {
  await load();
}

export { init, load, pick, reload };
