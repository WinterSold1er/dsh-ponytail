/**
 * dsh-ponytail HTTP routes: the browser half's data plane.
 *
 * Provides /ponytail/status (GET) and /ponytail/state (POST) on the host webServer.
 * Reads/writes go straight to the shared state object — commands, prompt
 * injection, and the UI all observe one source of truth.
 *
 * All writes check same-origin (Origin header must match Host) so a cross-site
 * page cannot flip the toggle through the user's browser (CSRF).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { LEVELS, type PonytailLevel } from './constants.ts'

export interface PonytailConfig {
  enabled: boolean
  level: PonytailLevel
}

/** True when the request originates from the served web app (Origin === Host). */
export function sameOrigin(request: { headers: { origin?: string; host?: string } }): boolean {
  const origin = request.headers.origin
  const host = request.headers.host
  if (origin === undefined || host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(body))
}

/** Read a JSON request body up to maxBytes; rejects oversize with undefined. */
export async function readJsonBody(request: IncomingMessage, maxBytes = 4096): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += (chunk as Buffer).length
    if (size > maxBytes) return undefined
    chunks.push(chunk as Buffer)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return undefined
  }
}

/**
 * Mount /ponytail/status (GET) and /ponytail/state (POST).
 *
 * @param ctx - plugin context used to acquire webServer.
 * @param getState - read the live config.
 * @param setState - write the live config (persists + updates prompt).
 * @returns disposer removing both routes.
 */
export function mountPonytailRoutes(
  ctx: Context,
  getState: () => PonytailConfig,
  setState: (next: PonytailConfig) => void,
): () => void {
  const webServer = (ctx as any).get('webServer')
  if (webServer === undefined) {
    console.error('[dsh-ponytail] webServer service absent — UI routes not mounted')
    return () => {}
  }

  const disposers = [
    webServer.register({
      kind: 'exact',
      path: '/ponytail/status',
      handler: (_request: IncomingMessage, response: ServerResponse) => {
        const current = getState()
        sendJson(response, 200, current)
      },
    }),
    webServer.register({
      kind: 'exact',
      path: '/ponytail/state',
      handler: async (request: IncomingMessage, response: ServerResponse) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'method not allowed; use POST' })
          return
        }
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'untrusted origin' })
          return
        }
        const body = (await readJsonBody(request)) as Record<string, unknown> | undefined
        if (body === undefined || typeof body !== 'object') {
          sendJson(response, 400, { error: 'invalid JSON body' })
          return
        }
        const current = getState()
        const next: PonytailConfig = {
          enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
          level: typeof body.level === 'string' && Object.hasOwn(LEVELS, body.level)
            ? (body.level as PonytailLevel)
            : current.level,
        }
        setState(next)
        sendJson(response, 200, next)
      },
    }),
  ]

  return () => {
    for (const dispose of disposers) dispose()
  }
}
