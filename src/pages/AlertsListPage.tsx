import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardBody } from '@/components/ui/Card';
import { SeverityBadge, StateBadge, severityLeftBorderClass } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Form';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { formatTime } from '@/utils/format';
import type { Alert, AlertState, Severity } from '@/types';

const states: AlertState[] = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'];
const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL'];

import { exportToCSV } from '@/utils/export';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Form';

export function AlertsListPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<{ state?: AlertState; severity?: Severity; stationId?: string; defectCode?: string }>({});

  const stations = api.getStations();
  const codes = api.getDefectCodes();

  const load = useCallback(async () => {
    try {
      const data = await api.getAlerts(filters);
      setAlerts(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = () => {
    if (!alerts.length) return;
    exportToCSV('Escalated_Alerts_Report', alerts);
  };

  return (
    <Layout title={t('alerts.title')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-steel-500 dark:text-steel-400">{t('alerts.subtitle')}</p>
        <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={!alerts.length}>
          <span className="flex items-center gap-1.5">
            <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Export Alerts CSV
          </span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select
              label={t('alerts.filterState')}
              value={filters.state ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, state: v ? (v as AlertState) : undefined }))}
              options={states.map((s) => ({ value: s, label: t(`state.${s}`) }))}
              placeholder={t('common.all')}
            />
            <Select
              label={t('alerts.filterSeverity')}
              value={filters.severity ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, severity: v ? (v as Severity) : undefined }))}
              options={severities.map((s) => ({ value: s, label: t(`severity.${s}`) }))}
              placeholder={t('common.all')}
            />
            <Select
              label={t('alerts.filterStation')}
              value={filters.stationId ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, stationId: v || undefined }))}
              options={stations.map((s) => ({ value: s.id, label: s.id }))}
              placeholder={t('common.all')}
            />
            <Select
              label={t('alerts.filterCode')}
              value={filters.defectCode ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, defectCode: v || undefined }))}
              options={codes.map((c) => ({ value: c.code, label: c.code }))}
              placeholder={t('common.all')}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <ErrorState message={t('common.error')} onRetry={load} />
        ) : alerts.length === 0 ? (
          <EmptyState message={t('alerts.empty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-steel-200 bg-steel-50 text-left text-xs text-steel-500 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('common.severity')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.station')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.code')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.count')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.first')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.latest')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.state')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100 dark:divide-steel-700/50">
                {alerts.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/alerts/${a.id}`)}
                    className={`cursor-pointer border-l-[3px] hover:bg-steel-50 dark:hover:bg-steel-700/30 ${severityLeftBorderClass(a.severity)}`}
                  >
                    <td className="px-3 py-2"><SeverityBadge severity={a.severity} /></td>
                    <td className="px-3 py-2 font-mono text-xs text-steel-700 dark:text-steel-300">{a.stationId}</td>
                    <td className="px-3 py-2 font-mono text-xs text-steel-700 dark:text-steel-300">{a.defectCode}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-xs text-steel-700 dark:text-steel-300">{a.count} / {a.threshold}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-xs text-steel-500 dark:text-steel-400">{formatTime(a.firstOccurrence)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-xs text-steel-500 dark:text-steel-400">{formatTime(a.latestOccurrence)}</td>
                    <td className="px-3 py-2"><StateBadge state={a.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
}
