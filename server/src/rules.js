import { nextId, getSetting } from './db.js';

export function severityForCount(count, threshold) {
  if (count >= threshold + 2) return 'CRITICAL';
  if (count >= threshold + 1) return 'HIGH';
  if (count >= threshold) return 'MEDIUM';
  return 'NORMAL';
}

export function addAudit(db, actor, entity, action, details) {
  const id = nextId(db, 'AUD');
  db.prepare('INSERT INTO audit_events (id, timestamp, actor, entity, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, new Date().toISOString(), actor, entity, action, details);
  return id;
}

export function addActivity(db, type, message, actor) {
  const id = nextId(db, 'ACT');
  db.prepare('INSERT INTO activity_events (id, type, message, timestamp, actor) VALUES (?, ?, ?, ?, ?)')
    .run(id, type, message, new Date().toISOString(), actor);
  return id;
}

export function addHistory(db, alertId, actor, fromState, toState, note) {
  const id = nextId(db, 'H');
  db.prepare('INSERT INTO alert_history (id, alert_id, actor, from_state, to_state, note, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, alertId, actor, fromState, toState, note || '', new Date().toISOString());
  return id;
}

export function mapKnownFix(row) {
  if (!row) return undefined;
  return {
    code: row.code,
    title: row.title,
    probableCause: row.probable_cause,
    documentedFix: row.documented_fix,
    safetyNote: row.safety_note,
    owner: row.owner,
    lastReviewed: row.last_reviewed,
    helpfulCount: row.helpful_count,
  };
}

/**
 * Core pattern-detection rule engine (brief section 7 "Detection Algorithm").
 *
 * IMPORTANT: call this AFTER the triggering defect row has already been
 * inserted into `defects`. The matching query below intentionally includes
 * that row (it is, after all, one of the occurrences of the pattern), so the
 * count is exactly `matching.length` -- no manual "+1" is needed or correct.
 *
 * Two things this fixes relative to the earlier frontend-only mock:
 *  1. Event-time evaluation: the window is computed from each defect's own
 *     `occurred_at`, never from the server's current clock, so delayed or
 *     offline submissions are handled predictably (brief section 4.2).
 *  2. Idempotency: if a non-resolved alert already exists for this exact
 *     station+defectCode pattern, it is updated in place rather than
 *     spawning a second alert/ticket/NCR (brief section 4.4 / 9).
 */
export function classifyDefect(db, { stationId, defectCode, occurredAt }) {
  const thresholdN = Number(getSetting(db, 'thresholdN', '3'));
  const windowT = Number(getSetting(db, 'windowT', '30'));
  const ruleVersion = getSetting(db, 'ruleVersion', 'v3');
  const windowMs = windowT * 60_000;
  const occurredTs = new Date(occurredAt).getTime();

  const candidates = db
    .prepare('SELECT * FROM defects WHERE station_id = ? AND defect_code = ?')
    .all(stationId, defectCode);

  const matching = candidates.filter((d) => {
    const t = new Date(d.occurred_at).getTime();
    return t >= occurredTs - windowMs && t <= occurredTs;
  });

  const count = matching.length;
  const knownFix = db.prepare('SELECT * FROM known_fixes WHERE code = ?').get(defectCode);
  const firstOccurrence = matching.reduce(
    (min, d) => (d.occurred_at < min ? d.occurred_at : min),
    matching[0]?.occurred_at ?? occurredAt,
  );

  if (count >= thresholdN) {
    const severity = severityForCount(count, thresholdN);

    // Idempotency: reuse the existing open alert for this exact pattern instead
    // of creating a duplicate alert/ticket/NCR (brief 4.4: "must be idempotent").
    const existing = db
      .prepare(`SELECT * FROM alerts WHERE station_id = ? AND defect_code = ? AND state != 'RESOLVED'`)
      .get(stationId, defectCode);

    if (existing) {
      db.prepare('UPDATE alerts SET count = ?, severity = ?, latest_occurrence = ? WHERE id = ?')
        .run(count, severity, occurredAt, existing.id);
      addAudit(db, 'System', 'Alert', 'UPDATE', `${existing.id} updated (count=${count}) for existing ${defectCode} pattern at ${stationId}`);
      addActivity(db, 'alert_opened', `${existing.id} updated: ${defectCode} at ${stationId} now at ${count}/${thresholdN}`, 'System');
      return {
        classification: 'SYSTEMIC',
        severity,
        stationId,
        defectCode,
        occurrenceCount: count,
        windowMinutes: windowT,
        alertId: existing.id,
        ticketId: existing.ticket_id,
        ncrId: existing.ncr_id,
        recommendedAction: existing.recommended_action,
      };
    }

    const alertId = nextId(db, 'ALT');
    const ticketId = nextId(db, 'TKT');
    const ncrId = nextId(db, 'NCR');
    const recommendedAction =
      knownFix?.documented_fix ?? `Pause affected operation and investigate ${defectCode} at ${stationId}.`;
    const nowIso = new Date().toISOString();

    db.prepare(
      `INSERT INTO alerts (id, severity, station_id, defect_code, count, threshold, window_minutes, first_occurrence, latest_occurrence, state, ticket_id, ncr_id, rule_version, recommended_action, containment, corrective_action, ncr_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, '', '', 'DRAFT', ?)`,
    ).run(alertId, severity, stationId, defectCode, count, thresholdN, windowT, firstOccurrence, occurredAt, ticketId, ncrId, ruleVersion, recommendedAction, nowIso);

    db.prepare(`INSERT INTO tickets (id, alert_id, defect_code, station_id, status, created_at) VALUES (?, ?, ?, ?, 'OPEN', ?)`)
      .run(ticketId, alertId, defectCode, stationId, nowIso);
    db.prepare(`INSERT INTO ncrs (id, alert_id, containment, corrective_action, status, created_at) VALUES (?, ?, '', '', 'DRAFT', ?)`)
      .run(ncrId, alertId, nowIso);

    addHistory(db, alertId, 'System', '—', 'OPEN', 'Alert auto-generated by pattern rule');
    addAudit(db, 'System', 'Alert', 'OPEN', `Alert ${alertId} opened for ${defectCode} at ${stationId}`);
    addActivity(db, 'alert_opened', `Alert ${alertId} opened for ${defectCode} at ${stationId}`, 'System');
    addAudit(db, 'System', 'Ticket', 'CREATE', `Ticket ${ticketId} created for ${alertId}`);
    addActivity(db, 'ticket_created', `Ticket ${ticketId} created`, 'System');
    addAudit(db, 'System', 'NCR', 'CREATE', `NCR ${ncrId} created for ${alertId}`);
    addActivity(db, 'ncr_created', `NCR ${ncrId} created for ${alertId}`, 'System');

    return {
      classification: 'SYSTEMIC',
      severity,
      stationId,
      defectCode,
      occurrenceCount: count,
      windowMinutes: windowT,
      alertId,
      ticketId,
      ncrId,
      recommendedAction,
    };
  }

  if (knownFix) {
    return {
      classification: 'KNOWN',
      severity: 'MEDIUM',
      stationId,
      defectCode,
      occurrenceCount: count,
      windowMinutes: windowT,
      knownFix: mapKnownFix(knownFix),
      currentCount: count,
      windowThreshold: thresholdN,
    };
  }

  const ticketId = nextId(db, 'TKT');
  db.prepare(`INSERT INTO tickets (id, alert_id, defect_code, station_id, status, created_at) VALUES (?, '', ?, ?, 'OPEN', ?)`)
    .run(ticketId, defectCode, stationId, new Date().toISOString());
  addAudit(db, 'System', 'Ticket', 'CREATE', `Investigation ticket ${ticketId} created for ${defectCode}`);
  addActivity(db, 'ticket_created', `Investigation ticket ${ticketId} created`, 'System');

  return {
    classification: 'UNKNOWN',
    severity: 'MEDIUM',
    stationId,
    defectCode,
    occurrenceCount: count,
    windowMinutes: windowT,
    ticketId,
  };
}
