import dbConf from "@potato/config/db.json";
import { DataSource } from "typeorm";
import { logger } from "./logger.ts";

const dataSource = new DataSource({
  type: "postgres",
  host: dbConf.host,
  port: dbConf.port,
  username: dbConf.username,
  password: dbConf.password,
  database: dbConf.database,
  synchronize: dbConf.synchronize,
  logging: dbConf.logging,
  entities: dbConf.entities,
});

async function init() {
  await dataSource
    .initialize()
    .then((_) => logger.log("数据库初始化成功。"))
    .catch((e) => {
      throw new Error(`错误，数据库初始化失败:\n${e}`);
    });
}

export { dataSource as db, init };
