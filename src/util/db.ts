import dbConf from "@potato/config/db.json" assert { type: "json" };
import envConf from "@potato/config/env.json" assert { type: "json" };
import { DataSource } from "typeorm";
import { logger } from "./logger.js";

const dataSource = new DataSource({
  type: "postgres",
  ...dbConf[<"dev" | "prod">envConf.env],
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
