import { Router } from 'express';
import { nextId, getSetting, setSetting } from './db.js';
import { classifyDefect, addAudit, addActivity, addHistory, mapKnownFix } from './rules.js';
import { mapDefect, mapAlert, mapTicket, mapHistory, mapAudit, mapActivity } from './mappers.js';

const VALID_TRANSITIONS = {
  OPEN: 'ACKNOWLEDGED',
  ACKNOWLEDGED: 'INVESTIGATING',
  INVESTIGATING: 'CONTAINED',
  CONTAINED: 'RESOLVED',
  RESOLVED: null,
};

export function createRouter(db) {
  const router = Router();

  // ---- Defects -----------------------------------------------------------

  router.post('/defects', (req, res) => {
    const { stationId, productId, serialNumber, defectCode, description, photoDataUrl, occurredAt, actor } = req.body || {};

    const missing = [];
    if (!stationId) missing.push('stationId');
    if (!productId) missing.push('productId');
    if (!serialNumber) missing.push('serialNumber');
    if (!defectCode) missing.push('defectCode');
    if (!description) missing.push('description');
    if (!occurredAt) missing.push('occurredAt');
    if (missing.length > 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Missing required field(s): ${missing.join(', ')}` });
    }

    const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(stationId);
    if (!station) return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Unknown stationId: ${stationId}` });
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Unknown productId: ${productId}` });

    // Dedup: same serial+station+code submitted again within the last 60s is a duplicate (brief 4.1).
    const dupWindowStart = new Date(Date.now() - 60_000).toISOString();
    const duplicate = db
      .prepare(
        `SELECT * FROM defects WHERE station_id = ? AND serial_number = ? AND defect_code = ? AND logged_at >= ?
         ORDER BY logged_at DESC LIMIT 1`,
      )
      .get(stationId, serialNumber, defectCode, dupWindowStart);

    if (duplicate) {
      const windowT = Number(getSetting(db, 'windowT', '30'));
      const windowMs = windowT * 60_000;
      const occurredTs = new Date(occurredAt).getTime();
      const currentCount = db
        .prepare('SELECT occurred_at FROM defects WHERE station_id = ? AND defect_code = ?')
        .all(stationId, defectCode)
        .filter((d) => {
          const t = new Date(d.occurred_at).getTime();
          return t >= occurredTs - windowMs && t <= occurredTs;
        }).length;

      return res.json({
        classification: 'NORMAL',
        severity: 'NORMAL',
        stationId,
        defectCode,
        occurrenceCount: currentCount,
        windowMinutes: windowT,
        duplicate: true,
      });
    }

    const id = nextId(db, 'DEF');
    const now = new Date().toISOString();
    const loggedBy = actor || 'Field Engineer';

    db.prepare(
      `INSERT INTO defects (id, station_id, product_id, serial_number, defect_code, description, photo_data_url, occurred_at, logged_at, logged_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, stationId, productId, serialNumber, defectCode, description, photoDataUrl || null, occurredAt, now, loggedBy);

    addAudit(db, loggedBy, 'Defect', 'LOG', `${id} logged at ${stationId} (${defectCode})`);
    addActivity(db, 'defect_logged', `${id} logged at ${stationId} (${defectCode})`, loggedBy);

    const result = classifyDefect(db, { stationId, defectCode, occurredAt });
    res.json(result);
  });

  router.get('/defects', (req, res) => {
    const { station_id } = req.query;
    // Capped at 200 most recent so this stays fast as the demo data grows;
    // the dashboard/alert screens only ever need a station's recent window anyway.
    const rows = station_id
      ? db.prepare('SELECT * FROM defects WHERE station_id = ? ORDER BY occurred_at DESC LIMIT 200').all(station_id)
      : db.prepare('SELECT * FROM defects ORDER BY occurred_at DESC LIMIT 200').all();
    res.json(rows.map(mapDefect));
  });

  // ---- Alerts --------------------------------------------------------------

  router.get('/alerts', (req, res) => {
    const { state, severity, station_id, defect_code } = req.query;
    const clauses = [];
    const params = [];
    if (state) { clauses.push('state = ?'); params.push(state); }
    if (severity) { clauses.push('severity = ?'); params.push(severity); }
    if (station_id) { clauses.push('station_id = ?'); params.push(station_id); }
    if (defect_code) { clauses.push('defect_code = ?'); params.push(defect_code); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT * FROM alerts ${where} ORDER BY created_at DESC`).all(...params);
    res.json(rows.map(mapAlert));
  });

  router.get('/alerts/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(mapAlert(row));
  });

  router.post('/alerts/:id/acknowledge', (req, res) => {
    const { actor, note } = req.body || {};
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'NOT_FOUND' });
    if (alert.state !== 'OPEN') return res.json(mapAlert(alert)); // no-op if already past OPEN
    const who = actor || 'Field Engineer';
    db.prepare(`UPDATE alerts SET state = 'ACKNOWLEDGED' WHERE id = ?`).run(alert.id);
    addHistory(db, alert.id, who, alert.state, 'ACKNOWLEDGED', note);
    addAudit(db, who, 'Alert', 'TRANSITION', `${alert.id} ${alert.state} -> ACKNOWLEDGED`);
    addActivity(db, 'state_changed', `${alert.id} ${alert.state} -> ACKNOWLEDGED`, who);
    res.json(mapAlert(db.prepare('SELECT * FROM alerts WHERE id = ?').get(alert.id)));
  });

  router.post('/alerts/:id/transition', (req, res) => {
    const { target, actor, note } = req.body || {};
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'NOT_FOUND' });
    const expected = VALID_TRANSITIONS[alert.state];
    if (!target || expected !== target) return res.json(mapAlert(alert)); // reject invalid jump silently, mirrors the state machine
    const who = actor || 'Field Engineer';
    db.prepare('UPDATE alerts SET state = ? WHERE id = ?').run(target, alert.id);
    addHistory(db, alert.id, who, alert.state, target, note);
    addAudit(db, who, 'Alert', 'TRANSITION', `${alert.id} ${alert.state} -> ${target}`);
    addActivity(db, 'state_changed', `${alert.id} ${alert.state} -> ${target}`, who);
    res.json(mapAlert(db.prepare('SELECT * FROM alerts WHERE id = ?').get(alert.id)));
  });

  router.get('/alerts/:id/evidence', (req, res) => {
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) return res.json([]);
    const windowMs = alert.window_minutes * 60_000;
    const firstTs = new Date(alert.first_occurrence).getTime();
    const rows = db.prepare('SELECT * FROM defects WHERE station_id = ? AND defect_code = ?').all(alert.station_id, alert.defect_code);
    const evidence = rows
      .filter((d) => Math.abs(new Date(d.occurred_at).getTime() - firstTs) < windowMs + 60_000)
      .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
    res.json(evidence.map(mapDefect));
  });

  router.get('/alerts/:id/history', (req, res) => {
    const rows = db.prepare('SELECT * FROM alert_history WHERE alert_id = ? ORDER BY timestamp ASC').all(req.params.id);
    res.json(rows.map(mapHistory));
  });

  // ---- Known fixes --------------------------------------------------------

  router.get('/known-fixes', (_req, res) => {
    res.json(db.prepare('SELECT * FROM known_fixes').all().map(mapKnownFix));
  });

  router.get('/known-fixes/:code', (req, res) => {
    const row = db.prepare('SELECT * FROM known_fixes WHERE code = ?').get(req.params.code);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(mapKnownFix(row));
  });

  router.post('/known-fixes/:code/helpful', (req, res) => {
    db.prepare('UPDATE known_fixes SET helpful_count = helpful_count + 1 WHERE code = ?').run(req.params.code);
    const row = db.prepare('SELECT * FROM known_fixes WHERE code = ?').get(req.params.code);
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(mapKnownFix(row));
  });

  // ---- Tickets & NCRs -------------------------------------------------------

  router.post('/tickets', (req, res) => {
    const { alertId, defectCode, stationId } = req.body || {};
    if (!defectCode || !stationId) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'defectCode and stationId are required' });
    }
    const id = nextId(db, 'TKT');
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO tickets (id, alert_id, defect_code, station_id, status, created_at) VALUES (?, ?, ?, ?, 'OPEN', ?)`)
      .run(id, alertId || '', defectCode, stationId, now);
    addAudit(db, 'Field Engineer', 'Ticket', 'CREATE', `Ticket ${id} created`);
    addActivity(db, 'ticket_created', `Ticket ${id} created`, 'Field Engineer');
    res.json(mapTicket({ id, alert_id: alertId || '', defect_code: defectCode, station_id: stationId, status: 'OPEN', created_at: now }));
  });

  router.post('/ncrs/:alertId', (req, res) => {
    const { containment, correctiveAction } = req.body || {};
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.alertId);
    if (!alert) return res.status(404).json({ error: 'NOT_FOUND' });
    const ncrStatus = alert.ncr_status === 'DRAFT' ? 'IN_PROGRESS' : alert.ncr_status;
    db.prepare('UPDATE alerts SET containment = ?, corrective_action = ?, ncr_status = ? WHERE id = ?')
      .run(containment || '', correctiveAction || '', ncrStatus, alert.id);
    if (alert.ncr_id) {
      db.prepare('UPDATE ncrs SET containment = ?, corrective_action = ?, status = ? WHERE id = ?')
        .run(containment || '', correctiveAction || '', ncrStatus, alert.ncr_id);
    }
    addAudit(db, 'Field Engineer', 'NCR', 'UPDATE', `NCR for ${alert.id} updated`);
    res.json(mapAlert(db.prepare('SELECT * FROM alerts WHERE id = ?').get(alert.id)));
  });

  // ---- Metrics / dashboard --------------------------------------------------

  router.get('/metrics/summary', (_req, res) => {
    const openAlerts = db.prepare(`SELECT COUNT(*) as c FROM alerts WHERE state != 'RESOLVED'`).get().c;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const systemicToday = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE created_at >= ?').get(todayStart.toISOString()).c;

    const alerts = db.prepare('SELECT DISTINCT station_id, defect_code FROM alerts').all();
    const unitSet = new Set();
    for (const a of alerts) {
      const defs = db.prepare('SELECT serial_number FROM defects WHERE station_id = ? AND defect_code = ?').all(a.station_id, a.defect_code);
      for (const d of defs) unitSet.add(d.serial_number);
    }
    const unresolvedTickets = db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status != 'RESOLVED'`).get().c;
    res.json({ openAlerts, systemicPatternsToday: systemicToday, affectedUnits: unitSet.size, unresolvedTickets });
  });

  router.get('/metrics/station-risk', (_req, res) => {
    const windowT = Number(getSetting(db, 'windowT', '30'));
    const thresholdN = Number(getSetting(db, 'thresholdN', '3'));
    const since = new Date(Date.now() - windowT * 60_000).toISOString();
    const stations = db.prepare('SELECT * FROM stations').all();
    res.json(
      stations.map((st) => {
        const count = db.prepare('SELECT COUNT(*) as c FROM defects WHERE station_id = ? AND occurred_at >= ?').get(st.id, since).c;
        return { stationId: st.id, count, threshold: thresholdN };
      }),
    );
  });

  router.get('/metrics/trend', (req, res) => {
    const stationId = req.query.station_id;
    if (!stationId) return res.json([]);
    const windowT = Number(getSetting(db, 'windowT', '30'));
    const windowMs = windowT * 60_000;
    const rows = db.prepare('SELECT * FROM defects WHERE station_id = ?').all(stationId);
    const codes = [...new Set(rows.map((r) => r.defect_code))];
    const buckets = {};
    for (let i = 9; i >= 0; i--) {
      const ts = Date.now() - i * (windowMs / 3);
      const label = new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      buckets[label] = { timestamp: new Date(ts).toISOString(), label };
      for (const c of codes) buckets[label][c] = 0;
    }
    for (const d of rows) {
      const label = new Date(d.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (buckets[label] && typeof buckets[label][d.defect_code] === 'number') buckets[label][d.defect_code]++;
    }
    res.json(Object.values(buckets));
  });

  router.get('/activity', (_req, res) => {
    res.json(db.prepare('SELECT * FROM activity_events ORDER BY timestamp DESC LIMIT 15').all().map(mapActivity));
  });

  router.get('/audit', (req, res) => {
    const { entity, actor } = req.query;
    const clauses = [];
    const params = [];
    if (entity) { clauses.push('entity = ?'); params.push(entity); }
    if (actor) { clauses.push('actor = ?'); params.push(actor); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    res.json(db.prepare(`SELECT * FROM audit_events ${where} ORDER BY timestamp DESC LIMIT 300`).all(...params).map(mapAudit));
  });

  // ---- Settings --------------------------------------------------------------

  router.get('/settings', (_req, res) => {
    res.json({
      thresholdN: Number(getSetting(db, 'thresholdN', '3')),
      windowT: Number(getSetting(db, 'windowT', '30')),
      ruleVersion: getSetting(db, 'ruleVersion', 'v3'),
    });
  });

  router.post('/settings', (req, res) => {
    const { thresholdN, windowT } = req.body || {};
    const n = Number(thresholdN);
    const t = Number(windowT);
    if (!Number.isFinite(n) || n < 1 || !Number.isFinite(t) || t < 1) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'thresholdN and windowT must be positive numbers' });
    }
    setSetting(db, 'thresholdN', String(Math.round(n)));
    setSetting(db, 'windowT', String(Math.round(t)));
    addAudit(db, 'Field Engineer', 'Settings', 'UPDATE', `Threshold=${Math.round(n)}, Window=${Math.round(t)}min`);
    res.json({ ok: true });
  });

  // ---- Demo scenario -----------------------------------------------------

  router.post('/demo', async (_req, res) => {
    const stationId = 'ST-07';
    const defectCode = 'TORQUE_LOW';
    const productId = 'PUMP-X2';
    let last;
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const serial = `PX2-DEMO-${Date.now()}-${i}`;
      const id = nextId(db, 'DEF');
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO defects (id, station_id, product_id, serial_number, defect_code, description, photo_data_url, occurred_at, logged_at, logged_by)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      ).run(id, stationId, productId, serial, defectCode, `Demo scenario: torque reading below spec on unit ${serial}`, now, now, 'Field Engineer');
      addAudit(db, 'Field Engineer', 'Defect', 'LOG', `${id} logged at ${stationId} (${defectCode})`);
      addActivity(db, 'defect_logged', `${id} logged at ${stationId} (${defectCode})`, 'Field Engineer');
      last = classifyDefect(db, { stationId, defectCode, occurredAt: now });
    }
    res.json({ ok: true, result: last });
  });

  // ---- Reference data (stations / products / defect codes) ----------------

  router.get('/stations', (_req, res) => {
    res.json(db.prepare('SELECT * FROM stations').all().map((s) => ({ id: s.id, name: s.name, threshold: s.threshold })));
  });
  router.get('/products', (_req, res) => {
    res.json(db.prepare('SELECT * FROM products').all());
  });
  router.get('/defect-codes', (_req, res) => {
    res.json(db.prepare('SELECT * FROM defect_codes').all());
  });

  return router;
}
