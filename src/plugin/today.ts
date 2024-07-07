import { GroupMessageEvent } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import todayConf from "@potato/config/today.json";
import { z } from "zod";
import { replyGroupMsg } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "历史上的今天",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：查看历史上的今天发生了什么`,
    `使用“${botConf.trigger}历史上的今天”命令查看历史上的今天发生了什么`,
  ],
  plugin: plugin,
};

//bot历史上的今天
async function plugin(event: GroupMessageEvent) {
  const todayResult = await today();
  if (todayResult === undefined) {
    await replyGroupMsg(event, ["历史上的今天无事发生"]);
    return;
  }
  await replyGroupMsg(event, [
    `今天是${todayResult.data.today}\n`,
    `历史上的今天曾经发生过\n`,
    todayResult.data.result.map((v) => `${v.year}，${v.title}`).join("\n"),
  ]);
}

async function today() {
  const fetchToday = await createFetch(todayConf.api.today, 5000)
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const todaySchema = z.object({
    today: z.string(),
    result: z
      .array(
        z.object({
          year: z.string(),
          title: z.string(),
        })
      )
      .min(1),
  });
  const todayResult = todaySchema.safeParse(fetchToday);
  if (
    !todayResult.success ||
    (todayResult.data.result.length === 1 &&
      todayResult.data.result[0]?.year === "2024")
  ) {
    return undefined;
  }
  todayResult.data.result = todayResult.data.result.filter(
    (v) => v.year !== "2024"
  );
  return todayResult;
}

export { info };
