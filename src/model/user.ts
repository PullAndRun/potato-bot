import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["gid", "uin"], { unique: true })
class QQ extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "float", comment: "qq号" })
  uin: number;

  @Column({ type: "float", comment: "群号" })
  gid: number;

  @Column({ type: "float", comment: "签到次数", default: 0 })
  sign: number;

  @Column({ type: "date", comment: "签到时间", nullable: true })
  signTime: Date;
}

function findOne(gid: number, uin: number) {
  return QQ.findOneBy({
    gid: gid,
    uin: uin,
  });
}

async function findOrAddOne(uin: number, gid: number) {
  const qq = await findOne(gid, uin);
  if (qq === null) {
    return add(uin, gid);
  }
  return qq;
}

async function updateSign(uin: number, gid: number) {
  const qq = await findOrAddOne(uin, gid);
  qq.sign = qq.sign + 1;
  qq.signTime = new Date();
  qq.save().catch((_) => undefined);
  return qq;
}

async function add(uin: number, gid: number) {
  const qq = new QQ();
  qq.uin = uin;
  qq.gid = gid;
  qq.save().catch((_) => undefined);
  return qq;
}

export { QQ, add, findOne, findOrAddOne, updateSign };
