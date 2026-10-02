import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { claude, effort, model } from "./claude.ts";
import type { Decision, Step, Tool } from "./types.ts";

const outcomes = {
  advanced: "it returned new useful information, or successfully changed something",
  confirmed: "it only confirmed something already known and added nothing new",
  empty: "it ran but came back with nothing useful",
  failed: "it errored, or turned out to be the wrong thing to have done",
};

const questions = {
  tool: "Which single tool should be used next to make progress on the request?",
  outcome: "What did the last tool call accomplish?",
  complete: "Has the request been fully carried out, with nothing left to do or verify?",
};

const clip = (text: string, max = 6000) =>
  text.length > max ? `${text.slice(0, max)}\n... (${text.length - max} more characters)` : text;

const shorten = (value: string) => (value.length > 40 ? `${value.slice(0, 40)}...` : value);

const note = (last: Step | null, outcome: string) =>
  last ? `${last.tool}(${Object.values(last.args).map(shorten).join(", ")}) -> ${outcome}` : "";

const makeState = (prompt: string, summary: string[], last: Step | null) => ({
  request: prompt,
  accomplished_so_far: summary.length ? summary : "nothing yet, this is the first step",
  last_tool: last?.tool ?? null,
  last_args: last?.args ?? null,
  last_result: last ? clip(last.result) : null,
});

async function decideWithJev(prompt: string, tools: Tool[], summary: string[], last: Step | null) {
  const client = new TypeSafeClient();
  const { answers } = await client.systemOne({
    state: makeState(prompt, summary, last),
    questions: {
      tool: choice(questions.tool, Object.fromEntries(tools.map((t) => [t.name, t.purpose]))),
      outcome: choice(questions.outcome, outcomes),
      complete: noul(questions.complete),
    },
  });
  return {
    tool: answers.tool.choice,
    confidence: answers.tool.confidence,
    complete: answers.complete.noul,
    note: note(last, answers.outcome.choice),
  };
}

async function decideWithClaude(prompt: string, tools: Tool[], summary: string[], last: Step | null) {
  const schema = {
    type: "object" as const,
    properties: {
      tool: {
        type: "string" as const,
        enum: tools.map((t) => t.name),
        description: questions.tool,
      },
      confidence: {
        type: "number" as const,
        description: "0 to 1, how clearly that tool is the right one to use next",
      },
      outcome: {
        type: "string" as const,
        enum: Object.keys(outcomes),
        description: questions.outcome,
      },
      complete: {
        type: "number" as const,
        description: `0 to 1, the probability that: ${questions.complete}`,
      },
    },
    required: ["tool", "confidence", "outcome", "complete"],
    additionalProperties: false as const,
  };

  const response = await claude.messages.parse({
    model,
    max_tokens: 2048,
    system:
      "You stand in for a decision model in a coding agent. Judge the state you are given and answer the questions. Do not write prose, do not plan ahead, and do not call tools yourself.",
    output_config: { effort, format: jsonSchemaOutputFormat(schema) },
    messages: [
      {
        role: "user",
        content: [
          JSON.stringify(makeState(prompt, summary, last), null, 2),
          `Tools:\n${tools.map((t) => `- ${t.name}: ${t.purpose}`).join("\n")}`,
          `Outcomes of the last call:\n${Object.entries(outcomes)
            .map(([name, meaning]) => `- ${name}: ${meaning}`)
            .join("\n")}`,
        ].join("\n\n"),
      },
    ],
  });

  const parsed = (response.parsed_output ?? {}) as Record<string, unknown>;
  return {
    tool: String(parsed.tool ?? ""),
    confidence: Number(parsed.confidence ?? 0),
    complete: Number(parsed.complete ?? 0),
    note: note(last, String(parsed.outcome ?? "unknown")),
  };
}

export const engine = process.env.TYPESAFE_API_KEY ? "jev" : model;

export function decide(
  prompt: string,
  tools: Tool[],
  summary: string[],
  last: Step | null,
): Promise<Decision> {
  const run = engine === "jev" ? decideWithJev : decideWithClaude;
  return run(prompt, tools, summary, last);
}
