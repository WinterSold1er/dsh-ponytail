import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

async function runE2ETest() {
  console.log('--- Starting Ponytail E2E Test with Gemini 3.8 Flash ---');

  // 1. Ensure Ponytail is enabled on host
  const statusRes = await fetch('http://127.0.0.1:3080/ponytail/status');
  const status = await statusRes.json();
  console.log('Current Ponytail Status:', status);
  if (!status.enabled) {
    console.log('Enabling Ponytail...');
    await fetch('http://127.0.0.1:3080/ponytail/state', {
      method: 'POST',
      headers: {
        'Origin': 'http://127.0.0.1:3080',
        'Host': '127.0.0.1:3080',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enabled: true, level: 'full' })
    });
  }

  // 2. Authenticate with DSH
  const token = readFileSync('/home/csy/.dsh/logs/current-token.txt', 'utf8').trim();
  const authRes = await fetch('http://127.0.0.1:3080/?token=' + token, { redirect: 'manual' });
  const cookie = authRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Failed to get auth cookie');

  // Helper for RPC
  async function rpc(endpoint, args) {
    const res = await fetch(`http://127.0.0.1:3080/api/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cookie': cookie },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `e2e-${randomUUID()}`,
        method: endpoint,
        payload: { args }
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data;
  }

  // 3. Create a test session
  const createResp = await rpc('session/create', { request: { cwd: '/home/csy/Code/Github/dsh-ponytail' } });
  if (!createResp.result || !createResp.result.ok) {
    throw new Error('Create session failed: ' + JSON.stringify(createResp));
  }
  const sessionId = createResp.result.value.sessionId;
  console.log('Created test session:', sessionId);

  // 4. Select Gemini 3.8 Flash
  const selectResp = await rpc('session/selectModel', {
    request: {
      sessionId,
      provider: 'antigravity',
      model: 'gemini-3.8-flash'
    }
  });
  console.log('Selected model:', JSON.stringify(selectResp.result?.value));

  // 5. Send coding prompt
  console.log('Sending coding prompt to Gemini 3.8 Flash: "请写一个快速排序算法"...');
  await rpc('session/prompt', {
    request: {
      requestId: randomUUID(),
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: '请写一个快速排序算法' }]
    }
  });

  // Helper to fetch events via session/page by finding cursor
  async function fetchEvents() {
    // Try seq 9999 to get cursor from error
    const testPage = await rpc('session/page', {
      request: { address: { kind: 'session', sessionId }, throughSeq: 9999, maxMessages: 100 }
    });
    let cursor = 0;
    if (testPage.result && testPage.result.ok) {
      return testPage.result.value.records.map(r => r.event);
    }
    const msg = testPage.result?.error?.message || '';
    const match = /past cursor (\d+)/.exec(msg);
    if (match) {
      cursor = parseInt(match[1], 10);
    }
    if (cursor > 0) {
      const page = await rpc('session/page', {
        request: { address: { kind: 'session', sessionId }, throughSeq: cursor, maxMessages: 100 }
      });
      if (page.result && page.result.ok) {
        return page.result.value.records.map(r => r.event);
      }
    }
    return [];
  }

  // 6. Poll for tool call
  const startTime = Date.now();
  let ponytailCall = null;
  const timeoutMs = 120000;
  const loggedCalls = new Set();

  while (Date.now() - startTime < timeoutMs) {
    const events = await fetchEvents();
    const calls = events.filter(e => e && e.type === 'tool/call');
    for (const c of calls) {
      const key = `${c.seq}-${c.data?.name}-${c.data?.arguments}`;
      if (!loggedCalls.has(key)) {
        console.log('>>> [Observed tool/call]:', c.data?.name, c.data?.arguments);
        loggedCalls.add(key);
      }
      if (c.data?.name === 'skill' && c.data?.arguments && c.data?.arguments.includes('ponytail')) {
        ponytailCall = c.data;
        break;
      }
    }
    if (ponytailCall) break;

    const turnEnd = events.some(e => e && e.type === 'turn/end');
    if (turnEnd && calls.length > 0) {
      console.log('Turn completed.');
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  if (ponytailCall) {
    console.log('====================================================');
    console.log('E2E TEST PASSED!');
    console.log('Gemini 3.8 Flash successfully called ponytail skill:');
    console.log(JSON.stringify(ponytailCall, null, 2));
    console.log('Prompt injection successfully caused model to obey ponytail!');
    console.log('====================================================');
    process.exit(0);
  } else {
    console.error('====================================================');
    console.error('E2E TEST FAILED: Model did not call ponytail within deadline');
    console.error('====================================================');
    process.exit(1);
  }
}

runE2ETest().catch((err) => {
  console.error('E2E Test Error:', err);
  process.exit(1);
});
