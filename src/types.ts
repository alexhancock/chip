export type Tool = {
  name: string;
  purpose: string;
  args: Record<string, string>;
  run: (args: Record<string, string>) => Promise<string>;
};

export type Step = {
  tool: string;
  args: Record<string, string>;
  result: string;
};

export type Decision = {
  tool: string;
  confidence: number;
  complete: number;
  note: string;
};
