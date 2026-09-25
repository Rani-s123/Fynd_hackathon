import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, nextId } from '../src/db.js';
import { classifyDefect, addHistory } from '../src/rules.js';

function insertDefect(db, { stationId, defectCode, occurredAt, serialNumber = 'SN-TEST', productId = 'PUMP-X2' }) {
  const id = nextId(db, 'DEF');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO defects (id, station_id, product_id, serial_number, defect_code, description, photo_data_url, occurred_at, logged_at, logged_by)
     VALUES (?, ?, ?, ?, ?, 'test defect', NULL, ?, ?, 'Operator')`,
  ).run(id, stationId, productId, serialNumber, defectCode, occurredAt, now);
  return id;
}

/** Simulates what the POST /api/defects route does: insert, then classify. */
function logAndClassify(db, args) {
  insertDefect(db, args);
  return classifyDefect(db, args);
}

describe('classifyDefect - pattern detection rule engine (brief section 7 & 10)', () => {
  let db;

  beforeEach(() => {
    // seedHistory: false gives a clean slate (reference data like stations/known-fixes
    // still present, but no pre-existing demo defects/alerts to skew counts).
    db = createDb(':memory:', { seedHistory: false });
  });

  it('1. one defect does not create an alert', () => {
    const occurredAt = new Date().toISOString();
    const result = logAndClassify(db, { stationId: 'ST-07', defectCode: 'WRONG_PART', occurredAt, serialNumber: 'SN-1' });
    expect(result.classification).not.toBe('SYSTEMIC');
    expect(db.prepare('SELECT COUNT(*) as c FROM alerts').get().c).toBe(0);
  });

  it('2. two matching defects within the window do not cross a threshold of three', () => {
    const t0 = Date.now();
    logAndClassify(db, { stationId: 'ST-07', defectCode: 'WRONG_PART', occurredAt: new Date(t0).toISOString(), serialNumber: 'SN-1' });
    const result = logAndClassify(db, { stationId: 'ST-07', defectCode: 'WRONG_PART', occurredAt: new Date(t0 + 5 * 60_000).toISOString(), serialNumber: 'SN-2' });
    expect(result.classification).not.toBe('SYSTEMIC');
    expect(result.occurrenceCount).toBe(2);
    expect(db.prepare('SELECT COUNT(*) as c FROM alerts').get().c).toBe(0);
  });

  it('3. three matching defects at the same station within the window create exactly one alert, one ticket, and one NCR', () => {
    const t0 = Date.now();
    let result;
    [0, 5, 10].forEach((m, i) => {
      result = logAndClassify(db, {
        stationId: 'ST-07',
        defectCode: 'TORQUE_LOW',
        occurredAt: new Date(t0 + m * 60_000).toISOString(),
        serialNumber: `SN-${i}`,
      });
    });
    expect(result.classification).toBe('SYSTEMIC');
    expect(result.occurrenceCount).toBe(3);
    expect(db.prepare('SELECT COUNT(*) as c FROM alerts').get().c).toBe(1);
    expect(db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE alert_id = ?`).get(result.alertId).c).toBe(1);
    expect(db.prepare(`SELECT COUNT(*) as c FROM ncrs WHERE alert_id = ?`).get(result.alertId).c).toBe(1);
  });

  it('4. three matching defects at different stations do not create a station-level alert', () => {
    const t0 = Date.now();
    let result;
    ['ST-01', 'ST-02', 'ST-03'].forEach((stationId, i) => {
      result = logAndClassify(db, {
        stationId,
        defectCode: 'TORQUE_LOW',
        occurredAt: new Date(t0 + i * 60_000).toISOString(),
        serialNumber: `SN-${i}`,
      });
    });
    expect(result.classification).not.toBe('SYSTEMIC');
    expect(db.prepare('SELECT COUNT(*) as c FROM alerts').get().c).toBe(0);
  });

  it('5. three matching defects outside the time window do not create a systemic alert', () => {
    const t0 = Date.now();
    let result;
    // 40 minutes apart each, window is 30 minutes -> none of these fall inside a shared window
    [0, 40, 80].forEach((m, i) => {
      result = logAndClassify(db, {
        stationId: 'ST-07',
        defectCode: 'TORQUE_LOW',
        occurredAt: new Date(t0 + m * 60_000).toISOString(),
        serialNumber: `SN-${i}`,
      });
    });
    expect(result.classification).not.toBe('SYSTEMIC');
    expect(db.prepare('SELECT COUNT(*) as c FROM alerts').get().c).toBe(0);
  });

  it('6. a known defect displays its documented fix', () => {
    const occurredAt = new Date().toISOString();
    const result = logAndClassify(db, { stationId: 'ST-02', defectCode: 'SEAL_LEAK', occurredAt, serialNumber: 'SN-1' });
    expect(result.classification).toBe('KNOWN');
    expect(result.knownFix?.documentedFix).toMatch(/O-ring/i);
    expect(result.knownFix?.owner).toBe('Process Engineering');
  });

  it('7. an unknown defect creates an investigation ticket when required', () => {
    const occurredAt = new Date().toISOString();
    const result = logAndClassify(db, { stationId: 'ST-02', defectCode: 'NEW_UNSEEN_CODE', occurredAt, serialNumber: 'SN-1' });
    expect(result.classification).toBe('UNKNOWN');
    expect(result.ticketId).toBeTruthy();
    expect(db.prepare('SELECT COUNT(*) as c FROM tickets WHERE id = ?').get(result.ticketId).c).toBe(1);
  });

  it('8. replaying/reprocessing the same active pattern does not duplicate escalation records', () => {
    const t0 = Date.now();
    [0, 5, 10].forEach((m, i) => {
      logAndClassify(db, {
        stationId: 'ST-09',
        defectCode: 'TORQUE_LOW',
        occurredAt: new Date(t0 + m * 60_000).toISOString(),
        serialNumber: `SN-${i}`,
      });
    });
    expect(db.prepare('SELECT COUNT(*) as c FROM alerts').get().c).toBe(1);
    const firstAlertId = db.prepare('SELECT id FROM alerts LIMIT 1').get().id;

    // A 4th matching defect for the SAME still-open pattern must update, not duplicate.
    const result4 = logAndClassify(db, {
      stationId: 'ST-09',
      defectCode: 'TORQUE_LOW',
      occurredAt: new Date(t0 + 15 * 60_000).toISOString(),
      serialNumber: 'SN-3',
    });

    expect(db.prepare('SELECT COUNT(*) as c FROM alerts').get().c).toBe(1);
    expect(db.prepare('SELECT COUNT(*) as c FROM tickets').get().c).toBe(1);
    expect(db.prepare('SELECT COUNT(*) as c FROM ncrs').get().c).toBe(1);
    expect(result4.alertId).toBe(firstAlertId);
    expect(result4.occurrenceCount).toBe(4);
  });

  it('9. an alert can move through its lifecycle and retains its audit history', () => {
    const t0 = Date.now();
    let result;
    [0, 5, 10].forEach((m, i) => {
      result = logAndClassify(db, {
        stationId: 'ST-04',
        defectCode: 'TORQUE_LOW',
        occurredAt: new Date(t0 + m * 60_000).toISOString(),
        serialNumber: `SN-${i}`,
      });
    });
    const alertId = result.alertId;

    let current = 'OPEN';
    for (const next of ['ACKNOWLEDGED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED']) {
      db.prepare('UPDATE alerts SET state = ? WHERE id = ?').run(next, alertId);
      addHistory(db, alertId, 'Field Engineer', current, next, `moved to ${next}`);
      current = next;
    }

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
    expect(alert.state).toBe('RESOLVED');

    const history = db.prepare('SELECT * FROM alert_history WHERE alert_id = ? ORDER BY timestamp ASC').all(alertId);
    // 1 initial "-> OPEN" entry from classifyDefect + 4 manual transitions above
    expect(history.length).toBe(5);
    expect(history[0].to_state).toBe('OPEN');
    expect(history[history.length - 1].to_state).toBe('RESOLVED');
  });

  it('10. an unknown station is rejected before it ever reaches the rule engine', () => {
    // The route layer checks this before calling classifyDefect at all (see api.test.js
    // for the full HTTP-level assertion); here we confirm the condition it checks for.
    const station = db.prepare('SELECT * FROM stations WHERE id = ?').get('ST-DOES-NOT-EXIST');
    expect(station).toBeUndefined();
  });
});
