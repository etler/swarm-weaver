# Swarm Weaver

A proof of concept project demonstrating [parallel recursive streaming AI swarms](https://www.timetler.com/2025/08/23/parallel-recursive-streaming-ai-swarms/).

It enables composing AI agents that can independently spawn child AI agents over a single output stream with minimal stream blocking, streaming generated content as soon as it is available.

## Usage

`echo "Come up with a cool sci fi fantasy novel idea" | ./swarm | ./swarm --root="main" --attr-genre="Sci-Fi" main.md chapter.md intro.md paragraph.md ...`

XML tags call other agents. Child content of XML is streamed in.

In the prompt files attribute values are interpolated from the  the values and call other prompts with XML like:

```markdown
You are the main agent, you were asked to write a story about {{genre}} and the user asked for {{_content_}}

Write the outline of the story. For each chapter use XML to spawn a sub agent to write that chapter with an outline you give it:

<chapter number="1" title="Your Chapter Title">
  <summary>Story point for start of chapter 1</summary>
  then...
  <summary>Story point for end of chapter 1</summary>
</chapter>
```

{{_content_}} is a special interpolation value that pipes in a stream either from stdin for the cli command, or the contents of the XML tag, so you could actually put another agent in a nested XML tag.

## .env

```env
LOG_LEVEL=debug|info|warning|error
PROVIDER=anthropic|azure|google|groq|openai
MODEL=
ANTHROPIC_API_KEY=
AZURE_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
OPENAI_API_KEY=
```

## Options

### `--root={prompt_name}`

The root prompt to load. If no root is set it will use `stdin` as the prompt.

### `--output={file_path}`

Writes output to file path instead of std out.

### `--provider=[anthropic|azure|google|groq|openai]`

Override `.env` `PROVIDER`

### `--model={model_name}`

Override `.env` `MODEL`

### `--level=[debug|input|warning|error]`

Override `.env` `LOG_LEVEL`

### `[files...]`

A list of prompt files in any format. Files can be refered to without their extension in tags and `--root`

## Example

Example prompts are provided in `/example/`. The example prompts produce a detailed synopsis of a provided media franchise and summarizes each installment in acts. The generation is executed in parallel while the sequential order of the output stream is maintained.

To try it out, use the following command:

```
echo "Star Wars" | ./swarm --root="main" example/main.md example/installment.md example/act.md
```

© [Tim Etler][author]

[author]: https://github.com/etler
