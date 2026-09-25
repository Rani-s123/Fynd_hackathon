import type {
  Station,
  Product,
  DefectCode,
  KnownFix,
  Defect,
  Alert,
  AuditEntry,
  ActivityEvent,
} from '@/types';

export const STATIONS: Station[] = Array.from({ length: 10 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { id: `ST-${n}`, name: `Station ${n}`, threshold: 3 };
});

export const PRODUCTS: Product[] = [
  { id: 'PUMP-X2', name: 'PUMP-X2' },
  { id: 'MOTOR-V4', name: 'MOTOR-V4' },
  { id: 'VALVE-T1', name: 'VALVE-T1' },
];

export const DEFECT_CODES: DefectCode[] = [
  { code: 'TORQUE_LOW', description: 'Torque below specified range' },
  { code: 'SCRATCH', description: 'Surface scratch detected' },
  { code: 'LABEL_MISSING', description: 'Product label missing or unreadable' },
  { code: 'SEAL_LEAK', description: 'Seal integrity test failed' },
  { code: 'SCAN_FAIL', description: 'Barcode scan failure' },
  { code: 'WRONG_PART', description: 'Incorrect part installed' },
];

export const KNOWN_FIXES: KnownFix[] = [
  {
    code: 'TORQUE_LOW',
    title: 'Torque tool calibration drift',
    probableCause: 'Torque wrench calibration has drifted below spec due to extended use without service interval.',
    documentedFix:
      'Recalibrate torque tool using reference standard. Verify with 3 consecutive samples. Log calibration in tool register.',
    safetyNote: 'Lock out tool from production until recalibration is verified.',
    owner: 'Maintenance Team',
    lastReviewed: '2026-08-12',
    helpfulCount: 27,
  },
  {
    code: 'SEAL_LEAK',
    title: 'Seal compression insufficient',
    probableCause: 'O-ring compression insufficient due to worn seal seat or incorrect installation pressure.',
    documentedFix:
      'Inspect seal seat for wear. Replace O-ring with spec-grade unit. Re-run leak test at 1.5x operating pressure.',
    safetyNote: 'Depressurize line before opening seal housing.',
    owner: 'Process Engineering',
    lastReviewed: '2026-07-30',
    helpfulCount: 14,
  },
  {
    code: 'LABEL_MISSING',
    title: 'Label applicator jam',
    probableCause: 'Label applicator feed jam or empty label roll causing skipped application.',
    documentedFix:
      'Clear applicator feed path. Reload label roll. Run 5 test labels and verify adhesion.',
    safetyNote: 'No specific safety risk.',
    owner: 'Line Operations',
    lastReviewed: '2026-09-01',
    helpfulCount: 9,
  },
  {
    code: 'SCAN_FAIL',
    title: 'Barcode scanner misalignment',
    probableCause: 'Scanner head misaligned or lens fogged in humid environment.',
    documentedFix:
      'Clean scanner lens with microfiber. Verify alignment using calibration barcode. Replace if fault persists.',
    safetyNote: 'No specific safety risk.',
    owner: 'Maintenance Team',
    lastReviewed: '2026-08-20',
    helpfulCount: 6,
  },
];

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export const SEED_DEFECTS: Defect[] = [
  {
    id: 'DEF-2001',
    stationId: 'ST-03',
    productId: 'PUMP-X2',
    serialNumber: 'PX2-10045',
    defectCode: 'SCRATCH',
    description: 'Visible scratch on housing surface near mounting boss.',
    occurredAt: minutesAgo(12),
    loggedAt: minutesAgo(11),
    loggedBy: 'Operator',
  },
  {
    id: 'DEF-2002',
    stationId: 'ST-05',
    productId: 'MOTOR-V4',
    serialNumber: 'MV4-22087',
    defectCode: 'SCAN_FAIL',
    description: 'Barcode did not scan after 3 attempts.',
    occurredAt: minutesAgo(28),
    loggedAt: minutesAgo(27),
    loggedBy: 'Operator',
  },
  {
    id: 'DEF-2003',
    stationId: 'ST-05',
    productId: 'MOTOR-V4',
    serialNumber: 'MV4-22091',
    defectCode: 'SCAN_FAIL',
    description: 'Scanner timeout on serial label.',
    occurredAt: minutesAgo(22),
    loggedAt: minutesAgo(21),
    loggedBy: 'Operator',
  },
  {
    id: 'DEF-2004',
    stationId: 'ST-01',
    productId: 'VALVE-T1',
    serialNumber: 'VT1-00312',
    defectCode: 'WRONG_PART',
    description: 'Installed part number does not match BOM.',
    occurredAt: hoursAgo(3),
    loggedAt: hoursAgo(3),
    loggedBy: 'Field Engineer',
  },
];

