import { createConsola } from "consola";
import dayjs from "dayjs";
import { appendFile, mkdir } from "fs/promises";
import path from "path";
import envConf from "@potato/config/env.json" assert { type: "json" };
import logConf from "@potato/config/log.json" assert { type: "json" };

/*
  0: Fatal and Error
  1: Warnings
  2: Normal logs
  3: Informational logs, success, fail, ready, start, ...
  4: Debug logs
  5: Trace logs
  -999: Silent
  +999: Verbose logs
*/
const consola = createConsola({
  reporters: [
    {
      log: async (logObj) => {
        const folderName = dayjs().format(`YYYY-MM-DD`);
        const localTime = dayjs().format("YYYY-MM-DDTHH:mm:ssZ");
        //截取log
        const jsonLog = JSON.stringify({
          date: localTime,
          args: logObj.args,
        });
        //创建文件夹
        await mkdir(`${path.resolve()}/log/${folderName}`, {
          recursive: true,
        });
        //写文件
        await appendFile(
          `${path.resolve()}/log/${folderName}/${logObj.type}`,
          `${jsonLog}\n`,
          {
            flag: "a",
          }
        );
        //终端打印log
        if (logObj.level <= logConf[<"prod" | "dev">envConf.env].level) {
          console.log(jsonLog);
        }
      },
    },
  ],
});

export { consola as logger };
