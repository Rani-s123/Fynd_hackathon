export function mapDefect(row) {
  return {
    id: row.id,
    stationId: row.station_id,
    productId: row.product_id,
    serialNumber: row.serial_number,
    defectCode: row.defect_code,
    description: row.description,
    photoDataUrl: row.photo_data_url ?? undefined,
    occurredAt: row.occurred_at,
    loggedAt: row.logged_at,
    loggedBy: row.logged_by,
  };
}

export function mapAlert(row) {
  return {
    id: row.id,
    severity: row.severity,
    stationId: row.station_id,
    defectCode: row.defect_code,
    count: row.count,
    threshold: row.threshold,
    windowMinutes: row.window_minutes,
    firstOccurrence: row.first_occurrence,
    latestOccurrence: row.latest_occurrence,
    state: row.state,
    ticketId: row.ticket_id ?? undefined,
    ncrId: row.ncr_id ?? undefined,
    ruleVersion: row.rule_version,
    recommendedAction: row.recommended_action,
    containment: row.containment ?? '',
    correctiveAction: row.corrective_action ?? '',
    ncrStatus: row.ncr_status ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapTicket(row) {
  return {
    id: row.id,
    alertId: row.alert_id ?? '',
    defectCode: row.defect_code,
    stationId: row.station_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapHistory(row) {
  return {
    id: row.id,
    alertId: row.alert_id,
    actor: row.actor,
    fromState: row.from_state,
    toState: row.to_state,
    note: row.note,
    timestamp: row.timestamp,
  };
}

export function mapAudit(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    actor: row.actor,
    entity: row.entity,
    action: row.action,
    details: row.details,
  };
}

export function mapActivity(row) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    timestamp: row.timestamp,
    actor: row.actor,
  };
}
