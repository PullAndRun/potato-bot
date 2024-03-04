import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["gid", "mid", "rid"], { unique: true })
class Bili extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text", comment: "up主昵称" })
  name: string;

  @Column({ type: "float", comment: "群号" })
  gid: number;

  @Column({ type: "float", comment: "up主用户id" })
  mid: number;

  @Column({ type: "float", comment: "up主直播间id" })
  rid: number;
}

function findByMid(mid: number) {
  return Bili.findBy({
    mid: mid,
  });
}

function findByRid(rid: number) {
  return Bili.findBy({
    rid: rid,
  });
}

function findByGid(gid: number) {
  return Bili.findBy({
    gid: gid,
  });
}

function findByName(name: string) {
  return Bili.findBy({
    name: name,
  });
}

async function removeByName(name: string) {
  return Bili.findOneBy({
    name: name,
  }).then(async (bili) => await bili?.remove());
}

async function add(name: string, gid: number, mid: number, rid: number) {
  const bili = new Bili();
  bili.name = name;
  bili.gid = gid;
  bili.mid = mid;
  bili.rid = rid;
  await bili.save().catch((_) => undefined);
  return bili;
}

function findAll() {
  return Bili.find();
}

export {
  Bili,
  add,
  findAll,
  findByGid,
  findByMid,
  findByName,
  findByRid,
  removeByName,
};
