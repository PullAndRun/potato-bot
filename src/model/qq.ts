import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class QQ extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "float", unique: true, comment: "qq号" })
  uin: number;

  @Column({ type: "text", comment: "qq密码" })
  password: string;

  @Column({
    type: "int",
    comment: "qq号调用顺序",
    default: 0,
  })
  order: number;

  @Column({ type: "boolean", comment: "是否启用qq号", default: true })
  active: boolean;
}

function findActiveAccount() {
  return QQ.find({ where: { active: true }, order: { order: "ASC" } });
}

async function add(
  uin: number,
  password: string,
  order: number,
  active: boolean
) {
  const qq = new QQ();
  qq.uin = uin;
  qq.password = password;
  qq.order = order;
  qq.active = active;
  await qq.save().catch((_) => undefined);
}

export { QQ, add, findActiveAccount };
