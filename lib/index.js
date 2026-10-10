// src/index.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

// src/constants.ts
var PLUGIN_NAME = "dsh-ponytail";
var SECTION_ORDER = 60;
var LEVELS = {
  lite: `# PONYTAIL MODE ACTIVE (level: lite)

<EXTREMELY-IMPORTANT>
The user enabled Ponytail (lazy senior dev mode) in settings (intensity: lite).

CRITICAL MANDATORY INSTRUCTION:
When handling ANY coding, development, algorithm, programming, debugging, refactoring, code review, or software design task, you ABSOLUTELY MUST invoke the \`skill\` tool with argument {"name": "ponytail"} BEFORE writing code or taking actions.
DO NOT write code or provide implementations before calling the \`ponytail\` skill.
This instruction is mandatory and takes highest precedence over all other skills.
</EXTREMELY-IMPORTANT>

Core Ponytail Rules & Ladder (Lite Intensity):
- Build what is requested, but name the lazier, simpler alternative in one concise line so the user can choose.
- The Ladder:
  1. Does this need to exist at all? (YAGNI)
  2. Already in this codebase? Reuse existing helpers and patterns.
  3. Stdlib does it? Use it before custom code.
  4. Native platform features cover it? (HTML/CSS/DB over JS/frameworks).
  5. Already-installed dependency solves it?
  6. Can it be one line?
  7. Minimum code that works.
- Code first, fewest files, minimal diff. No unrequested abstractions.`,
  full: `# PONYTAIL MODE ACTIVE (level: full)

<EXTREMELY-IMPORTANT>
The user enabled Ponytail (lazy senior dev mode) in settings (intensity: full - default).

CRITICAL MANDATORY INSTRUCTION:
When handling ANY coding, development, algorithm, programming, debugging, refactoring, code review, or software design task, you ABSOLUTELY MUST invoke the \`skill\` tool with argument {"name": "ponytail"} BEFORE writing code or taking actions.
DO NOT write code or provide implementations before calling the \`ponytail\` skill.
This instruction is mandatory and takes highest precedence over all other skills.
</EXTREMELY-IMPORTANT>

Core Ponytail Rules & Ladder (Full Intensity - Default):
- Strictly enforce the 7 rungs of the Ladder:
  1. Does this need to exist at all? (YAGNI \u2014 if speculative, skip it and say so in one line).
  2. Already in this codebase? Look before you write; reuse existing utils and types.
  3. Stdlib does it? Standard library before custom code.
  4. Native platform feature covers it? CSS over JS, native elements over UI libraries, DB constraints over app code.
  5. Already-installed dependency solves it? Never add new dependencies when a few lines suffice.
  6. Can it be one line? Keep it to one line.
  7. Only then: the minimum working code.
- Code first, fewest files possible, shortest working diff. Boring over clever.
- No unrequested abstractions (no single-impl interfaces, no premature factory, no config for constants).
- Fix root cause, not symptom. Explanation at most 3 short lines (what was skipped, when to add it).`,
  ultra: `# PONYTAIL MODE ACTIVE (level: ultra)

<EXTREMELY-IMPORTANT>
The user enabled Ponytail (lazy senior dev mode) in settings (intensity: ultra - YAGNI extremist).

CRITICAL MANDATORY INSTRUCTION:
When handling ANY coding, development, algorithm, programming, debugging, refactoring, code review, or software design task, you ABSOLUTELY MUST invoke the \`skill\` tool with argument {"name": "ponytail"} BEFORE writing code or taking actions.
DO NOT write code or provide implementations before calling the \`ponytail\` skill.
This instruction is mandatory and takes highest precedence over all other skills.
</EXTREMELY-IMPORTANT>

Core Ponytail Rules & Ladder (Ultra Intensity - YAGNI Extremist):
- Extreme YAGNI: Deletion over addition. Challenge every speculative requirement and abstraction.
- Enforce the ladder mercilessly: stdlib and native features only; reject extra dependencies and boilerplate.
- Ship the one-liner or minimal implementation and challenge the rest of the requirement in the same breath.
- Code first, absolute fewest files, minimal diff. Eliminate all scaffolding and complexity.`
};
var DEFAULT_LEVEL = "full";

