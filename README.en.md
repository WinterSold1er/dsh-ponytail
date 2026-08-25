# dsh-ponytail

[![npm version](https://img.shields.io/npm/v/dsh-ponytail-skills)](https://www.npmjs.com/package/dsh-ponytail-skills)
[![GitHub release](https://img.shields.io/github/v/release/gongyijie85/dsh-ponytail)](https://github.com/gongyijie85/dsh-ponytail/releases)
[![CI](https://github.com/gongyijie85/dsh-ponytail/actions/workflows/ci.yml/badge.svg)](https://github.com/gongyijie85/dsh-ponytail/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<div align="center">

**English** | [简体中文](README.md)

</div>

Port of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
(~76k★ "laziest senior dev" coding style) to the **DeepSeek Harness (DSH)**
Cordis plugin architecture.

The plugin registers a skill provider into the **host layer** of the
`ctx.skills` registry; the 6 skills ship in the package
(`skills/<name>/SKILL.md`), no user config needed.

> **Unofficial port**: skill content adapted from
> [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
> (MIT, © DietrichGebert).

## Quick start

Tell the agent **"use ponytail mode for this code"**, or let it adopt the style
on its own while coding: YAGNI → reuse existing code → standard library →
native platform features → one line → minimal code. Intensity levels:
`lite` / `full` (default) / `ultra`; `"stop ponytail"` exits the mode.

The mode also switches per session like caveman:

```sh
/ponytail full     # on: injects ponytail rules into the system prompt every turn
/ponytail lite     # light
/ponytail ultra    # maximum
/ponytail off      # off (default; normal coding style resumes)
```

Default is `off` so it never hijacks replies. Once on, `[PONYTAIL]` (or
`[PONYTAIL:ULTRA]`) is injected as a directive — ponytail applies
deterministically, not only when the model happens to load `skill ponytail`.

## Differences from upstream / original dsh-ponytail

- **Activation shell (new in this fork)**: mirrors `dsh-caveman` —
  a `sessionProjections` unit (`ponytail/change` events) + `/ponytail` command
  + `systemPrompt.section` injection. The original shipped ponytail as a
  passive skill whose content only reached the model when the model explicitly
  called `skill ponytail`, so it looked like it "never triggered". This fork
  adds the deterministic injection path.
- **Zero runtime deps**: an inline validator replaces `zod` (the original
  package already claimed zero runtime dependencies).
- Skill content is verbatim from upstream.

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

# Local development
dsh plugin --profile web add D:\plugins\dsh-ponytail
```

After install, restart the profile (`dsh web`); the skills load via the
`skill` tool.

## How it works

- **Bundle layer** — `cordis.patch.yml` inserts a plugin row over the dsh-base
  layer; later layers can target the row by id.
- **Provider** — `lib/index.js` calls `ctx.skills.registerProvider(...)`:
  scans the `skills/` dir, parses `name`/`description` from YAML frontmatter,
  returns full skill definitions, `resourceBase` points at the skill dir.
- **Zero runtime deps** — Node built-ins only.

## Porting notes (vs upstream)

- **Skill files are verbatim from upstream**, including the `description: >`
  folded multi-line frontmatter — the provider parses folded scalars natively
  (joined with single spaces per YAML), no rewriting needed.
- `argument-hint`, `license` and other metadata pass through as-is.
- Invocation semantics: all skills are model- and user-invocable (upstream
  sets no `disable-model-invocation`).

## License

MIT. Skill content © DietrichGebert ([ponytail](https://github.com/DietrichGebert/ponytail));
DSH port © gongyijie85. See [LICENSE](LICENSE).
