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

  @Column({ type: "timestamp", comment: "最后一次闲聊时间" })
  talkTime: number;

  @Column({ type: "boolean", comment: "是否正在闲聊", default: false })
  talking: boolean;
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

async function add(gid: number) {
  const group = new Group();
  group.gid = gid;
  await group.save().catch((_) => undefined);
  return group;
}

export { Group, findOne, add, findOrAddOne };
