// dsh-ponytail: the lazy senior dev mode (ponytail) skills for the DeepSeek Harness.
//
// A Cordis plugin that registers one skill provider into the HOST layer of the
// `ctx.skills` registry, so every agent preset's scope chain merges these
// skills. Skill bodies live in `../skills/<name>/SKILL.md` inside this
// package; the provider locates them from `import.meta.url` (an assembly
// fact of this package, never user config) and loads bodies on demand.
//
// The provider protocol mirrors @deepseek-ai/dsh-skill-filesystem:
//   - list()  discovers directory-bundle candidates (name/description from
//     YAML frontmatter, body left unread until requested)
//   - get()   parses the winning candidate's SKILL.md and returns the full
//     definition with a directory resource base for relative references
//
// ACTIVATION SHELL (mirrors dsh-caveman):
// Upstream ponytail and this provider are passive skills: their content only
// reaches the model when the model itself calls the `skill` tool. That makes
// ponytail feel like it "never triggers" compared with caveman, whose plugin
// injects its rules into the system prompt on every turn once the mode is
// active. This plugin closes the gap with the same mechanism:
//   - sessionProjections unit 'ponytail' folds `ponytail/change` session
//     events (default 'off'; per-session by construction)
//   - /ponytail command and plain-text "ponytail <mode>" directive
//     (agent/pre-step) append the change event; directive-only user messages
//     are consumed
//   - system-prompt section injects the active mode as an overriding
//     directive, exactly like caveman's '[CAVEMAN]' section
// No badge/toggle endpoint (that is UI sugar; the mode still turns on via
// the command or directive).
//
// OUT-OF-REPO EVENT VOCABULARY:
// `ponytail/change` is not in the harness's static KNOWN_SESSION_EVENT_TYPES
// (generated in @deepseek-ai/dsh-session), so a session log containing it is
// refused on load unless the type is registered or the event carries
// `ignorable: true` (append() cannot set that flag). We register the type at
// apply() time on the SAME module instance the persistence loader imports,
// mirroring the caveman plugin's fix.
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const name = 'dsh-ponytail'
const inject = ['skills']

/** Registry precedence for packaged skill providers: ranks below the local bundled root. */
const PACKAGED_SKILL_RANK = 550

/** The source bucket these skills advertise under (prompt-visible metadata). */
const SOURCE = 'custom'

const VALID = ['off', 'lite', 'full', 'ultra']
const DIRECTIVE_RE = /^\/?ponytail\s+(off|lite|full|ultra)$/i
const OFF_RE = /^(stop\s+ponytail|normal\s+mode)$/i

// SessionProjectionRegistry consumes a unit's `schema` as `schema.parse(view)`.
// A hand-rolled validator replaces a zod dependency (the package is otherwise
// dependency-free) while keeping the same guarantees: the parse returns the
// validated `{ mode }` or throws on an out-of-range mode.
const schema = {
  parse(value) {
    const mode = value && value.mode
    if (!VALID.includes(mode)) {
      throw new TypeError(`invalid ponytail mode "${String(mode)}", expected one of: ${VALID.join(', ')}`)
    }
    return { mode }
  },
}

function parseDirective(text) {
  if (typeof text !== 'string') return null
  const t = text.trim()
  const m = DIRECTIVE_RE.exec(t)
  if (m) return m[1].toLowerCase()
  if (OFF_RE.test(t)) return 'off'
  return null
}

function directiveOf(message) {
  const blocks = message && message.content
  if (!Array.isArray(blocks) || blocks.length === 0) return null
  for (const b of blocks) {
    if (!b || typeof b !== 'object' || b.type !== 'text') return null
  }
  return parseDirective(blocks.map((b) => b.text).join(''))
}

/**
 * Parse the YAML frontmatter block of a SKILL.md into metadata plus body.
 * Handles the scalar fields DSH skill discovery consumes (name, description,
 * whenToUse) plus the upstream invocation flag, and supports folded scalar
 * blocks (`description: >` followed by indented lines, as upstream
 * DietrichGebert/ponytail uses) — folded lines are joined with single spaces,
 * matching YAML semantics. Richer metadata passes through verbatim.
 * @param text - the raw skill file contents.
 * @returns parsed metadata object and the markdown body after the block, or
 *   null when the file has no frontmatter block at all.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const block = text.slice(3, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')
  const metadata = {}
  let currentKey = null
  let folded = false
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd()
    if (/^[ \t]/.test(line) && currentKey !== null) {
      // Indented continuation of a folded scalar.
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

/**
 * Read and parse one skill directory's SKILL.md.
 * @param skillFile - absolute path to the SKILL.md file.
 * @param signal - optional cancellation; aborts the read.
 * @returns the parsed skill record, or undefined when the file vanished.
 */
async function parseSkillFile(skillFile, signal) {
  let text
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
    content: parsed.body
  }
}

