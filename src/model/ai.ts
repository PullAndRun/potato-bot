import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Ai extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text", unique: true, comment: "ai聊天指令名" })
  promptName: string;

  @Column({ type: "text", comment: "ai聊天指令" })
  prompt: string;
}

function findOne(promptName: string) {
  return Ai.findOneBy({
    promptName: promptName,
  });
}

function findAll() {
  return Ai.find();
}

export { Ai, findAll, findOne };
