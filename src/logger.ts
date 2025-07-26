import minimist from "minimist";
import { format, createLogger, transports } from "winston";
const { combine, printf } = format;

const startTime = Date.now();

const accumulator: Record<string, number> = {};

const myFormat = printf((info) => {
  const { id, group, message, level, durationMs, total } = info;
  if (typeof group === "string" && typeof durationMs === "number") {
    accumulator[group] = (accumulator[group] ?? 0) + durationMs;
  }
  const completedTime = typeof durationMs === "number" ? ` completed in ${durationMs / 1000}s` : "";
  const totalTime = typeof total === "string" ? ` total time ${(accumulator[total] ?? 0) / 1000}s` : "";
  const idPrefix = typeof id === "string" ? ` ${id}` : "";
  const messageString =
    typeof message === "string" && message !== "" ? `: ${String(message).replaceAll("\n", "\\n")}` : "";
  if (typeof message === "string" && typeof level === "string") {
    return `\n[${level}] ${(Date.now() - startTime) / 1000}s${idPrefix}${completedTime}${totalTime}${messageString}`;
  } else {
    return "\nLogging Error";
  }
});

const { level: levelArg } = minimist(process.argv.slice(2), { boolean: true });

const level = typeof levelArg === "string" ? levelArg : undefined;

const logLevel = level ?? process.env["LOG_LEVEL"] ?? "error";

export const logger = createLogger({
  level: logLevel,
  format: combine(myFormat),
  transports: [new transports.Console()],
});
