import { DataSource } from "typeorm";
import dbConf from "@potato/config/db.json" assert { type: "json" };
import envConf from "@potato/config/env.json" assert { type: "json" };
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
      logger.error("错误：数据库初始化失败。");
      throw new Error(e);
    });
}

init();

export { dataSource as db, init };
