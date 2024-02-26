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

  @Column({ type: "text", comment: "插件名" })
  name: string;

  @Column({ type: "boolean", comment: "是否启用插件", default: true })
  active: boolean;
}

function findPlugin(gid: number, name: string) {
  return Plugin.findBy({
    gid: gid,
    name: name,
  });
}

async function addPlugin(gid: number, name: string, active: boolean = true) {
  const plugin = new Plugin();
  plugin.gid = gid;
  plugin.name = name;
  plugin.active = active;
  await plugin.save().catch((_) => undefined);
}

async function updatePlugin(gid: number, name: string, active: boolean) {
  const plugin = await Plugin.findOneBy({
    gid: gid,
    name: name,
  });
  if (plugin === null) {
    return undefined;
  }
  plugin.active = active;
  await plugin.save().catch((_) => undefined);
}

export { Plugin, findPlugin, addPlugin, updatePlugin };
