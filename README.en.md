# dsh-ponytail

[![npm version](https://img.shields.io/npm/v/dsh-ponytail-skills)](https://www.npmjs.com/package/dsh-ponytail-skills)
[![GitHub release](https://img.shields.io/github/v/release/gongyijie85/dsh-ponytail)](https://github.com/gongyijie85/dsh-ponytail/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Ponytail, the lazy senior dev mode, for the **DeepSeek Harness (DSH)** — 6
skills adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
(the ~76k⭐ "laziest solution that actually works" coding style).

The plugin registers a skill provider on the **host layer** of the `ctx.skills`
registry. The 6 skills ship inside the package (`skills/<name>/SKILL.md`); no
user configuration needed.

> **Unofficial port**: skill content adapted from
> [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
> (MIT, © DietrichGebert).

## Quick start

Tell the agent **"use ponytail mode for this code"**, or let it adopt the style
on its own while coding: YAGNI → reuse existing code → standard library →
native platform features → one line → minimal code. Intensity levels:
`lite` / `full` (default) / `ultra`; `"stop ponytail"` exits the mode.

## Skills

| Skill | Purpose |
| --- | --- |
| `ponytail` | Core mode: forces the laziest working solution — YAGNI → stdlib → native → one line → minimum. lite / full (default) / ultra |
| `ponytail-review` | Code review focused exclusively on over-engineering: one line per finding (location, what to cut, what replaces it) |
| `ponytail-audit` | Whole-repo over-engineering audit (repo-wide ponytail-review): ranked list, biggest cut first |
| `ponytail-debt` | Harvest every `ponytail:` comment into a debt ledger so deferrals don't rot into "later means never" |
| `ponytail-gain` | Show ponytail's measured impact as a compact scoreboard (benchmark medians) |
| `ponytail-help` | Quick-reference card for all modes, skills and commands |

## Install

```sh
# npm (the plain `dsh-ponytail` name is taken by another project; this port
# publishes as dsh-ponytail-skills)
dsh plugin --profile web add dsh-ponytail-skills

# GitHub
dsh plugin --profile web add github:gongyijie85/dsh-ponytail

# Local folder (development)
dsh plugin --profile web add D:\plugins\dsh-ponytail
```

Restart the profile (`dsh web`) — the skills then load with the `skill` tool.

## How it works

- **Bundle layer** — `cordis.patch.yml` inserts a plugin row over the dsh-base
  layer; later layers can address it by id.
- **Provider** — `lib/index.js` calls `ctx.skills.registerProvider(...)`:
  scans `skills/`, parses `name`/`description` from YAML frontmatter, returns
  full skill definitions with `resourceBase` pointing at each skill directory.
- **Zero runtime dependencies** — Node built-ins only.

## Adaptation notes (vs upstream)

- **Flattened descriptions**: upstream's folded `description: >` multi-line
  frontmatter was flattened to single lines — the DSH discovery parser reads
  scalar values only.
- Skill bodies unchanged (pure prompts, no harness-specific references);
  `argument-hint`, `license` and other metadata pass through verbatim.
- Invocation: all skills are model+user invocable (upstream sets no
  `disable-model-invocation`).

## License

MIT. Skill content © DietrichGebert
([ponytail](https://github.com/DietrichGebert/ponytail)); DSH port ©
gongyijie85. See [LICENSE](LICENSE).
