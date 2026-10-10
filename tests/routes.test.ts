import test from 'node:test'
import assert from 'node:assert/strict'
import { mountPonytailRoutes, type PonytailConfig } from '../src/routes.ts'
import { Readable } from 'node:stream'

class MockIncomingMessage extends Readable {
  method?: string
  headers: Record<string, string>
  constructor(method = 'GET', headers: Record<string, string> = {}) {
    super()
    this.method = method
    this.headers = headers
  }
  _read() {}
}

class MockServerResponse {
  statusCode = 0
  headers: Record<string, string> = {}
  body = ''

  writeHead(statusCode: number, headers: Record<string, string>) {
    this.statusCode = statusCode
    this.headers = headers
    return this
  }

  end(chunk?: string) {
    if (chunk) this.body += chunk
  }
}

test('Routes: /ponytail/status and /ponytail/state', async () => {
  let state: PonytailConfig = {
    enabled: false,
    level: 'full',
  }

  const routes: Record<string, (req: any, res: any) => void> = {}

  const mockWebServer = {
    register: (def: { path: string; handler: any }) => {
      routes[def.path] = def.handler
      return () => {
        delete routes[def.path]
      }
    },
  }

  const mockCtx = {
    get: (key: string) => (key === 'webServer' ? mockWebServer : undefined),
  }

  const dispose = mountPonytailRoutes(
    mockCtx as any,
    () => state,
    (next) => {
      state = next
    },
  )

  // 1. GET /ponytail/status
  const statusRes = new MockServerResponse()
  routes['/ponytail/status']!(new MockIncomingMessage('GET'), statusRes)
  assert.equal(statusRes.statusCode, 200)
  const statusBody = JSON.parse(statusRes.body)
  assert.equal(statusBody.enabled, false)
  assert.equal(statusBody.level, 'full')

  // 2. POST /ponytail/state with non-POST method
  const getReq = new MockIncomingMessage('GET', {
    origin: 'http://localhost:3080',
    host: 'localhost:3080',
  })
  const getRes = new MockServerResponse()
  await routes['/ponytail/state']!(getReq, getRes)
  assert.equal(getRes.statusCode, 405)

  // 3. POST /ponytail/state with untrusted origin
  const untrustedReq = new MockIncomingMessage('POST', {
    origin: 'http://malicious.com',
    host: 'localhost:3080',
  })
  const untrustedRes = new MockServerResponse()
  await routes['/ponytail/state']!(untrustedReq, untrustedRes)
  assert.equal(untrustedRes.statusCode, 403)

  // 4. POST /ponytail/state valid update
  const validReq = new MockIncomingMessage('POST', {
    origin: 'http://localhost:3080',
    host: 'localhost:3080',
  })
  const validRes = new MockServerResponse()

  const payload = JSON.stringify({
    enabled: true,
    level: 'ultra',
  })
  validReq.push(Buffer.from(payload))
  validReq.push(null)

  await routes['/ponytail/state']!(validReq, validRes)

  assert.equal(validRes.statusCode, 200)
  const updated = JSON.parse(validRes.body)
  assert.equal(updated.enabled, true)
  assert.equal(updated.level, 'ultra')

  assert.equal(state.enabled, true)
  assert.equal(state.level, 'ultra')

  // 5. Cleanup / dispose
  dispose()
  assert.equal(routes['/ponytail/status'], undefined)
  assert.equal(routes['/ponytail/state'], undefined)
})
