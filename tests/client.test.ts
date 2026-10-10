import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

test('client.js: ModuleLoader contract, slot registrations, and nav icon hook', async () => {
  const clientPath = join(import.meta.dirname, '../client/client.js')
  const clientCode = readFileSync(clientPath, 'utf8')

  // Verify syntax by loading
  assert.doesNotThrow(() => {
    new Function(clientCode)
  }, 'client.js must be syntactically valid JavaScript')

  const registeredEntries: any[] = []
  const injectedSlots: string[] = []
  const registeredSlots: Array<{ desc: any; comp: any }> = []
  let injectedStyleTag: any = null

  const mockButtons = [
    {
      textContent: 'General',
      attrs: {} as Record<string, string>,
      setAttribute(k: string, v: string) { this.attrs[k] = v },
      removeAttribute(k: string) { delete this.attrs[k] },
      hasAttribute(k: string) { return k in this.attrs },
    },
    {
      textContent: 'ponytail',
      attrs: {} as Record<string, string>,
      setAttribute(k: string, v: string) { this.attrs[k] = v },
      removeAttribute(k: string) { delete this.attrs[k] },
      hasAttribute(k: string) { return k in this.attrs },
    },
  ]

  const globalScope = global as any
  globalScope.window = {
    __ModuleLoader__: {
      load(entry: any) {
        registeredEntries.push(entry)
      },
    },
  }

  globalScope.document = {
    createElement(tag: string) {
      const el = { tagName: tag, dataset: {}, textContent: '', remove() {} }
      if (tag === 'style') injectedStyleTag = el
      return el
    },
    head: { appendChild() {} },
    body: {},
    querySelectorAll(sel: string) {
      if (sel.includes('button')) return mockButtons
      return []
    },
  }

  globalScope.MutationObserver = class {
    observe() {}
    disconnect() {}
  }

  // Execute client.js
  eval(clientCode)

  assert.equal(registeredEntries.length, 2, 'window.__ModuleLoader__.load should be called twice')
  const ids = registeredEntries.map((e) => e.id)
  assert.ok(ids.includes('dsh-ponytail-skills'), 'Should register under dsh-ponytail-skills')
  assert.ok(ids.includes('dsh-ponytail'), 'Should register under dsh-ponytail')

  const mockRequire = (pkg: string) => {
    if (pkg === 'react') {
      return {
        createElement(type: any, props: any, ...children: any[]) {
          return { type, props, children }
        },
        useState(init: any) {
          return [
            {
              enabled: true,
              level: 'full',
            },
            () => {},
          ]
        },
        useEffect() {},
        useRef(init: any) { return { current: init } },
      }
    }
    throw new Error('unexpected require: ' + pkg)
  }

  const mod = registeredEntries[0].factory(mockRequire)
  assert.equal(mod.name, 'dsh-ponytail')
  assert.deepEqual(mod.inject, ['slots'])

  const mockCtx = {
    slots: {
      inject(name: string, fn: () => any) {
        injectedSlots.push(name)
        fn()
      },
      register(desc: any, comp: any) {
        registeredSlots.push({ desc, comp })
        return () => {}
      },
    },
    effect(fn: () => any) {
      fn()
    },
  }

  mod.apply(mockCtx)

  // 1. Verify settings.section registration: id 'ponytail', order 46, label() returns 'ponytail'
  assert.ok(injectedSlots.includes('settings.section'), 'settings.section must be injected')
  const section = registeredSlots.find((s) => s.desc.id === 'ponytail')
  assert.ok(section, 'Section with id "ponytail" must be registered')
  assert.equal(section.desc.order, 46, 'Order must be 46')
  assert.equal(section.desc.label(), 'ponytail', 'Label must be "ponytail"')
  assert.equal(typeof section.desc.icon, 'function', 'icon must be declared as a component in slots.register')

  // 2. Verify PonytailNavIcon renders SVG
  const iconResult = section.desc.icon()
  assert.equal(iconResult.type, 'svg')
  assert.equal(iconResult.props.viewBox, '0 0 16 16')
  assert.ok(iconResult.children.length >= 3, 'Ponytail icon should have at least 3 elements (head, tie, ponytail)')

  // 3. Verify CSS mask injection and MutationObserver button attribute
  assert.ok(injectedStyleTag, 'style tag should be injected')
  assert.ok(injectedStyleTag.textContent.includes('[data-dsh-ponytail-nav-icon] > svg { display: none !important; }'))
  assert.ok(injectedStyleTag.textContent.includes('mask-image: url("data:image/svg+xml,'))
  assert.equal(mockButtons[1].attrs['data-dsh-ponytail-nav-icon'], '', 'ponytail button should be marked')
  assert.equal(mockButtons[0].attrs['data-dsh-ponytail-nav-icon'], undefined, 'other buttons should not be marked')

  // 4. Verify PonytailSection renders section with hero, levels, ladder rules, and help
  const sectionResult = section.comp()
  assert.equal(sectionResult.type, 'section')
  assert.equal(sectionResult.children.length, 4, 'PonytailSection should render 4 cards/blocks')
})
