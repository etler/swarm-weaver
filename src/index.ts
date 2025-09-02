import { readFile } from "node:fs/promises";
import { Readable, Writable } from "node:stream";
import { SwarmWeaver } from "@/SwarmWeaver";
import minimist from "minimist";
import { logger } from "@/logger";
import { createWriteStream } from "node:fs";
import path from "node:path";

const { _: filePaths, ...args } = minimist(process.argv.slice(2), { boolean: true });

(async () => {
  logger.debug(`Starting Swarm Weaver with Prompts: ${filePaths.join(", ")}`);
  const fileResults = await Promise.allSettled(
    filePaths.map(async (filePath) => {
      logger.debug(`Loading Prompt: "${filePath}"`);
      const content = await readFile(filePath, "utf8");
      logger.debug(`Loaded Prompt: "${filePath}"`);
      const fileName = path.basename(filePath);
      return [fileName, content] as const;
    }),
  );

  const promptMap = Object.fromEntries(
    fileResults.flatMap<[string, string]>((fileResult) => {
      if (fileResult.status === "fulfilled") {
        const [fileName, content] = fileResult.value;
        const name = fileName.slice(0, fileName.indexOf("."));
        const names = [...new Set([fileName, name])];
        return names.map<[string, string]>((name) => [name, content]);
      } else {
        return [];
      }
    }),
  );

  logger.debug(`Loaded prompt map: ${Object.keys(promptMap).join(", ")}`);

  const { provider: providerArg, model: modelArg, throttle: throttleArg, root, output, ...attr } = args;
  const attributes = Object.fromEntries(
    Object.entries(attr).flatMap<[string, string]>(([key, value]: [string, unknown]) => {
      if (key.startsWith("attr-")) {
        return [[key, String(value)]];
      } else {
        return [];
      }
    }),
  );

  const provider = typeof providerArg === "string" ? providerArg : process.env["PROVIDER"];
  const model = typeof modelArg === "string" ? modelArg : process.env["MODEL"];
  const throttle = typeof throttleArg === "number" ? throttleArg : undefined;

  if (provider === undefined || model === undefined) {
    logger.error("A provider and model must be provided");
    return;
  }

  if (
    !(
      provider === "google" ||
      provider === "groq" ||
      provider === "openai" ||
      provider === "anthropic" ||
      provider === "azure"
    )
  ) {
    logger.error(`Provider must be one of "google" | "groq" | "openai" | "anthropic" | "azure"`);
    return;
  }
  const weaver = new SwarmWeaver({ model, provider, promptMap });
  const inputStream = ReadableStream.from(process.stdin.isTTY ? "" : process.stdin);
  const outputStream =
    typeof output === "string"
      ? createWriteStream(output)
      : output === true
        ? Writable.fromWeb(new WritableStream())
        : process.stdout;
  let pipeline = weaver.run(typeof root === "string" ? { name: root, attributes } : { name: null }, inputStream);
  if (throttle !== undefined) {
    pipeline = pipeline.pipeThrough(new ThrottleStream({ rate: throttle }));
  }
  Readable.fromWeb(pipeline).pipe(outputStream);
})().catch((error: unknown) => {
  throw new Error("Error in main:", { cause: error });
});

class ThrottleStream extends TransformStream<string, string> {
  constructor({ rate }: { rate: number }) {
    let maybeController = null as TransformStreamDefaultController<string> | null;
    const buffer = new TransformStream<string, string>();
    const bufferWriter = buffer.writable.getWriter();
    super({
      start: (controller) => {
        maybeController = controller;
      },
      transform: async (chunk) => {
        await bufferWriter.write(chunk);
      },
    });
    if (maybeController === null) {
      throw new Error("ThrottleStream controller could not be initialized");
    }
    const controller = maybeController;
    void (async () => {
      for await (const token of buffer.readable) {
        controller.enqueue(token);
        await new Promise((resolve) => {
          setTimeout(resolve, rate);
        });
      }
      controller.terminate();
    })();
  }
}
