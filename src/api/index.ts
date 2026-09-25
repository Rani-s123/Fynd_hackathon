import type {
  Alert,
  AlertHistoryEntry,
  AlertState,
  AuditEntry,
  ActivityEvent,
  Defect,
  DefectSubmitResponse,
  KnownFix,
  Role,
  Severity,
  SummaryMetrics,
  Ticket,
  TrendPoint,
} from '@/types';
import { mockApi } from './client';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  logDefect(input: {
    stationId: string;
    productId: string;
    serialNumber: string;
    defectCode: string;
    description: string;
    photoDataUrl?: string;
    occurredAt: string;
    actor?: string;
  }): Promise<DefectSubmitResponse> {
    if (API_URL) {
      return fetchJson<DefectSubmitResponse>('/api/defects', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    }
    return mockApi.logDefect(input);
  },

  getDefects(stationId?: string): Promise<Defect[]> {
    if (API_URL) return fetchJson<Defect[]>(`/api/defects${stationId ? `?station_id=${stationId}` : ''}`);
    return mockApi.getDefects(stationId);
  },

  getAlerts(filters?: { state?: AlertState; severity?: Severity; stationId?: string; defectCode?: string }): Promise<Alert[]> {
    if (API_URL) {
      const params = new URLSearchParams();
      if (filters?.state) params.set('state', filters.state);
      return fetchJson<Alert[]>(`/api/alerts?${params}`);
    }
    return mockApi.getAlerts(filters);
  },

  getAlert(id: string): Promise<Alert | undefined> {
    if (API_URL) return fetchJson<Alert>(`/api/alerts/${id}`);
    return mockApi.getAlert(id);
  },

  acknowledgeAlert(id: string, actor: string, note: string): Promise<Alert | undefined> {
    if (API_URL) {
      return fetchJson<Alert>(`/api/alerts/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ actor, note }),
      });
    }
    return mockApi.acknowledgeAlert(id, actor, note);
  },

  transitionAlert(id: string, target: AlertState, actor: string, note: string): Promise<Alert | undefined> {
    if (API_URL) {
      return fetchJson<Alert>(`/api/alerts/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ target, actor, note }),
      });
    }
    return mockApi.transitionAlert(id, target, actor, note);
  },

  getEvidence(alertId: string): Promise<Defect[]> {
    if (API_URL) return fetchJson<Defect[]>(`/api/alerts/${alertId}/evidence`);
    return mockApi.getEvidence(alertId);
  },

  getHistory(alertId: string): Promise<AlertHistoryEntry[]> {
    if (API_URL) return fetchJson<AlertHistoryEntry[]>(`/api/alerts/${alertId}/history`);
    return mockApi.getHistory(alertId);
  },

  getKnownFix(code: string): Promise<KnownFix | undefined> {
    if (API_URL) return fetchJson<KnownFix>(`/api/known-fixes/${code}`);
    return mockApi.getKnownFix(code);
  },

  getAllKnownFixes(): Promise<KnownFix[]> {
    if (API_URL) return fetchJson<KnownFix[]>('/api/known-fixes');
    return mockApi.getAllKnownFixes();
  },

  markFixHelpful(code: string): Promise<KnownFix | undefined> {
    if (API_URL) return fetchJson<KnownFix>(`/api/known-fixes/${code}/helpful`, { method: 'POST' });
    return mockApi.markFixHelpful(code);
  },

  createTicket(input: { alertId?: string; defectCode: string; stationId: string }): Promise<Ticket> {
    if (API_URL) {
      return fetchJson<Ticket>('/api/tickets', { method: 'POST', body: JSON.stringify(input) });
    }
    return mockApi.createTicket(input);
  },

  updateNcr(alertId: string, containment: string, correctiveAction: string): Promise<Alert | undefined> {
    if (API_URL) {
      return fetchJson<Alert>(`/api/ncrs/${alertId}`, {
        method: 'POST',
        body: JSON.stringify({ containment, correctiveAction }),
      });
    }
    return mockApi.updateNcr(alertId, containment, correctiveAction);
  },

  getMetrics(): Promise<SummaryMetrics> {
    if (API_URL) return fetchJson<SummaryMetrics>('/api/metrics/summary');
    return mockApi.getMetrics();
  },

  getStationRisk(): Promise<{ stationId: string; count: number; threshold: number }[]> {
    if (API_URL) return fetchJson('/api/metrics/station-risk');
    return mockApi.getStationRisk();
  },

  getTrend(stationId: string): Promise<TrendPoint[]> {
    if (API_URL) return fetchJson(`/api/metrics/trend?station_id=${stationId}`);
    return mockApi.getTrend(stationId);
  },

  getActivity(): Promise<ActivityEvent[]> {
    if (API_URL) return fetchJson('/api/activity');
    return mockApi.getActivity();
  },

  getAudit(filters?: { entity?: string; actor?: string }): Promise<AuditEntry[]> {
    if (API_URL) {
      const params = new URLSearchParams();
      if (filters?.entity) params.set('entity', filters.entity);
      if (filters?.actor) params.set('actor', filters.actor);
      return fetchJson(`/api/audit?${params}`);
    }
    return mockApi.getAudit(filters);
  },

  getSettings(): Promise<{ thresholdN: number; windowT: number; ruleVersion: string }> {
    if (API_URL) return fetchJson('/api/settings');
    return mockApi.getSettings();
  },

  saveSettings(thresholdN: number, windowT: number): Promise<void> {
    if (API_URL) {
      return fetchJson('/api/settings', { method: 'POST', body: JSON.stringify({ thresholdN, windowT }) });
    }
    return mockApi.saveSettings(thresholdN, windowT);
  },

  runDemoScenario(): Promise<void> {
    if (API_URL) return fetchJson('/api/demo', { method: 'POST' });
    return mockApi.runDemoScenario();
  },

  getStations() {
    return mockApi.getStations();
  },
  getProducts() {
    return mockApi.getProducts();
  },
  getDefectCodes() {
    return mockApi.getDefectCodes();
  },
  setCurrentUser(role: Role) {
    mockApi.setCurrentUser(role);
  },
  getCurrentUser(): Role {
    return mockApi.getCurrentUser();
  },
};
