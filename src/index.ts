import { run } from "./loop.ts";

const prompt = process.argv.slice(2).join(" ").trim();
if (!prompt) {
  console.error('usage: npm run chip -- "<prompt>"');
  process.exit(1);
}

run(prompt).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
