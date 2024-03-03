import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["gid", "name"], { unique: true })
class Plugin extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "float", comment: "qq群号" })
  gid: number;

  @Column({ type: "text", comment: "中文的插件名" })
  name: string;

  @Column({ type: "boolean", comment: "是否启用插件", default: true })
  active: boolean;
}

function findByGid(gid: number) {
  return Plugin.findBy({ gid: gid });
}

function findOne(gid: number, name: string) {
  return Plugin.findOneBy({
    gid: gid,
    name: name,
  });
}

async function findOrAddOne(gid: number, name: string, active: boolean) {
  const plugin = await findOne(gid, name);
  if (plugin === null) {
    return add(gid, name, active);
  }
  return plugin;
}

async function add(gid: number, name: string, active: boolean) {
  const plugin = new Plugin();
  plugin.gid = gid;
  plugin.name = name;
  plugin.active = active;
  return plugin.save().catch((_) => undefined);
}

async function update(gid: number, name: string, active: boolean) {
  const plugin = await Plugin.findOneBy({
    gid: gid,
    name: name,
  });
  if (plugin === null) {
    return undefined;
  }
  plugin.active = active;
  return plugin.save().catch((_) => undefined);
}

export { Plugin, add, findByGid, findOne, findOrAddOne, update };
