import Anthropic from "@anthropic-ai/sdk";

export const claude = new Anthropic();
export const model = process.env.CHIP_CLAUDE_MODEL ?? "claude-sonnet-5-5";
export const maxTokens = Number(process.env.CHIP_MAX_TOKENS ?? 16000);
export const effort = (process.env.CHIP_EFFORT ?? "low") as "low" | "medium" | "high";

export const stringSchema = (fields: Record<string, string>) => ({
  type: "object" as const,
  properties: Object.fromEntries(
    Object.entries(fields).map(([name, description]) => [name, { type: "string" as const, description }]),
  ),
  required: Object.keys(fields),
  additionalProperties: false as const,
});
