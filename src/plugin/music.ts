import { GroupMessageEvent, segment } from "@icqqjs/icqq";
import botConf from "@potato/config/bot.json";
import cloudMusic from "NeteaseCloudMusicApi";
import { z } from "zod";
import { msgNoCmd, replyGroupMsg } from "../util/bot";
import { fetchImage } from "../util/http";
import musicConf from "@potato/config/music.json";

const info = {
  name: "点歌",
  type: "plugin",
  defaultActive: true,
  passive: false,
  comment: [
    `说明：点一首网易云音乐的歌`,
    `使用“${botConf.trigger}点歌 歌曲名或歌曲id”点歌`,
    `如果不输入歌曲名，就随机点一首歌`,
  ],
  plugin: plugin,
};

async function plugin(event: GroupMessageEvent) {
  const msg = msgNoCmd(event.raw_message, [botConf.trigger, info.name]);
  if (msg === "") {
    const ids = await topToIds();
    await sendMusicMsg(event, ids);
    return;
  }
  const ids = Number.parseInt(msg);
  if (isNaN(ids)) {
    const kids = await keywordToIds(msg);
    await sendMusicMsg(event, kids);
    return;
  }
  await sendMusicMsg(event, ids);
}

async function sendMusicMsg(event: GroupMessageEvent, ids: number | undefined) {
  if (ids === undefined) {
    await replyGroupMsg(event, [`点歌失败！系统异常，请稍后再试。`]);
    return;
  }
  const detail = await idsToDetail(ids);
  if (detail === undefined) {
    await replyGroupMsg(event, [`点歌失败！请换首歌，或稍后重试。`]);
    return;
  }
  await replyGroupMsg(event, [
    segment.image(detail.album.pic),
    `\n传送门：${detail.url}`,
    `\n歌曲名：${detail.name}`,
    `\n歌手：${detail.singer}`,
    `\n专辑：${detail.album.name}`,
    detail.comment ? `\n热评：${detail.comment}` : "",
  ]);
}

async function topToIds() {
  const songSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      data: z
        .array(
          z.object({
            id: z.number(),
          })
        )
        .min(1),
    }),
  });
  return cloudMusic
    .top_song({ type: 0 })
    .then((resp) => {
      const result = songSchema.safeParse(resp);
      if (!result.success) {
        return undefined;
      }
      const data = result.data.body.data;
      return data[Math.floor(Math.random() * data.length)]?.id;
    })
    .catch((_) => undefined);
}

async function keywordToIds(keyword: string) {
  const searchSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      result: z.object({
        songs: z
          .array(
            z.object({
              id: z.number(),
            })
          )
          .min(1),
      }),
    }),
  });
  const searchIds = await cloudMusic
    .cloudsearch({
      keywords: keyword,
      limit: 1,
    })
    .then((resp) => {
      const result = searchSchema.safeParse(resp);
      if (!result.success) {
        return undefined;
      }
      return result.data.body.result.songs[0]?.id;
    })
    .catch((_) => undefined);
  return searchIds;
}

async function idsToDetail(ids: number) {
  //用歌曲id找歌
  const songSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      songs: z
        .array(
          z.object({
            name: z.string(),
            al: z.object({ picUrl: z.string(), name: z.string() }),
            ar: z.array(z.object({ name: z.string() })).min(1),
          })
        )
        .min(1),
    }),
  });
  const song = await cloudMusic
    .song_detail({
      ids: ids.toString(),
    })
    .then((resp) => {
      const result = songSchema.safeParse(resp);
      if (!result.success) {
        return undefined;
      }
      return result.data.body.songs[0];
    })
    .catch((_) => undefined);
  if (song === undefined) {
    return undefined;
  }
  //歌曲评论数据结构
  const commentSchema = z.object({
    status: z.number(),
    body: z.object({
      code: z.number(),
      data: z.object({
        comments: z
          .array(
            z.object({
              content: z.string(),
            })
          )
          .min(1),
      }),
    }),
  });
  //用歌曲id找评论
  const comment = await cloudMusic
    .comment_new({
      id: ids,
      type: 0,
      pageNo: 1,
      pageSize: 1,
      sortType: 2,
    })
    .then((resp) => {
      const result = commentSchema.safeParse(resp);
      if (!result.success) {
        return undefined;
      }
      return result.data.body.data.comments[0]?.content;
    })
    .catch((_) => undefined);
  return {
    url: `${musicConf.api}${ids}`,
    name: song.name,
    singer: song.ar.map((ar) => ar.name).join("、"),
    album: {
      pic: `base64://${(
        (await fetchImage(song.al.picUrl)) || Buffer.from("")
      ).toString("base64")}`,
      name: song.al.name,
    },
    comment: comment,
  };
}

export { info };
