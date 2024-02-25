import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class QQ extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "float", unique: true, comment: "qq号" })
  qid: number;

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

export { QQ };
