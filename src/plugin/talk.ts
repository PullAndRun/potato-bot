import { GroupMessageEvent } from "@icqqjs/icqq";
import talkJson from "@potato/resource/talk.json";
import dayjs from "dayjs";
import schedule from "node-schedule";
import { findOrAddOne } from "../model/plugin";
import { getBots, replyGroupMsg, sendGroupMsg } from "../util/bot";
import { sleep } from "../util/util";

const info = {
  name: "闲聊",
  type: "plugin",
  defaultActive: true,
  comment: [`说明：两个机器人互动聊天`],
  plugin: plugin,
};
const talkMap: Map<number, { time: Date; talking: boolean }> = new Map();

schedule.scheduleJob(`0 0 */4 * * *`, async () => {
  getBots()[0]
    ?.getGroupList()
    .forEach(async (group) => {
      const pluginSwitch = await findOrAddOne(
        group.group_id,
        "闲聊推送",
        false
      );
      const talkInfo = talkMap.get(group.group_id) || { time: new Date() };
      if (talkInfo === undefined) {
        talkMap.set(group.group_id, { time: new Date(), talking: false });
      }
      if (
        pluginSwitch === undefined ||
        pluginSwitch.active === false ||
        dayjs().subtract(30, "minute").isBefore(dayjs(talkInfo.time))
      ) {
        return;
      }
      await talk(group.group_id);
    });
});

async function plugin(event: GroupMessageEvent) {
  if (getBots().length < 2) {
    await replyGroupMsg(event, ["在线机器人不足，暂时无法进行闲聊。"], true);
    return;
  }
  await talk(event.group_id);
}

async function talk(gid: number) {
  const talkInfo = talkMap.get(gid);
  if (talkInfo === undefined) {
    talkMap.set(gid, { time: new Date(), talking: true });
    return;
  }
  if (talkInfo && talkInfo.talking) {
    return;
  }
  const textArr =
    talkJson.taromati[Math.floor(Math.random() * talkJson.taromati.length)];
  if (textArr === undefined) {
    return;
  }
  for (const [index, text] of textArr.entries()) {
    await sleep(text.length * 480);
    if (index % 2) {
      await sendGroupMsg(getBots()[1], gid, [text]);
      continue;
    }
    await sendGroupMsg(getBots()[0], gid, [text]);
  }
  talkMap.set(gid, { time: new Date(), talking: false });
}

function setTalkTime(gid: number) {
  const talkInfo = talkMap.get(gid);
  if (talkInfo === undefined) {
    talkMap.set(gid, { time: new Date(), talking: false });
    return;
  }
  talkMap.set(gid, { ...talkInfo, time: new Date() });
}

export { info, setTalkTime };