// src/routes.ts
function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin === void 0 || host === void 0) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function sendJson(response, status, body) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}
async function readJsonBody(request, maxBytes = 4096) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) return void 0;
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return void 0;
  }
}
function mountPonytailRoutes(ctx, getState, setState) {
  const webServer = ctx.get("webServer");
  if (webServer === void 0) {
    console.error("[dsh-ponytail] webServer service absent \u2014 UI routes not mounted");
    return () => {
    };
  }
  const disposers = [
    webServer.register({
      kind: "exact",
      path: "/ponytail/status",
      handler: (_request, response) => {
        const current = getState();
        sendJson(response, 200, current);
      }
    }),
    webServer.register({
      kind: "exact",
      path: "/ponytail/state",
      handler: async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "method not allowed; use POST" });
          return;
        }
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: "untrusted origin" });
          return;
        }
        const body = await readJsonBody(request);
        if (body === void 0 || typeof body !== "object") {
          sendJson(response, 400, { error: "invalid JSON body" });
          return;
        }
        const current = getState();
        const next = {
          enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
          level: typeof body.level === "string" && Object.hasOwn(LEVELS, body.level) ? body.level : current.level
        };
        setState(next);
        sendJson(response, 200, next);
      }
    })
  ];
  return () => {
    for (const dispose of disposers) dispose();
  };
}

