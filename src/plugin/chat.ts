import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import aiConf from "@potato/config/openai.json";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import * as aiModel from "../model/ai";
import * as groupModel from "../model/group";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { logger } from "../util/logger";
import dayjs from "dayjs";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { CoreMessage, generateText } from "ai";

const info = {
  name: "聊天",
  type: "plugin",
  defaultActive: true,
  passive: true,
  comment: [
    `说明：AI聊天，内置多种人格`,
    `使用“${botConf.trigger}设置”了解如何变更AI人格。`,
  ],
  plugin: plugin,
};

const openai = new OpenAI({
  apiKey: aiConf.account.sb.apiKey,
  baseURL: aiConf.account.sb.baseURL,
});

const deepseek = createDeepSeek({
  apiKey: aiConf.account.deepseek.apiKey,
  baseURL: aiConf.account.deepseek.baseUrl,
});

const chatMap = new Map<number, { date: Date; chat: string }>();
//bot聊天内容
async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  const group = await groupModel.findOrAddOne(event.group_id);
  const history = await chatHistory(event.group_id, msg);
  //自定义人格
  if (group.promptName === "自定义") {
    await replyGroupMsg(event, [
      await createChat(msg, group.customPrompt, history),
    ]);
    return;
  }
  const commonPrompt = await aiModel.findOne(group.promptName);
  //选定人格
  if (commonPrompt) {
    await replyGroupMsg(event, [
      await createChat(msg, commonPrompt.prompt, history),
    ]);
    return;
  }
  //默认猫娘人格
  await replyGroupMsg(event, [await createChat(msg, undefined, history)]);
}

async function chatHistory(gid: number, msg: string) {
  const chatInfo = chatMap.get(gid);
  if (!chatInfo) {
    chatMap.set(gid, { date: dayjs().toDate(), chat: msg });
    return undefined;
  }
  if (dayjs().subtract(5, "minute").isAfter(chatInfo.date)) {
    chatMap.delete(gid);
    return undefined;
  }
  const newChat = await chat(
    [
      { role: "system", content: "总结这两段话" },
      { role: "user", content: chatInfo.chat },
      { role: "user", content: msg },
    ],
    "gpt-3.5-turbo"
  );
  chatMap.set(gid, { date: dayjs().toDate(), chat: newChat });
  return chatInfo.chat;
}

async function createChat(
  msg: string,
  prompt: string | undefined = undefined,
  history: string | undefined = undefined
) {
  const gptMessages: CoreMessage[] = [{ role: "user", content: msg }];
  if (history) {
    gptMessages.unshift({ role: "user", content: history });
  }
  if (!prompt) {
    const catAi = await aiModel.findOne("猫娘");
    if (!catAi) {
      return "未查询到默认prompts，请联系管理员。";
    }
    gptMessages.unshift({ role: "system", content: catAi.prompt });
    return deepSeekChat(gptMessages);
  }
  if (prompt === "openai") {
    return deepSeekChat([{ role: "user", content: msg }]);
  }
  gptMessages.unshift({ role: "system", content: prompt });
  return deepSeekChat(gptMessages);
}

async function chat(
  msg: ChatCompletionMessageParam[],
  model: OpenAI.Chat.ChatModel = "gpt-4o-mini"
) {
  const response = await openai.chat.completions
    .create({
      model: model,
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
      logger.error(`\n错误：ai聊天错误\n错误信息：${e}\n聊天内容：`, msg);
      return "AI系统异常，请稍后再试。";
    });
  if (!response) {
    return "AI系统异常，请重试。";
  }
  return response.replace(/^(\n+)/g, "").replace(/\n+/g, "\n");
}

async function deepSeekChat(msg: CoreMessage[]) {
  const { text } = await generateText({
    model: deepseek("deepseek-ai/DeepSeek-R1"),
    messages: msg,
  }).catch((_) => {
    return { text: "AI系统异常，请重试。" };
  });
  return text;
}

export { info, createChat };
