// flatten-frontmatter.mjs — fold upstream `description: >` multi-line
// frontmatter into a single line in every skills/<name>/SKILL.md.
// The DSH discovery parser reads scalar values only.
//
// Usage: node scripts/flatten-frontmatter.mjs [skillsRoot]
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const skillsRoot = process.argv[2] ?? join(process.cwd(), 'skills')
let changed = 0

for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const file = join(skillsRoot, entry.name, 'SKILL.md')
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch {
    continue
  }
  const next = text.replace(/description: >\r?\n((?:[ \t]+.*\r?\n)+)/g, (_m, block) => {
    const folded = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
    return `description: ${folded}\n`
  })
  if (next !== text) {
    await writeFile(file, next, 'utf8')
    changed++
    console.log(`flattened ${entry.name}`)
  }
}
console.log(`done: ${changed} file(s) updated`)
