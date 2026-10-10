/**
 * dsh-ponytail host half:
 * 1. Persists state (~/.dsh-ponytail/state.json).
 * 2. Injects Ponytail rules into the model's system prompt (order: 60).
 * 3. Registers 6 Ponytail skills from ../skills via ctx.skills provider.
 * 4. Exposes chat commands (/ponytail on|off|level <mode>|status, /ponytail-on, etc.).
 * 5. Mounts UI HTTP routes (/ponytail/status and /ponytail/state) on webServer.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-commands'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_LEVEL,
  LEVELS,
  PLUGIN_NAME,
  SECTION_ORDER,
  type PonytailLevel,
} from './constants.ts'
import { mountPonytailRoutes, type PonytailConfig } from './routes.ts'

export const name = PLUGIN_NAME
export const inject = ['skills', 'systemPrompt', 'commands']

/** Registry precedence for packaged skill providers: ranks below the local bundled root. */
const PACKAGED_SKILL_RANK = 550

/** The source bucket these skills advertise under (prompt-visible metadata). */
const SOURCE = 'custom'

const DEFAULT_CONFIG: PonytailConfig = {
  enabled: false,
  level: DEFAULT_LEVEL,
}

function stateDir(): string {
  return join(homedir(), '.dsh-ponytail')
}

function stateFile(): string {
  return join(stateDir(), 'state.json')
}

function loadState(): PonytailConfig {
  try {
    if (!existsSync(stateFile())) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(readFileSync(stateFile(), 'utf8')) as Partial<PonytailConfig>
    const level = parsed.level !== undefined && Object.hasOwn(LEVELS, parsed.level)
      ? (parsed.level as PonytailLevel)
      : DEFAULT_LEVEL
    return {
      enabled: parsed.enabled === true,
      level,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function saveState(state: PonytailConfig): void {
  try {
    mkdirSync(stateDir(), { recursive: true })
    writeFileSync(stateFile(), JSON.stringify(state, null, 2))
  } catch {
    /* best-effort persistence */
  }
}

/**
 * Parse the YAML frontmatter block of a SKILL.md into metadata plus body.
 */
function parseFrontmatter(text: string) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const block = text.slice(3, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')
  const metadata: Record<string, string> = {}
  let currentKey: string | null = null
  let folded = false
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd()
    if (/^[ \t]/.test(line) && currentKey !== null) {
      const value = line.trim()
      if (value) {
        metadata[currentKey] = folded
          ? `${metadata[currentKey]} ${value}`
          : `${metadata[currentKey]}\n${value}`
      }
      continue
    }
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (!match) {
      currentKey = null
      folded = false
      continue
    }
    let value = match[2].trim()
    folded = value === '>' || value === '>-' || value === '>+'
    if (folded) {
      value = ''
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    metadata[match[1]] = value
    currentKey = folded ? match[1] : null
  }
  return { metadata, body }
}

async function parseSkillFile(skillFile: string, signal?: AbortSignal) {
  let text: string
  try {
    text = await readFile(skillFile, 'utf8')
  } catch {
    return undefined
  }
  if (signal?.aborted) return undefined
  const parsed = parseFrontmatter(text)
  if (parsed === null) return undefined
  return {
    name: parsed.metadata.name ?? '',
    description: parsed.metadata.description ?? '',
    whenToUse: parsed.metadata.whenToUse,
    metadata: parsed.metadata,
    content: parsed.body,
  }
}

function invocationFrom(metadata: Record<string, string>) {
  if (metadata['disable-model-invocation'] === 'true') {
    return { modelInvocable: false, userInvocable: true }
  }
  return { modelInvocable: true, userInvocable: true }
}

async function discoverCandidates(skillsRoot: string, signal?: AbortSignal) {
  let entries
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true })
  } catch {
    return []
  }
  const candidates = []
  for (const entry of entries) {
    if (signal?.aborted) break
    if (!entry.isDirectory()) continue
    const skillDir = join(skillsRoot, entry.name)
    const skillFile = join(skillDir, 'SKILL.md')
    const parsed = await parseSkillFile(skillFile, signal)
    if (parsed === undefined) continue
    candidates.push({
      name: parsed.name,
      description: parsed.description,
      ...(parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {}),
      invocation: invocationFrom(parsed.metadata),
      source: SOURCE,
      provider: PLUGIN_NAME,
      rank: PACKAGED_SKILL_RANK,
      locator: skillDir,
      path: skillFile,
      ...(Object.keys(parsed.metadata).length > 0 ? { metadata: parsed.metadata } : {}),
    })
  }
  return candidates
}

