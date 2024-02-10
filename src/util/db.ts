import { DataSource } from "typeorm";
import config from "@potato/config/db.json";
import { isProd } from "./util.js";

const dataSource = new DataSource({
  type: "postgres",
  ...(isProd() ? config.prod : config.dev),
});

export { dataSource as db };