// src/index.ts
var name = PLUGIN_NAME;
var inject = ["skills", "systemPrompt", "commands"];
var PACKAGED_SKILL_RANK = 550;
var SOURCE = "custom";
var DEFAULT_CONFIG = {
  enabled: false,
  level: DEFAULT_LEVEL
};
function stateDir() {
  return join(homedir(), ".dsh-ponytail");
}
function stateFile() {
  return join(stateDir(), "state.json");
}
function loadState() {
  try {
    if (!existsSync(stateFile())) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(readFileSync(stateFile(), "utf8"));
    const level = parsed.level !== void 0 && Object.hasOwn(LEVELS, parsed.level) ? parsed.level : DEFAULT_LEVEL;
    return {
      enabled: parsed.enabled === true,
      level
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
function saveState(state) {
  try {
    mkdirSync(stateDir(), { recursive: true });
    writeFileSync(stateFile(), JSON.stringify(state, null, 2));
  } catch {
  }
}
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end);
  const body = text.slice(end + 4).replace(/^\n+/, "");
  const metadata = {};
  let currentKey = null;
  let folded = false;
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trimEnd();
    if (/^[ \t]/.test(line) && currentKey !== null) {
      const value2 = line.trim();
      if (value2) {
        metadata[currentKey] = folded ? `${metadata[currentKey]} ${value2}` : `${metadata[currentKey]}
${value2}`;
      }
      continue;
    }
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!match) {
      currentKey = null;
      folded = false;
      continue;
    }
    let value = match[2].trim();
    folded = value === ">" || value === ">-" || value === ">+";
    if (folded) {
      value = "";
    } else if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    metadata[match[1]] = value;
    currentKey = folded ? match[1] : null;
  }
  return { metadata, body };
}
async function parseSkillFile(skillFile, signal) {
  let text;
  try {
    text = await readFile(skillFile, "utf8");
  } catch {
    return void 0;
  }
  if (signal?.aborted) return void 0;
  const parsed = parseFrontmatter(text);
  if (parsed === null) return void 0;
  return {
    name: parsed.metadata.name ?? "",
    description: parsed.metadata.description ?? "",
    whenToUse: parsed.metadata.whenToUse,
    metadata: parsed.metadata,
    content: parsed.body
  };
}
function invocationFrom(metadata) {
  if (metadata["disable-model-invocation"] === "true") {
    return { modelInvocable: false, userInvocable: true };
  }
  return { modelInvocable: true, userInvocable: true };
}
async function discoverCandidates(skillsRoot, signal) {
  let entries;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const candidates = [];
  for (const entry of entries) {
    if (signal?.aborted) break;
    if (!entry.isDirectory()) continue;
    const skillDir = join(skillsRoot, entry.name);
    const skillFile = join(skillDir, "SKILL.md");
    const parsed = await parseSkillFile(skillFile, signal);
    if (parsed === void 0) continue;
    candidates.push({
      name: parsed.name,
      description: parsed.description,
      ...parsed.whenToUse !== void 0 ? { whenToUse: parsed.whenToUse } : {},
      invocation: invocationFrom(parsed.metadata),
      source: SOURCE,
      provider: PLUGIN_NAME,
      rank: PACKAGED_SKILL_RANK,
      locator: skillDir,
      path: skillFile,
      ...Object.keys(parsed.metadata).length > 0 ? { metadata: parsed.metadata } : {}
    });
  }
  return candidates;
}
function apply(ctx) {
  let state = loadState();
  const setState = (next) => {
    state = next;
    saveState(next);
  };
  const skillsRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");
  if (ctx.skills?.registerProvider) {
    ;
    ctx.skills.registerProvider((_control) => ({
      name: PLUGIN_NAME,
      async list(options) {
        return discoverCandidates(skillsRoot, options?.signal);
      },
      async get(candidate, options) {
        const parsed = await parseSkillFile(candidate.path, options?.signal);
        if (parsed === void 0) return void 0;
        return {
          name: parsed.name,
          description: parsed.description,
          ...parsed.whenToUse !== void 0 ? { whenToUse: parsed.whenToUse } : {},
          invocation: invocationFrom(parsed.metadata),
          source: SOURCE,
          provider: PLUGIN_NAME,
          resourceBase: { kind: "directory", path: candidate.locator },
          path: candidate.path,
          ...Object.keys(parsed.metadata).length > 0 ? { metadata: parsed.metadata } : {},
          content: parsed.content
        };
      }
    }));
  }
  const registerPromptAndCommands = () => {
    const disposers = [];
    if (ctx.systemPrompt?.section) {
      const disposeSection = ctx.systemPrompt.section({
        name: "ponytail-mode",
        order: SECTION_ORDER,
        text: () => state.enabled ? LEVELS[state.level] : ""
      });
      if (typeof disposeSection === "function") disposers.push(disposeSection);
    }
    if (ctx.commands?.register) {
      const reg = ctx.commands.register.bind(ctx.commands);
      disposers.push(
        reg({
          name: "ponytail",
          description: "Ponytail \u4E3B\u547D\u4EE4\uFF1A/ponytail on|off|level <mode>|status",
          handler: async (invocation) => {
            const raw = String(invocation?.rawInput ?? "").trim();
            const [subcommand, ...rest] = raw.split(/\s+/);
            const sub = (subcommand ?? "").toLowerCase();
            const arg = rest.join(" ").trim().toLowerCase();
            switch (sub) {
              case "on":
                setState({ ...state, enabled: true });
                return { kind: "success", text: `\u6781\u7B80\u5F00\u53D1\u6A21\u5F0F\u5DF2\u5F00\u542F\uFF08\u6863\u4F4D ${state.level}\uFF09` };
              case "off":
                setState({ ...state, enabled: false });
                return { kind: "success", text: "\u6781\u7B80\u5F00\u53D1\u6A21\u5F0F\u5DF2\u5173\u95ED" };
              case "level": {
                if (!Object.hasOwn(LEVELS, arg)) {
                  return { kind: "error", text: `\u672A\u77E5\u6863\u4F4D\u300C${arg}\u300D\uFF0C\u53EF\u9009\uFF1A${Object.keys(LEVELS).join(" / ")}` };
                }
                setState({ ...state, level: arg, enabled: true });
                return { kind: "success", text: `\u6863\u4F4D\u5DF2\u5207\u5230 ${arg}` };
              }
              case "status":
              default: {
                const statusText = state.enabled ? `\u5F00\u542F\uFF08\u6863\u4F4D ${state.level}\uFF09` : "\u5173\u95ED";
                return {
                  kind: "success",
                  text: `Ponytail \u72B6\u6001:
- \u6781\u7B80\u5F00\u53D1: ${statusText}
\u7528\u6CD5: /ponytail on | off | level <mode> | status`
                };
              }
            }
          }
        })
      );
      disposers.push(
        reg({
          name: "ponytail-on",
          description: "\u5F00\u542F\u6781\u7B80\u5F00\u53D1\u6A21\u5F0F",
          handler: async () => {
            setState({ ...state, enabled: true });
            return { kind: "success", text: `\u6781\u7B80\u5F00\u53D1\u6A21\u5F0F\u5DF2\u5F00\u542F\uFF08\u6863\u4F4D ${state.level}\uFF09` };
          }
        })
      );
      disposers.push(
        reg({
          name: "ponytail-off",
          description: "\u5173\u95ED\u6781\u7B80\u5F00\u53D1\u6A21\u5F0F",
          handler: async () => {
            setState({ ...state, enabled: false });
            return { kind: "success", text: "\u6781\u7B80\u5F00\u53D1\u6A21\u5F0F\u5DF2\u5173\u95ED" };
          }
        })
      );
      disposers.push(
        reg({
          name: "ponytail-level",
          description: "\u5207\u6362\u6781\u7B80\u6863\u4F4D\uFF1Alite / full / ultra",
          handler: async (invocation) => {
            const raw = String(invocation?.rawInput ?? "").trim().toLowerCase();
            if (!Object.hasOwn(LEVELS, raw)) {
              return { kind: "error", text: `\u672A\u77E5\u6863\u4F4D\u300C${raw}\u300D\uFF0C\u53EF\u9009\uFF1A${Object.keys(LEVELS).join(" / ")}` };
            }
            setState({ ...state, level: raw, enabled: true });
            return { kind: "success", text: `\u6863\u4F4D\u5DF2\u5207\u5230 ${raw}` };
          }
        })
      );
      disposers.push(
        reg({
          name: "ponytail-status",
          description: "\u67E5\u770B\u6781\u7B80\u5F00\u53D1\u6A21\u5F0F\u72B6\u6001",
          handler: async () => {
            const statusText = state.enabled ? `\u5F00\u542F\uFF08\u6863\u4F4D ${state.level}\uFF09` : "\u5173\u95ED";
            return {
              kind: "success",
              text: `Ponytail \u72B6\u6001:
- \u6781\u7B80\u5F00\u53D1: ${statusText}`
            };
          }
        })
      );
    }
    return () => {
      for (const d of disposers) {
        if (typeof d === "function") d();
      }
    };
  };
  if (typeof ctx.effect === "function") {
    ;
    ctx.effect(() => registerPromptAndCommands(), "dsh-ponytail lifecycle");
  } else {
    registerPromptAndCommands();
  }
  if (typeof ctx.inject === "function") {
    ;
    ctx.inject(["webServer"], (scoped) => {
      if (typeof scoped.effect === "function") {
        ;
        scoped.effect(() => mountPonytailRoutes(
          scoped,
          () => state,
          (next) => setState(next)
        ), "dsh-ponytail ui routes");
      } else {
        mountPonytailRoutes(
          scoped,
          () => state,
          (next) => setState(next)
        );
      }
    });
  } else if (ctx.get?.("webServer")) {
    mountPonytailRoutes(
      ctx,
      () => state,
      (next) => setState(next)
    );
  }
}
var index_default = { apply, name, inject };
export {
  apply,
  index_default as default,
  inject,
  name
};
//# sourceMappingURL=index.js.map