export function apply(ctx: Context): void {
  let state: PonytailConfig = loadState()

  const setState = (next: PonytailConfig): void => {
    state = next
    saveState(next)
  }

  // 1. Register skill provider for the 6 ponytail skills in ../skills
  const skillsRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')
  if ((ctx as any).skills?.registerProvider) {
    ;(ctx as any).skills.registerProvider((_control: any) => ({
      name: PLUGIN_NAME,
      async list(options: any) {
        return discoverCandidates(skillsRoot, options?.signal)
      },
      async get(candidate: any, options: any) {
        const parsed = await parseSkillFile(candidate.path, options?.signal)
        if (parsed === undefined) return undefined
        return {
          name: parsed.name,
          description: parsed.description,
          ...(parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {}),
          invocation: invocationFrom(parsed.metadata),
          source: SOURCE,
          provider: PLUGIN_NAME,
          resourceBase: { kind: 'directory', path: candidate.locator },
          path: candidate.path,
          ...(Object.keys(parsed.metadata).length > 0 ? { metadata: parsed.metadata } : {}),
          content: parsed.content,
        }
      },
    }))
  }

  // 2. Core prompt injection and chat commands
  const registerPromptAndCommands = () => {
    const disposers: Array<() => void> = []

    if ((ctx as any).systemPrompt?.section) {
      const disposeSection = (ctx as any).systemPrompt.section({
        name: 'ponytail-mode',
        order: SECTION_ORDER,
        text: () => (state.enabled ? LEVELS[state.level] : ''),
      })
      if (typeof disposeSection === 'function') disposers.push(disposeSection)
    }

    if ((ctx as any).commands?.register) {
      const reg = (ctx as any).commands.register.bind((ctx as any).commands)

      disposers.push(
        reg({
          name: 'ponytail',
          description: 'Ponytail 主命令：/ponytail on|off|level <mode>|status',
          handler: async (invocation: any) => {
            const raw = String(invocation?.rawInput ?? '').trim()
            const [subcommand, ...rest] = raw.split(/\s+/)
            const sub = (subcommand ?? '').toLowerCase()
            const arg = rest.join(' ').trim().toLowerCase()

            switch (sub) {
              case 'on':
                setState({ ...state, enabled: true })
                return { kind: 'success', text: `极简开发模式已开启（档位 ${state.level}）` }
              case 'off':
                setState({ ...state, enabled: false })
                return { kind: 'success', text: '极简开发模式已关闭' }
              case 'level': {
                if (!Object.hasOwn(LEVELS, arg)) {
                  return { kind: 'error', text: `未知档位「${arg}」，可选：${Object.keys(LEVELS).join(' / ')}` }
                }
                setState({ ...state, level: arg as PonytailLevel, enabled: true })
                return { kind: 'success', text: `档位已切到 ${arg}` }
              }
              case 'status':
              default: {
                const statusText = state.enabled ? `开启（档位 ${state.level}）` : '关闭'
                return {
                  kind: 'success',
                  text: `Ponytail 状态:\n- 极简开发: ${statusText}\n用法: /ponytail on | off | level <mode> | status`,
                }
              }
            }
          },
        }),
      )

      disposers.push(
        reg({
          name: 'ponytail-on',
          description: '开启极简开发模式',
          handler: async () => {
            setState({ ...state, enabled: true })
            return { kind: 'success', text: `极简开发模式已开启（档位 ${state.level}）` }
          },
        }),
      )

      disposers.push(
        reg({
          name: 'ponytail-off',
          description: '关闭极简开发模式',
          handler: async () => {
            setState({ ...state, enabled: false })
            return { kind: 'success', text: '极简开发模式已关闭' }
          },
        }),
      )

      disposers.push(
        reg({
          name: 'ponytail-level',
          description: '切换极简档位：lite / full / ultra',
          handler: async (invocation: any) => {
            const raw = String(invocation?.rawInput ?? '').trim().toLowerCase()
            if (!Object.hasOwn(LEVELS, raw)) {
              return { kind: 'error', text: `未知档位「${raw}」，可选：${Object.keys(LEVELS).join(' / ')}` }
            }
            setState({ ...state, level: raw as PonytailLevel, enabled: true })
            return { kind: 'success', text: `档位已切到 ${raw}` }
          },
        }),
      )

      disposers.push(
        reg({
          name: 'ponytail-status',
          description: '查看极简开发模式状态',
          handler: async () => {
            const statusText = state.enabled ? `开启（档位 ${state.level}）` : '关闭'
            return {
              kind: 'success',
              text: `Ponytail 状态:\n- 极简开发: ${statusText}`,
            }
          },
        }),
      )
    }

    return () => {
      for (const d of disposers) {
        if (typeof d === 'function') d()
      }
    }
  }

  if (typeof (ctx as any).effect === 'function') {
    ;(ctx as any).effect(() => registerPromptAndCommands(), 'dsh-ponytail lifecycle')
  } else {
    registerPromptAndCommands()
  }

  // 3. Mount UI HTTP routes on webServer
  if (typeof (ctx as any).inject === 'function') {
    ;(ctx as any).inject(['webServer'], (scoped: Context) => {
      if (typeof (scoped as any).effect === 'function') {
        ;(scoped as any).effect(() => mountPonytailRoutes(
          scoped,
          () => state,
          (next) => setState(next),
        ), 'dsh-ponytail ui routes')
      } else {
        mountPonytailRoutes(
          scoped,
          () => state,
          (next) => setState(next),
        )
      }
    })
  } else if ((ctx as any).get?.('webServer')) {
    mountPonytailRoutes(
      ctx,
      () => state,
      (next) => setState(next),
    )
  }
}

export default { apply, name, inject }
