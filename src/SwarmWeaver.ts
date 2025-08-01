import { Parser } from "htmlparser2";
import { createProviderRegistry, LanguageModelV1, ProviderRegistryProvider, streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { ConductorStream, Chain } from "@/lib/ConductorStream";
import { asyncIterableSequencer } from "@/lib/asyncIterableSequencer";
import { logger } from "@/logger";

const config = {
  anthropicApiKey: process.env["ANTHROPIC_API_KEY"],
  azureApiKey: process.env["AZURE_API_KEY"],
  googleApiKey: process.env["GOOGLE_API_KEY"],
  groqApiKey: process.env["GROQ_API_KEY"],
  openaiApiKey: process.env["OPENAI_API_KEY"],
};

const registryOptions = {
  ...(config.anthropicApiKey !== undefined && {
    anthropic: createAnthropic({ apiKey: config.anthropicApiKey }),
  }),
  ...(config.azureApiKey !== undefined && { azure: createAzure({ apiKey: config.azureApiKey }) }),
  ...(config.googleApiKey !== undefined && {
    google: createGoogleGenerativeAI({ apiKey: config.googleApiKey }),
  }),
  ...(config.groqApiKey !== undefined && { groq: createGroq({ apiKey: config.groqApiKey }) }),
  ...(config.openaiApiKey !== undefined && { openai: createOpenAI({ apiKey: config.openaiApiKey }) }),
};

type PromptMap = Record<string, string>;

interface SwarmWeaverOptions {
  provider: keyof typeof registryOptions;
  model: string;
  promptMap: PromptMap;
}

export class SwarmWeaver {
  private registry: ProviderRegistryProvider<typeof registryOptions>;
  private model: LanguageModelV1;
  private promptMap: PromptMap;
  constructor(options: SwarmWeaverOptions) {
    this.promptMap = options.promptMap;
    this.registry = createProviderRegistry(registryOptions);
    this.model = this.registry.languageModel(`${options.provider}:${options.model}`);
  }
  run(properties: PromptProperties, stream: ReadableStream): ReadableStream {
    const timer = logger.startTimer();
    const conductor = new PromptConductor(properties, { model: this.model, promptMap: this.promptMap });
    return stream.pipeThrough(conductor).pipeThrough(
      new TransformStream({
        flush() {
          process.stdout.write("\n");
          logger.info("", { total: "agent" });
          timer.done({ message: "" });
        },
      }),
    );
  }
}

interface ContextOptions {
  promptMap: PromptMap;
  model: LanguageModelV1;
}

type PromptProperties =
  | {
      name: string;
      attributes: Record<string, string>;
    }
  | {
      name: null;
    };

class PromptConductor extends ConductorStream<string, string> {
  private prompt: string;
  constructor(properties: PromptProperties, options: ContextOptions) {
    logger.debug(`Prompt "${properties.name}" init`);
    const { name, attributes } = properties.name !== null ? properties : {};
    const maybePrompt: string | undefined = name !== undefined ? options.promptMap[name] : "{{_content_}}";
    let content = "";
    super({
      transform(chunk) {
        logger.debug(`Prompt data: "${chunk}"`);
        content += chunk;
      },
      finish: (chain) => {
        this.prompt = this.prompt.replaceAll(/{{_content_}}/gi, content);
        logger.debug(`Prompt "${properties.name}" ready`);
        const conductor = new AgentConductor(this.prompt, options, { prompt: name ?? "stream" });
        chain(conductor.readable);
        chain(null);
      },
    });
    if (maybePrompt === undefined) {
      throw new Error(`Unable to resolve prompt: "${name}"`);
    }
    this.prompt = maybePrompt;
    if (attributes === undefined) {
      return;
    }
    Object.entries(attributes).forEach(([key, value]) => {
      this.prompt = this.prompt.replaceAll(new RegExp(`{{${key}}}`, "ig"), value);
    });
  }
}

interface Metadata {
  prompt: string;
}

let agentIndex = 0;

class AgentConductor extends ConductorStream<string, string> {
  private chain: Chain<string>;
  constructor(prompt: string, options: ContextOptions, meta: Metadata) {
    const id = `Agent[${agentIndex++}](${meta.prompt})`;
    const agentLogger = logger.child({ id, group: "agent" });
    const timer = agentLogger.startTimer();
    agentLogger.info("");
    agentLogger.debug(`init: ${prompt}`);
    let maybeChain: Chain<string> | undefined;
    const chainStack: Chain<string>[] = [];
    const parser = new Parser(
      {
        onopentag: (name, attributes) => {
          agentLogger.debug(`onopentag: stack[${chainStack.length}] <${name}> ${JSON.stringify(attributes)}`);
          const parentChain = chainStack.at(-1);
          const conductor = new PromptConductor({ name, attributes }, options);
          const { sequence, push: chain } = asyncIterableSequencer();
          if (parentChain) {
            parentChain(conductor.readable);
            agentLogger.debug(`parent: stack[${chainStack.length}]`);
          } else {
            this.chain(conductor.readable);
            agentLogger.debug(`this.chain: stack[${chainStack.length}]`);
          }
          chainStack.push(chain);
          ReadableStream.from(sequence)
            .pipeTo(conductor.writable)
            .catch((error: unknown) => {
              throw new Error("Unexpected error in prompt stream", { cause: error });
            });
        },
        ontext: (text) => {
          agentLogger.debug(`ontext: stack[${chainStack.length}] "${text}"`);
          const parentChain = chainStack.at(-1);
          if (parentChain) {
            agentLogger.debug(`parentChain: stack[${chainStack.length}]`);
            parentChain([text].values());
          } else {
            agentLogger.debug(`this.chain: stack[${chainStack.length}]`);
            this.chain([text].values());
          }
        },
        onclosetag: () => {
          agentLogger.debug(`onclosetag: stack[${chainStack.length}]`);
          const parentChain = chainStack.pop();
          if (parentChain) {
            parentChain(null);
          } else {
            throw new Error("Unexpected close tag in plaintext parse");
          }
        },
      },
      { xmlMode: true, lowerCaseAttributeNames: true, lowerCaseTags: true },
    );
    super({
      start(chain) {
        agentLogger.debug(`start`);
        maybeChain = chain;
      },
      transform(chunk) {
        agentLogger.debug(`data: "${chunk}"`);
        parser.write(chunk);
      },
      finish(chain) {
        timer.done({ message: "" });
        let parentChain: Chain<string> | undefined;
        while ((parentChain = chainStack.pop())) {
          parentChain(null);
        }
        chain(null);
      },
    });
    if (maybeChain === undefined) {
      throw new Error("Chain function could not be resolved");
    }
    this.chain = maybeChain;
    const textStream = streamText({ model: options.model, prompt });
    textStream
      .toTextStreamResponse()
      .body?.pipeThrough(new TextDecoderStream())
      .pipeTo(this.writable)
      .catch(async (error: unknown) => {
        await this.writable.abort();
        throw new Error("Error streaming text:", { cause: error });
      });
  }
}
