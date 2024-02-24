import { Entity, PrimaryGeneratedColumn } from "typeorm";
import "reflect-metadata";

@Entity()
class QQ {
  @PrimaryGeneratedColumn()
  id: number;
}