/**
 * Upstream `disable-model-invocation: true` marks a user-invoked skill
 * (reachable only by the human). Map it onto DSH's invocation flags;
 * anything else stays model- and user-invocable.
 * @param metadata - parsed frontmatter metadata.
 * @returns the DSH invocation record.
 */
function invocationFrom(metadata) {
  if (metadata['disable-model-invocation'] === 'true') {
    return { modelInvocable: false, userInvocable: true }
  }
  return { modelInvocable: true, userInvocable: true }
}

/**
 * Discover packaged skill candidates by scanning the package's `skills/`
 * directory: one subdirectory per skill, each carrying a SKILL.md.
 * @param skillsRoot - absolute path to this package's skills directory.
 * @param signal - optional cancellation.
 * @returns the candidate list.
 */
async function discoverCandidates(skillsRoot, signal) {
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
      provider: name,
      rank: PACKAGED_SKILL_RANK,
      locator: skillDir,
      path: skillFile,
      ...(Object.keys(parsed.metadata).length > 0 ? { metadata: parsed.metadata } : {})
    })
  }
  return candidates
}

/** Register the packaged ponytail provider on `ctx.skills`. */
function apply(ctx) {
  const skillsRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')
  ctx.skills.registerProvider((control) => ({
    name,
    async list(options) {
      return discoverCandidates(skillsRoot, options.signal)
    },
    async get(candidate, options) {
      const parsed = await parseSkillFile(candidate.path, options.signal)
      if (parsed === undefined) return undefined
      return {
        name: parsed.name,
        description: parsed.description,
        ...(parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {}),
        invocation: invocationFrom(parsed.metadata),
        source: SOURCE,
        provider: name,
        resourceBase: { kind: 'directory', path: candidate.locator },
        path: candidate.path,
        ...(Object.keys(parsed.metadata).length > 0 ? { metadata: parsed.metadata } : {}),
        content: parsed.content
      }
    }
  }))

  // Register our event type on the shared KNOWN set so session logs
  // containing `ponytail/change` load in any boot that mounts this plugin
  // (mirrors the caveman plugin's fix).
  try {
    KNOWN_SESSION_EVENT_TYPES.add('ponytail/change')
  } catch (err) {
    console.warn('[ponytail] could not register event type:', err && err.message)
  }

  const projections = ctx.get('sessionProjections')

  if (projections !== undefined) {
    projections.register({
      key: 'ponytail',
      schema,
      stateVersion: 1,
      init: () => ({ mode: 'off' }),
      apply: (state, event) => {
        if (!event || event.type !== 'ponytail/change') return state
        const mode = event.data && typeof event.data.mode === 'string' ? event.data.mode : ''
        if (!VALID.includes(mode) || state.mode === mode) return state
        return { mode }
      },
      view: (state) => ({ mode: state.mode }),
    })
  }

  const commands = ctx.get('commands')
  if (commands !== undefined) {
    commands.register({
      name: 'ponytail',
      description: 'Set ponytail (lazy senior dev) mode',
      input: { hint: 'lite|full|ultra|off' },
      handler: (invocation) => {
        const mode = invocation.rawInput.trim().toLowerCase()
        if (!VALID.includes(mode)) {
          return { kind: 'error', text: 'Invalid mode: "' + invocation.rawInput.trim() + '". Valid: ' + VALID.join('|') }
        }
        invocation.agent.session.append('ponytail/change', { mode })
        return { kind: 'success', text: mode === 'off' ? 'Ponytail mode: off' : 'Ponytail mode: ' + mode }
      },
    })
  }

  ctx.on('agent/pre-step', (payload, next) => {
    if (!payload || !payload.agent || !Array.isArray(payload.messages)) return next()
    let mode = null
    const kept = []
    for (const m of payload.messages) {
      const parsed = directiveOf(m)
      if (parsed !== null) mode = parsed
      else kept.push(m)
    }
    if (mode === null) return next()
    payload.agent.session.append('ponytail/change', { mode })
    if (kept.length === 0) return { kind: 'reject' }
    return { kind: 'enter', messages: kept }
  })

  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt !== undefined) {
    systemPrompt.section({
      name: 'ponytail-mode',
      order: 60,
      text: (context) => {
        const agent = context && context.agent
        if (!agent || projections === undefined) return ''
        let mode = 'off'
        try {
          const value = projections.snapshot(agent.session).values.ponytail
          if (value && typeof value.mode === 'string') mode = value.mode
        } catch (err) {
          mode = 'off'
        }
        if (mode === 'off') return ''
        const tag = mode === 'full' ? '[PONYTAIL]' : '[PONYTAIL:' + mode.toUpperCase() + ']'
        return tag + ' Current user-set coding style. Apply the ponytail skill rules at intensity "' + mode + '" to any coding work in this session.'
      },
    })
  }

  console.log('[ponytail] host active (event projection + KNOWN registration)')
}

export { apply, name, inject }
export default { apply, name, inject }
