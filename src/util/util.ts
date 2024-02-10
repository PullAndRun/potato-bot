import env from "@potato/config/env.json";

function isProd() {
  return env.env === "prod";
}

export { isProd };
