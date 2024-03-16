import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["gid", "uin"], { unique: true })
class User extends BaseEntity {
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

  @Column({ type: "float", comment: "股票金币", default: 1000 })
  stockCoin: number;
}

function findOne(gid: number, uin: number) {
  return User.findOneBy({
    gid: gid,
    uin: uin,
  });
}

async function findOrAddOne(uin: number, gid: number) {
  const user = await findOne(gid, uin);
  if (user === null) {
    return add(uin, gid);
  }
  return user;
}

async function stockRank(gid: number) {
  return User.find({
    where: { gid: gid },
    order: { stockCoin: "DESC" },
  });
}

async function updateSign(uin: number, gid: number) {
  const user = await findOrAddOne(uin, gid);
  user.sign = user.sign + 1;
  user.signTime = new Date();
  await user.save().catch((_) => undefined);
  return user;
}

async function add(uin: number, gid: number) {
  const user = new User();
  user.uin = uin;
  user.gid = gid;
  user.sign = 0;
  await user.save().catch((_) => undefined);
  return user;
}

export { User, add, findOne, findOrAddOne, stockRank, updateSign };
