import { fillArgs } from "./args.ts";
import { decide, engine } from "./decider.ts";
import { tools } from "./tools.ts";
import type { Step } from "./types.ts";

const maxSteps = Number(process.env.CHIP_MAX_STEPS ?? 12);
const minConfidence = Number(process.env.CHIP_MIN_CONFIDENCE ?? 0.25);

const pct = (n: number) => `${Math.round(n * 100)}%`;
const indent = (text: string) =>
  text
    .split("\n")
    .slice(0, 12)
    .map((line) => `      ${line.slice(0, 160)}`)
    .join("\n");

export async function run(prompt: string) {
  const summary: string[] = [];
  let last: Step | null = null;

  console.log(`chip · deciding with ${engine}\n${prompt}`);

  for (let step = 1; step <= maxSteps; step++) {
    const decision = await decide(prompt, tools, summary, last);
    if (decision.note) summary.push(decision.note);

    const tool = tools.find((t) => t.name === decision.tool);
    console.log(
      `\n[${step}] ${decision.tool}  pick ${pct(decision.confidence)}  done ${pct(decision.complete)}`,
    );

    if (!tool) {
      console.log(`      stopping: no such tool`);
      break;
    }
    if (decision.confidence < minConfidence) {
      console.log(`      stopping: no clear next tool`);
      break;
    }

    const args = await fillArgs(prompt, tool, summary, last);
    console.log(`      ${JSON.stringify(args)}`);

    let result: string;
    try {
      result = await tool.run(args);
    } catch (err) {
      result = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
    console.log(indent(result));

    last = { tool: tool.name, args, result };
    if (tool.name === "answer") break;
  }

  console.log(`\nsummary`);
  for (const line of summary) console.log(`- ${line}`);
  if (last?.tool === "answer") console.log(`\n${last.result}`);
}
