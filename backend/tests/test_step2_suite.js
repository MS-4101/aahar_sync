/**
 * Mandatory 4-Step Verification Suite for Step 2 (Cloud Backend API)
 *
 * Stage 1: Unit Testing (SSE & Sync Services)
 * Stage 2: Integration Testing (HTTP Endpoints & Real-Time Streams)
 * Stage 3: TDD Assertions (Schema Contracts)
 * Stage 4: "The Breaker" (Adversarial Security & Chaos Assault)
 */
const http = require('http');
const app = require('../src/server');
const syncService = require('../src/services/syncService');
const sseService = require('../src/services/sseService');

class Step2VerificationSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.server = null;
    this.port = 4099; // Dedicated test port
    this.baseUrl = `http://127.0.0.1:${this.port}`;
    this.validApiKey = 'aaharin_firm_master_token_2026';
  }

  assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      this.passed++;
    } else {
      console.log(`  [FAIL] ${testName}`);
      this.failed++;
    }
  }

  request(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const reqHeaders = { ...headers };
      let payloadStr = '';
      if (body) {
        payloadStr = typeof body === 'string' ? body : JSON.stringify(body);
        reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(payloadStr);
      }

      const req = http.request(
        url,
        {
          method,
          headers: reqHeaders,
          timeout: 4000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let json = null;
            try {
              json = JSON.parse(data);
            } catch (_) {}
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: data, json });
          });
        }
      );

      req.on('error', reject);
      if (payloadStr) req.write(payloadStr);
      req.end();
    });
  }

  async runAll() {
    console.log('=================================================================');
    console.log('   MANDATORY 4-STEP VERIFICATION SUITE - STEP 2 (CLOUD BACKEND)  ');
    console.log('=================================================================\n');

    // Start HTTP server on test port
    await new Promise((resolve) => {
      this.server = app.listen(this.port, resolve);
    });

    try {
      await this.stage1UnitTesting();
      await this.stage2IntegrationTesting();
      await this.stage3TddAssertions();
      await this.stage4TheBreakerChaosTesting();
    } finally {
      await new Promise((resolve) => this.server.close(resolve));
    }

    console.log('\n-----------------------------------------------------------------');
    console.log(`TEST SUMMARY: ${this.passed} Passed, ${this.failed} Failed`);
    if (this.failed === 0) {
      console.log('RESULT: [CERTIFIED] Step 2 passed all 4 stages flawlessly!');
    } else {
      console.log('RESULT: [REJECTED] Step 2 failed one or more security/test stages.');
    }
    console.log('=================================================================');

    return this.failed === 0;
  }

  // STAGE 1: UNIT TESTING
  async stage1UnitTesting() {
    console.log('--- STAGE 1: UNIT TESTING ---');

    // Test SSE Service
    const mockRes = {
      setHeader: () => {},
      write: () => {},
      on: () => {},
    };
    sseService.addClient(99, mockRes);
    this.assert(sseService.getClientCount(99) === 1, 'SSE Service adds client and updates count to 1');

    sseService.removeClient(99, mockRes);
    this.assert(sseService.getClientCount(99) === 0, 'SSE Service cleans up client upon disconnect');

    // Test Sync Service
    const samplePayload = { floor_summary: { total_tables: 10, running_tables: 2 } };
    const ingestRes = syncService.ingest(99, samplePayload);
    this.assert(ingestRes.success === true, 'SyncService ingests valid payload cleanly');
    const cached = syncService.getLatestState(99);
    this.assert(cached && cached.payload.floor_summary.total_tables === 10, 'SyncService retrieves latest cached state accurately');
  }

  // STAGE 2: INTEGRATION TESTING
  async stage2IntegrationTesting() {
    console.log('\n--- STAGE 2: INTEGRATION TESTING (HTTP & REAL-TIME STREAM) ---');

    // 1. Health check
    const health = await this.request('GET', '/health');
    this.assert(health.statusCode === 200 && health.json?.status === 'HEALTHY', 'GET /health returns 200 HEALTHY');

    // 2. POS Sync Push
    const pushPayload = {
      sync_version: '1.0',
      timestamp: new Date().toISOString(),
      restaurant_id: 4,
      floor_summary: { total_tables: 22, running_tables: 3, vacant_tables: 19 },
      tables_map: [{ table_id: 19, table_name: '1', status: 'Occupied', sequence: 1 }],
      running_orders: [],
      audit_alerts: [],
      today_summary: { date: '2026-10-29', total_bills: 5, total_revenue: 1250 },
    };

    const pushRes = await this.request(
      'POST',
      '/api/v1/sync/push',
      {
        'X-API-KEY': this.validApiKey,
        'X-Restaurant-ID': '4',
      },
      pushPayload
    );

    this.assert(pushRes.statusCode === 200, `POST /api/v1/sync/push accepted with HTTP 200 (Got ${pushRes.statusCode})`);
    this.assert(pushRes.json?.status === 'SUCCESS', 'Response contains status: SUCCESS');

    // 3. Retrieve Live State
    const liveRes = await this.request('GET', '/api/v1/sync/live/4');
    this.assert(liveRes.statusCode === 200 && liveRes.json?.status === 'ONLINE', 'GET /api/v1/sync/live/4 returns status: ONLINE');
    this.assert(liveRes.json?.data?.floor_summary?.total_tables === 22, 'Live state matches exact pushed payload');
  }

  // STAGE 3: TDD ASSERTIONS
  async stage3TddAssertions() {
    console.log('\n--- STAGE 3: TDD (SCHEMA & CONTRACT ASSERTIONS) ---');
    const state = syncService.getLatestState(4);

    this.assert(Boolean(state.lastReceivedAt), 'State contract includes valid lastReceivedAt timestamp');
    this.assert(Boolean(state.payload.server_timestamp), 'State contract injects server_timestamp');
    this.assert(Array.isArray(state.payload.tables_map), 'State contract tables_map is strictly an Array');
  }

  // STAGE 4: THE BREAKER (SECURITY & CHAOS ADVERSARY)
  async stage4TheBreakerChaosTesting() {
    console.log('\n--- STAGE 4: THE BREAKER (SECURITY & CHAOS ADVERSARY) ---');

    // Attack 1: Forged / Missing API Key
    console.log('  [Chaos Attack 1] Attempting sync push without API key and with forged token...');
    const noKeyRes = await this.request('POST', '/api/v1/sync/push', {}, { floor_summary: {} });
    this.assert(noKeyRes.statusCode === 401, 'Unauthorized request without API key blocked with 401');

    const forgedRes = await this.request(
      'POST',
      '/api/v1/sync/push',
      { 'X-API-KEY': 'hacker_fake_key_999', 'X-Restaurant-ID': '4' },
      { floor_summary: {} }
    );
    this.assert(forgedRes.statusCode === 401, 'Forged API key blocked with 401');

    // Attack 2: Multi-Tenant Cross-Firm Isolation Assault
    console.log('  [Chaos Attack 2] Verifying strict data isolation between Restaurant 1 and Restaurant 4...');
    // Push data for Restaurant 4
    syncService.ingest(4, { floor_summary: { secret: 'SHARMA_JI_SECRET_REVENUE' } });

    // Ensure Restaurant 1's state does NOT leak Restaurant 4's data
    const r1State = syncService.getLatestState(1);
    const leaked = r1State?.payload?.floor_summary?.secret === 'SHARMA_JI_SECRET_REVENUE';
    this.assert(!leaked, 'Multi-tenant isolation verified: Restaurant 1 cannot access Restaurant 4 data');

    // Attack 3: Corrupted / Malformed Payload Assault
    console.log('  [Chaos Attack 3] Sending malformed and non-JSON payloads...');
    const corruptRes = await this.request(
      'POST',
      '/api/v1/sync/push',
      {
        'X-API-KEY': this.validApiKey,
        'X-Restaurant-ID': '4',
        'Content-Type': 'application/json',
      },
      '{ "broken_json": true, ' // Invalid JSON syntax
    );
    this.assert(corruptRes.statusCode === 400 || corruptRes.statusCode === 500, 'Malformed JSON rejected safely without server crash');

    // Attack 4: Rapid Concurrency Assault (50 Simultaneous Sync Pushes)
    console.log('  [Chaos Attack 4] Flooding backend with 50 simultaneous concurrent push requests...');
    const concurrentRequests = [];
    for (let i = 0; i < 50; i++) {
      concurrentRequests.push(
        this.request(
          'POST',
          '/api/v1/sync/push',
          {
            'X-API-KEY': this.validApiKey,
            'X-Restaurant-ID': '4',
          },
          {
            floor_summary: { total_tables: 22, seq: i },
          }
        )
      );
    }

    const results = await Promise.all(concurrentRequests);
    const allSucceeded = results.every((r) => r.statusCode === 200);
    this.assert(allSucceeded, 'Rapid Concurrency: 50 simultaneous push requests processed flawlessly (100% 200 OK)');
  }
}

// Execute Suite
const suite = new Step2VerificationSuite();
suite.runAll().then((success) => {
  process.exit(success ? 0 : 1);
});

