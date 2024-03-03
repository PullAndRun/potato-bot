import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import aiConf from "@potato/config/openai.json";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import * as aiModel from "../model/ai";
import * as groupModel from "../model/group";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { logger } from "../util/logger";

const info = {
  name: "",
  type: "plugin",
  defaultActive: true,
  comment: [
    `${botConf.trigger}聊天内容\n说明：AI聊天，内置多种人格，使用“${botConf.trigger}设置”了解如何变更AI人格。`,
  ],
  plugin: plugin,
};

const openai = new OpenAI({
  apiKey: aiConf.account.apiKey,
  baseURL: aiConf.account.baseURL,
});

//bot聊天内容
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const group = await groupModel.findOne(event.group_id);
  if (group === null) {
    return;
  }
  if (group.promptName === "自定义") {
    await replyGroupMsg(
      event,
      [await createChat(msg, group.customPrompt)],
      true
    );
    return;
  }
  const commonPrompt = await aiModel.findOne(group.promptName);
  if (commonPrompt) {
    await replyGroupMsg(
      event,
      [await createChat(msg, commonPrompt.prompt)],
      true
    );
    return;
  }
  await replyGroupMsg(event, [await createChat(msg)], true);
}

async function createChat(msg: string, prompt: string | undefined = undefined) {
  const gptMessages: ChatCompletionMessageParam[] = [
    { role: "user", content: msg },
  ];
  if (!prompt) {
    const catAi = await aiModel.findOne("猫娘");
    if (!catAi) {
      return "未查询到默认prompts，请联系管理员。";
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
      return "AI系统异常，请稍后再试。";
    });
  if (!response) {
    return "AI系统异常，请重试。";
  }
  return response.replace(/^(\n+)/g, "").replace(/\n+/g, "\n");
}

export { info };
