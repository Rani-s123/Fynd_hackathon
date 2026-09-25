import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../src/db.js';
import { createApp } from '../src/app.js';

describe('POST /api/defects (HTTP layer)', () => {
  let app;

  beforeEach(() => {
    const db = createDb(':memory:', { seedHistory: false });
    app = createApp(db);
  });

  it('rejects a request missing required fields with a useful message', async () => {
    const res = await request(app).post('/api/defects').send({ stationId: 'ST-01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toMatch(/productId/);
  });

  it('rejects an unknown station', async () => {
    const res = await request(app).post('/api/defects').send({
      stationId: 'ST-DOES-NOT-EXIST',
      productId: 'PUMP-X2',
      serialNumber: 'SN-1',
      defectCode: 'TORQUE_LOW',
      description: 'test',
      occurredAt: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ST-DOES-NOT-EXIST/);
  });

  it('escalates on the third matching defect and exposes it via GET /api/alerts', async () => {
    const base = { stationId: 'ST-07', productId: 'PUMP-X2', defectCode: 'TORQUE_LOW', description: 'torque low' };
    const t0 = Date.now();
    let last;
    for (let i = 0; i < 3; i++) {
      last = await request(app)
        .post('/api/defects')
        .send({ ...base, serialNumber: `SN-${i}`, occurredAt: new Date(t0 + i * 60_000).toISOString() });
    }
    expect(last.body.classification).toBe('SYSTEMIC');
    expect(last.body.alertId).toBeTruthy();

    const alerts = await request(app).get('/api/alerts?state=OPEN');
    expect(alerts.status).toBe(200);
    expect(alerts.body.length).toBe(1);
    expect(alerts.body[0].id).toBe(last.body.alertId);

    const evidence = await request(app).get(`/api/alerts/${last.body.alertId}/evidence`);
    expect(evidence.body.length).toBe(3);
  });

  it('does not duplicate an escalation when the same serial is resubmitted immediately', async () => {
    const payload = {
      stationId: 'ST-08',
      productId: 'PUMP-X2',
      defectCode: 'SCRATCH',
      description: 'scratch',
      serialNumber: 'SN-DUP',
      occurredAt: new Date().toISOString(),
    };
    const first = await request(app).post('/api/defects').send(payload);
    expect(first.body.duplicate).toBeFalsy();
    const second = await request(app).post('/api/defects').send(payload);
    expect(second.body.duplicate).toBe(true);
  });

  it('supports the full alert lifecycle via the acknowledge/transition endpoints', async () => {
    const base = { stationId: 'ST-06', productId: 'PUMP-X2', defectCode: 'TORQUE_LOW', description: 'torque low' };
    const t0 = Date.now();
    let last;
    for (let i = 0; i < 3; i++) {
      last = await request(app)
        .post('/api/defects')
        .send({ ...base, serialNumber: `SN-${i}`, occurredAt: new Date(t0 + i * 60_000).toISOString() });
    }
    const alertId = last.body.alertId;

    const ack = await request(app).post(`/api/alerts/${alertId}/acknowledge`).send({ actor: 'Field Engineer', note: 'looking into it' });
    expect(ack.body.state).toBe('ACKNOWLEDGED');

    const inv = await request(app).post(`/api/alerts/${alertId}/transition`).send({ target: 'INVESTIGATING', actor: 'Field Engineer', note: 'checking torque tool' });
    expect(inv.body.state).toBe('INVESTIGATING');

    const cont = await request(app).post(`/api/alerts/${alertId}/transition`).send({ target: 'CONTAINED', actor: 'Field Engineer', note: 'recalibrated' });
    expect(cont.body.state).toBe('CONTAINED');

    const resolved = await request(app).post(`/api/alerts/${alertId}/transition`).send({ target: 'RESOLVED', actor: 'Field Engineer', note: 'verified fix' });
    expect(resolved.body.state).toBe('RESOLVED');

    const history = await request(app).get(`/api/alerts/${alertId}/history`);
    // 1 initial "-> OPEN" entry from classifyDefect + acknowledge + 3 transitions above = 5
    expect(history.body.length).toBe(5);

    // Skipping a state (e.g. straight to RESOLVED from OPEN) must be rejected.
    const t0b = Date.now();
    let last2;
    for (let i = 0; i < 3; i++) {
      last2 = await request(app)
        .post('/api/defects')
        .send({ ...base, stationId: 'ST-10', serialNumber: `SNB-${i}`, occurredAt: new Date(t0b + i * 60_000).toISOString() });
    }
    const invalidJump = await request(app).post(`/api/alerts/${last2.body.alertId}/transition`).send({ target: 'RESOLVED', actor: 'Field Engineer', note: 'skip' });
    expect(invalidJump.body.state).toBe('OPEN'); // unchanged, invalid jump rejected
  });
});

describe('Settings and known-fixes (HTTP layer)', () => {
  let app;

  beforeEach(() => {
    const db = createDb(':memory:', { seedHistory: false });
    app = createApp(db);
  });

  it('rejects invalid threshold/window values', async () => {
    const res = await request(app).post('/api/settings').send({ thresholdN: 0, windowT: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('persists valid settings and applies them to future classifications', async () => {
    const save = await request(app).post('/api/settings').send({ thresholdN: 2, windowT: 15 });
    expect(save.status).toBe(200);

    const settings = await request(app).get('/api/settings');
    expect(settings.body.thresholdN).toBe(2);

    // With threshold now 2, a second matching defect should already escalate.
    const base = { stationId: 'ST-02', productId: 'PUMP-X2', defectCode: 'WRONG_PART', description: 'wrong part' };
    const t0 = Date.now();
    await request(app).post('/api/defects').send({ ...base, serialNumber: 'SN-1', occurredAt: new Date(t0).toISOString() });
    const second = await request(app).post('/api/defects').send({ ...base, serialNumber: 'SN-2', occurredAt: new Date(t0 + 60_000).toISOString() });
    expect(second.body.classification).toBe('SYSTEMIC');
  });

  it('increments a known fix helpful count', async () => {
    const before = await request(app).get('/api/known-fixes/TORQUE_LOW');
    const res = await request(app).post('/api/known-fixes/TORQUE_LOW/helpful');
    expect(res.body.helpfulCount).toBe(before.body.helpfulCount + 1);
  });

  it('returns a clean 404 for an unknown route', async () => {
    const res = await request(app).get('/api/not-a-real-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});
