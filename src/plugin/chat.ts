import { GroupMessageEvent } from "@icqqjs/icqq";
import aiConf from "@potato/config/openai.json";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import * as aiModel from "../model/ai";
import * as groupModel from "../model/group";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { logger } from "../util/logger";
import botConf from "@potato/config/bot.json";

const info = {
  name: "",
  type: "plugin",
  defaultActive: true,
  plugin: plugin,
};

const openai = new OpenAI({
  apiKey: aiConf.account.apiKey,
  baseURL: aiConf.account.baseURL,
});

//bot聊天内容
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const group = await groupModel.findOrAddOne(event.group_id);
  if (!group.customPrompt) {
    const commonPrompt = await aiModel.findOne(group.promptName);
    if (!commonPrompt) {
      await replyGroupMsg(event, [await createChat(msg)], true);
      return;
    }
    await replyGroupMsg(
      event,
      [await createChat(msg, commonPrompt.prompt)],
      true
    );
    return;
  }
  await replyGroupMsg(event, [await createChat(msg, group.customPrompt)], true);
}

async function createChat(msg: string, prompt: string | undefined = undefined) {
  const gptMessages: ChatCompletionMessageParam[] = [
    { role: "user", content: msg },
  ];
  if (!prompt) {
    const catAi = await aiModel.findOne("猫娘");
    if (!catAi) {
      return "没找到任何prompt，请管理员检查数据库。";
    }
    gptMessages.unshift({ role: "system", content: catAi.prompt });
    return chat(gptMessages);
  }
  gptMessages.unshift({ role: "system", content: prompt });
  return chat(gptMessages);
}

async function chat(msg: ChatCompletionMessageParam[]) {
  const response = await openai.chat.completions
    .create({
      model: "gpt-3.5-turbo-16k-0613",
      messages: msg,
      temperature: aiConf.temperature,
      max_tokens: aiConf.max_tokens,
      top_p: aiConf.top_p,
      frequency_penalty: aiConf.frequency_penalty,
      presence_penalty: aiConf.presence_penalty,
      n: aiConf.n,
    })
    .then((chatCompletion) => chatCompletion.choices[0]?.message.content)
    .catch((e) => {
      logger.error(`\n错误：ai聊天错误\n聊天内容：${msg}\n错误信息：${e}`);
      return "ai系统异常，请稍后再试。";
    });
  if (!response) {
    return "ai系统异常，请重试。";
  }
  return response.replace(/^(\n+)/g, "").replace(/\n+/g, "\n");
}

export { info };
