import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Group extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "float", unique: true, comment: "群号" })
  gid: number;

  @Column({ type: "text", comment: "ai聊天指令名", default: "猫娘" })
  promptName: string;

  @Column({ type: "text", comment: "自定义ai聊天指令", default: "" })
  customPrompt: string;

  @Column({ type: "boolean", comment: "是否正在闲聊", default: false })
  talking: boolean;

  @Column({ type: "boolean", comment: "是否在群里", default: true })
  active: boolean;
}

async function findOne(gid: number) {
  return Group.findOneBy({ gid: gid });
}

async function findOrAddOne(gid: number) {
  const group = await findOne(gid);
  if (group === null) {
    return add(gid);
  }
  return group;
}

async function updatePromptName(gid: number, promptName: string) {
  const group = await findOne(gid);
  if (group === null) {
    return undefined;
  }
  group.promptName = promptName;
  group.save().catch((_) => undefined);
  return group;
}

async function updateCustomPrompt(gid: number, prompt: string) {
  const group = await findOne(gid);
  if (group === null) {
    return undefined;
  }
  group.promptName = "自定义";
  group.customPrompt = prompt;
  group.save().catch((_) => undefined);
  return group;
}

async function updateActiveGroup(gid: number) {
  return groupSwitch(gid, true);
}

async function updateDisableGroup(gid: number) {
  return groupSwitch(gid, false);
}

async function groupSwitch(gid: number, active: boolean) {
  const group = await findOne(gid);
  if (group === null) {
    return undefined;
  }
  group.active = active;
  group.save().catch((_) => undefined);
  return group;
}

async function add(gid: number) {
  const group = new Group();
  group.gid = gid;
  await group.save().catch((_) => undefined);
  return group;
}

export {
  Group,
  findOne,
  add,
  findOrAddOne,
  updatePromptName,
  updateCustomPrompt,
  updateActiveGroup,
  updateDisableGroup,
};
