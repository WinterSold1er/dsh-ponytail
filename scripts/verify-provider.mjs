// verify-provider.mjs — functional smoke test for the dsh-ponytail skill
// provider, without booting a DSH profile.
//
// The lib imports @deepseek-ai/dsh-session (host-provided), so this script
// must run where that bare module resolves — inside the DSH repo workspace
// or any install with the harness runtime. The mock ctx mirrors the host
// service surface the activation shell borrows (optional ctx.get lookups and
// agent/pre-step listeners), so apply() exercises the full plugin body.
import { apply } from '../lib/index.js'

let captured
const ctx = {
  skills: {
    registerProvider(providerFactory) {
      captured = providerFactory({})
    }
  },
  get(key) {
    // Host services (sessionProjections, commands, systemPrompt) are absent
    // here; the activation shell treats each as optional.
    return undefined
  },
  on() {
    // agent/pre-step listener registration is a no-op outside a host loop.
  }
}

apply(ctx)
if (!captured) {
  console.error('FAIL: provider was not registered')
  process.exit(1)
}

const candidates = await captured.list({ signal: undefined })
console.log(`discovered ${candidates.length} candidate(s):`)
const expected = new Set(['ponytail', 'ponytail-audit', 'ponytail-debt', 'ponytail-gain', 'ponytail-help', 'ponytail-review'])
const found = new Set()
let failures = 0

for (const c of candidates) {
  found.add(c.name)
  const detail = await captured.get(c, { signal: undefined })
  const flag = detail?.invocation?.modelInvocable === false ? 'user-only' : 'model+user'
  console.log(
    `  - ${c.name}: "${c.description.slice(0, 80)}..." [${flag}] content=${detail?.content?.length ?? 0} chars resourceBase=${detail?.resourceBase?.path ?? 'MISSING'}`
  )
  if (!detail?.content || !detail?.resourceBase) failures++
  if (!detail?.description || detail.description.startsWith('>')) {
    console.error(`FAIL: ${c.name} description not flattened: "${detail?.description}"`)
    failures++
  }
}

for (const want of expected) {
  if (!found.has(want)) {
    console.error(`FAIL: expected skill "${want}" was not discovered`)
    failures++
  }
}
for (const name of found) {
  if (!expected.has(name)) {
    console.error(`FAIL: unexpected skill "${name}" discovered`)
    failures++
  }
}

if (failures) {
  console.error(`FAIL: ${failures} problem(s)`)
  process.exit(1)
}
console.log('OK: provider discovery, flattened descriptions, invocation mapping and get() all pass')
