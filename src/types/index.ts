export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';

export type AlertState =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'CONTAINED'
  | 'RESOLVED';

export type Classification = 'NORMAL' | 'KNOWN' | 'UNKNOWN' | 'SYSTEMIC';

export type Role = 'Operator' | 'Field Engineer' | 'Line Leader' | 'Quality Engineer';

export type Lang = 'en' | 'te';

export type Theme = 'light' | 'dark';

export interface Station {
  id: string;
  name: string;
  threshold: number;
}

export interface Product {
  id: string;
  name: string;
}

export interface DefectCode {
  code: string;
  description: string;
}

export interface Defect {
  id: string;
  stationId: string;
  productId: string;
  serialNumber: string;
  defectCode: string;
  description: string;
  photoDataUrl?: string;
  occurredAt: string;
  loggedAt: string;
  loggedBy: string;
}

export interface KnownFix {
  code: string;
  title: string;
  probableCause: string;
  documentedFix: string;
  safetyNote: string;
  owner: string;
  lastReviewed: string;
  helpfulCount: number;
}

export interface Alert {
  id: string;
  severity: Severity;
  stationId: string;
  defectCode: string;
  count: number;
  threshold: number;
  windowMinutes: number;
  firstOccurrence: string;
  latestOccurrence: string;
  state: AlertState;
  ticketId?: string;
  ncrId?: string;
  ruleVersion: string;
  recommendedAction: string;
  containment?: string;
  correctiveAction?: string;
  ncrStatus?: 'DRAFT' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
}

export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  actor: string;
  fromState: AlertState | '—';
  toState: AlertState;
  note: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  alertId: string;
  defectCode: string;
  stationId: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  createdAt: string;
}

export interface NCR {
  id: string;
  alertId: string;
  containment: string;
  correctiveAction: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  entity: string;
  action: string;
  details: string;
}

export interface ActivityEvent {
  id: string;
  type: 'defect_logged' | 'alert_opened' | 'state_changed' | 'ncr_created' | 'ticket_created';
  message: string;
  timestamp: string;
  actor: string;
}

export interface SummaryMetrics {
  openAlerts: number;
  systemicPatternsToday: number;
  affectedUnits: number;
  unresolvedTickets: number;
}

export interface DefectSubmitResponse {
  classification: Classification;
  severity: Severity;
  stationId: string;
  defectCode: string;
  occurrenceCount: number;
  windowMinutes: number;
  alertId?: string;
  ticketId?: string;
  ncrId?: string;
  recommendedAction?: string;
  knownFix?: KnownFix;
  currentCount?: number;
  windowThreshold?: number;
  duplicate?: boolean;
}

export interface TrendPoint {
  timestamp: string;
  label: string;
  [key: string]: string | number;
}
