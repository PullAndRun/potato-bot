import { createConsola } from "consola";
import dayjs from "dayjs";
import { appendFile } from "fs/promises";
import path from "path";

const consola = createConsola({
  level: 3,
  reporters: [
    {
      log: async (logObj) => {
        const jsonLog = JSON.stringify(logObj);
        await appendFile(
          `${path.resolve()}/log/${dayjs().format("YYYY-MM-DD")}.log`,
          `${jsonLog}\n`,
          {
            flag: "a",
          }
        );
        console.log(jsonLog);
      },
    },
  ],
});

export { consola as logger };
