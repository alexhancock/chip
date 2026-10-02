import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { claude, effort, maxTokens, model, stringSchema } from "./claude.ts";
import type { Step, Tool } from "./types.ts";

const system =
  "You fill in the arguments for one tool call that has already been chosen for you. You do not choose the tool and you do not question the choice.";

export async function fillArgs(
  prompt: string,
  tool: Tool,
  summary: string[],
  last: Step | null = null,
) {
  const names = Object.keys(tool.args);
  if (names.length === 0) return {};

  const response = await claude.messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    output_config: { effort, format: jsonSchemaOutputFormat(stringSchema(tool.args)) },
    messages: [
      {
        role: "user",
        content: [
          `Request: ${prompt}`,
          `Accomplished so far:\n${summary.length ? summary.map((s) => `- ${s}`).join("\n") : "nothing yet"}`,
          last
            ? `Output of the last call (${last.tool}):\n${last.result.slice(0, 6000)}`
            : "No tool has been run yet.",
          `Tool chosen: ${tool.name} - ${tool.purpose}`,
          `Fill in its arguments so the call makes progress on the request.`,
        ].join("\n\n"),
      },
    ],
  });

  const parsed = (response.parsed_output ?? {}) as Record<string, unknown>;
  return Object.fromEntries(names.map((name) => [name, String(parsed[name] ?? "")]));
}
