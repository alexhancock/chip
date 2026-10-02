# chip

A minimal coding agent with no LLM loop. A **decision model** picks the next tool and
judges the last one; Claude is only asked to fill in that tool's arguments.

```
prompt ─> decide ─> fill in arguments ─> run the tool ─┐
            ↑                                          │
            └──────── result + summary ────────────────┘
```

The decider is [Jev](https://docs.typesafe.ai), a System One model: it answers typed
questions and returns probabilities, never prose. Each step it gets three at once —
which tool to use next, what the last call accomplished, and whether the request is
done — so the loop runs on judgments rather than on generated text.

## Run it

```sh
npm install
cp .env.example .env     # add your keys
npm run chip -- "what does the loop in this project do?"
```

```
[1] search  pick 91%  done 20%
      {"pattern":"decideWithJev","path":"src"}
      src/decider.ts:35:async function decideWithJev(prompt: string, ...
```

Keys can go in `.env`, or be exported in your shell, or — for Anthropic — come from
`ant auth login` with nothing set at all. Without a `TYPESAFE_API_KEY`, Claude answers
the decision questions instead, so an Anthropic key alone is enough to try it.

## Settings

All optional, all environment variables.

| | |
| --- | --- |
| `CHIP_CLAUDE_MODEL` | model for arguments. Default `claude-sonnet-5-5` |
| `CHIP_EFFORT` | `low` (default), `medium`, `high` |
| `CHIP_MAX_STEPS` | give up after this many steps. Default `12` |
| `CHIP_MIN_CONFIDENCE` | stop if no tool beats this. Default `0.25` |
| `TYPESAFE_DEFAULT_MODEL` | decision model. Default `jev-latest` |

## Tools

`list_files` · `read_file` · `search` · `write_file` · `bash` · `answer`

They run in the current directory, with no sandbox and no confirmation prompts, so
start it somewhere you don't mind it writing. Add your own in `src/tools.ts`: a name,
a one-line purpose, named arguments, and a function. The purpose is what the decider
chooses between, so write it for a reader who can only see that line.

`answer` is an ordinary tool — choosing it is how the agent stops.
