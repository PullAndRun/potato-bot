import { GroupMessageEvent } from "@icqqjs/icqq";
import newsConf from "@potato/config/news.json";
import schedule from "node-schedule";
import { z } from "zod";
import * as pluginModel from "../model/plugin";
import { getMasterBot, replyGroupMsg, sendGroupMsg } from "../util/bot";
import { createFetch } from "../util/http";

const info = {
  name: "新闻",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [`说明：向群内推送新闻`],
  plugin: plugin,
};
const newsMap: Map<number, Array<string>> = new Map();

schedule.scheduleJob(`0 0 0 */1 * *`, () => {
  newsMap.forEach((news, gid) => {
    if (news.length < 300) {
      return;
    }
    newsMap.set(
      gid,
      news.filter((_, i, arr) => i > arr.length / 2)
    );
  });
});

schedule.scheduleJob(`0 0 */1 * * *`, async () => {
  getMasterBot()
    .getGroupList()
    .forEach(async (group) => {
      const pluginSwitch = await pluginModel.findOrAddOne(
        group.group_id,
        "新闻推送",
        false
      );
      if (pluginSwitch.active === false) {
        return;
      }
      const news = await pushNews(group.group_id);
      if (news === undefined) {
        return;
      }
      await sendGroupMsg(getMasterBot(), group.group_id, [
        "为您推送热点新闻：\n\n" + news,
      ]);
    });
});

schedule.scheduleJob(`0 */2 * * * *`, async () => {
  getMasterBot()
    .getGroupList()
    .forEach(async (group) => {
      const pluginSwitch = await pluginModel.findOrAddOne(
        group.group_id,
        "快讯推送",
        false
      );
      if (pluginSwitch.active === false) {
        return;
      }
      const news = await pushRealtimeNews(group.group_id);
      if (news === undefined) {
        return;
      }
      await sendGroupMsg(getMasterBot(), group.group_id, [
        "为您推送实时快讯：\n\n" + news,
      ]);
    });
});

async function plugin(event: GroupMessageEvent) {
  const news = await pushNews(event.group_id);
  if (news === undefined) {
    await replyGroupMsg(event, [`当前没有新闻，请稍后重试。`]);
    return;
  }
  await replyGroupMsg(event, ["为您推送新闻：\n\n" + news]);
}

async function pushNews(gid: number) {
  const news = await fetchNews();
  if (news === undefined) {
    return undefined;
  }
  return duplicate(
    gid,
    news.map((v) => {
      return {
        text: v.desc,
        title: v.query,
      };
    })
  );
}

async function pushRealtimeNews(gid: number) {
  const news = await fetchRealtimeNews();
  if (news === undefined) {
    return undefined;
  }
  return duplicate(gid, news);
}

async function duplicate(
  gid: number,
  news: {
    text: string;
    title: string;
  }[]
) {
  const realNews = news
    .map((resp) => {
      const existNewsList = newsMap.get(gid);
      if (existNewsList === undefined || !existNewsList.includes(resp.title)) {
        return resp;
      }
      return undefined;
    })
    .filter(
      (resp): resp is { text: string; title: string } => resp !== undefined
    )
    .filter((_, index) => index < 5);
  if (realNews.length === 0) {
    return undefined;
  }
  realNews.forEach((resp) => {
    const existNewsList = newsMap.get(gid);
    newsMap.set(gid, (existNewsList || []).concat([resp.title]));
  });
  return realNews
    .map((resp, index) => `${index + 1}、${resp.title}\n${resp.text}`)
    .join("\n\n");
}

async function fetchRealtimeNews() {
  const newsJson = await createFetch(newsConf.api.baiduRealTime, 5000)
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const newsSchema = z.object({
    Result: z.object({
      content: z.object({
        list: z
          .array(
            z.object({
              title: z.string(),
              content: z.object({
                items: z.array(z.object({ data: z.string() })).min(1),
              }),
            })
          )
          .min(1),
      }),
    }),
  });
  const safeNewsJson = newsSchema.safeParse(newsJson);
  if (!safeNewsJson.success) {
    return undefined;
  }
  return safeNewsJson.data.Result.content.list
    .map((v) => {
      if (v.title === undefined || v.content.items.length === 0) {
        return undefined;
      }
      const content = v.content.items
        .map((vv, i) => {
          if (vv.data.replace(/。/g, "") === v.title.replace(/。/g, "")) {
            return `=>快讯内容同标题`;
          }
          return `=>${vv.data}`;
        })
        .join("\n");
      return {
        title: v.title,
        text: content,
      };
    })
    .filter(
      (resp): resp is { text: string; title: string } => resp !== undefined
    );
}

async function fetchNews() {
  const newsJson = await createFetch(newsConf.api.baidu, 5000)
    .then((resp) => resp?.json())
    .catch((_) => undefined);
  const newsSchema = z.object({
    data: z.object({
      cards: z
        .array(
          z.object({
            content: z
              .array(
                z.object({
                  desc: z.string(),
                  query: z.string(),
                })
              )
              .min(1),
          })
        )
        .min(1),
    }),
  });
  const safeNewsJson = newsSchema.safeParse(newsJson);
  if (!safeNewsJson.success) {
    return undefined;
  }
  return safeNewsJson.data.data.cards[0]?.content
    .map((resp) => {
      if (!resp.desc || !resp.query) {
        return undefined;
      }
      return {
        desc: "=>" + resp.desc,
        query: resp.query,
      };
    })
    .filter(
      (resp): resp is { desc: string; query: string } => resp !== undefined
    );
}

export { info };
