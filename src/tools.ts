import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { Tool } from "./types.ts";

const exec = promisify(execFile);
const root = process.cwd();
const at = (path: string) => resolve(root, path || ".");
const quote = (value: string) => `'${String(value ?? "").replace(/'/g, "'\\''")}'`;

async function sh(command: string) {
  try {
    const { stdout, stderr } = await exec("bash", ["-c", command], {
      cwd: root,
      timeout: 60_000,
      maxBuffer: 1 << 21,
    });
    return `${stdout}${stderr}`.trim() || "(no output)";
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message: string };
    return `exit ${e.code ?? "?"}: ${`${e.stdout ?? ""}${e.stderr ?? ""}`.trim() || e.message}`;
  }
}

export const tools: Tool[] = [
  {
    name: "list_files",
    purpose: "List what files and directories exist somewhere in the project",
    args: { path: "directory path relative to the project root, such as . or src" },
    run: async ({ path }) => (await readdir(at(path))).join("\n") || "(empty directory)",
  },
  {
    name: "read_file",
    purpose: "Read the whole contents of one file whose path is already known",
    args: { path: "file path relative to the project root" },
    run: ({ path }) => readFile(at(path), "utf8"),
  },
  {
    name: "search",
    purpose: "Find which files mention a string or pattern, when the right file is not yet known",
    args: {
      pattern: "a grep extended-regex pattern to look for",
      path: "directory to search under, such as .",
    },
    run: ({ pattern, path }) =>
      sh(
        `grep -rnE --exclude-dir=node_modules --exclude-dir=.git -- ${quote(pattern)} ${quote(path || ".")} | head -40`,
      ),
  },
  {
    name: "write_file",
    purpose: "Create a new file, or replace the entire contents of an existing one",
    args: {
      path: "file path relative to the project root",
      content: "the complete new contents of the file",
    },
    run: async ({ path, content }) => {
      await writeFile(at(path), content ?? "");
      return `wrote ${path} (${(content ?? "").length} bytes)`;
    },
  },
  {
    name: "bash",
    purpose: "Run a shell command to build, test, install, or inspect the system",
    args: { command: "the shell command to run" },
    run: ({ command }) => sh(command),
  },
  {
    name: "answer",
    purpose: "The request has been carried out: report the result and stop working",
    args: { text: "the final answer for the user, citing what was actually done" },
    run: async ({ text }) => text ?? "",
  },
];