export const SEED_ALERTS: Alert[] = [
  {
    id: 'ALT-1041',
    severity: 'MEDIUM',
    stationId: 'ST-05',
    defectCode: 'SCAN_FAIL',
    count: 2,
    threshold: 3,
    windowMinutes: 30,
    firstOccurrence: minutesAgo(28),
    latestOccurrence: minutesAgo(22),
    state: 'ACKNOWLEDGED',
    ticketId: 'TKT-1041',
    ruleVersion: 'v3',
    recommendedAction: 'Inspect scanner alignment and clean lens at ST-05.',
    containment: 'Manual serial entry enabled as interim workaround.',
    correctiveAction: 'Replace scanner head and re-verify alignment.',
    ncrStatus: 'IN_PROGRESS',
    createdAt: minutesAgo(22),
  },
];

export const SEED_AUDIT: AuditEntry[] = [
  {
    id: 'AUD-001',
    timestamp: hoursAgo(5),
    actor: 'Operator',
    entity: 'Defect',
    action: 'LOG',
    details: 'DEF-2004 logged at ST-01 (WRONG_PART)',
  },
  {
    id: 'AUD-002',
    timestamp: minutesAgo(27),
    actor: 'Operator',
    entity: 'Defect',
    action: 'LOG',
    details: 'DEF-2002 logged at ST-05 (SCAN_FAIL)',
  },
  {
    id: 'AUD-003',
    timestamp: minutesAgo(22),
    actor: 'System',
    entity: 'Alert',
    action: 'OPEN',
    details: 'ALT-1041 opened for SCAN_FAIL at ST-05',
  },
  {
    id: 'AUD-004',
    timestamp: minutesAgo(18),
    actor: 'Field Engineer',
    entity: 'Alert',
    action: 'TRANSITION',
    details: 'ALT-1041 OPEN -> ACKNOWLEDGED',
  },
  {
    id: 'AUD-005',
    timestamp: minutesAgo(15),
    actor: 'Field Engineer',
    entity: 'NCR',
    action: 'CREATE',
    details: 'NCR-1041 created for ALT-1041',
  },
];

export const SEED_ACTIVITY: ActivityEvent[] = [
  {
    id: 'ACT-001',
    type: 'defect_logged',
    message: 'DEF-2004 logged at ST-01 (WRONG_PART)',
    timestamp: hoursAgo(3),
    actor: 'Operator',
  },
  {
    id: 'ACT-002',
    type: 'defect_logged',
    message: 'DEF-2002 logged at ST-05 (SCAN_FAIL)',
    timestamp: minutesAgo(27),
    actor: 'Operator',
  },
  {
    id: 'ACT-003',
    type: 'defect_logged',
    message: 'DEF-2003 logged at ST-05 (SCAN_FAIL)',
    timestamp: minutesAgo(21),
    actor: 'Operator',
  },
  {
    id: 'ACT-004',
    type: 'alert_opened',
    message: 'Alert ALT-1041 opened for SCAN_FAIL at ST-05',
    timestamp: minutesAgo(22),
    actor: 'System',
  },
  {
    id: 'ACT-005',
    type: 'state_changed',
    message: 'ALT-1041 OPEN -> ACKNOWLEDGED',
    timestamp: minutesAgo(18),
    actor: 'Field Engineer',
  },
  {
    id: 'ACT-006',
    type: 'ncr_created',
    message: 'NCR-1041 created for ALT-1041',
    timestamp: minutesAgo(15),
    actor: 'Field Engineer',
  },
];
