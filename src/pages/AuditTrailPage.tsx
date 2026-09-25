import { useState, useEffect, useCallback } from 'react';
import { ScrollText } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { formatTime } from '@/utils/format';
import type { AuditEntry } from '@/types';

import { exportToCSV } from '@/utils/export';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Form';

export function AuditTrailPage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  const entities = ['Defect', 'Alert', 'Ticket', 'NCR', 'Settings'];
  const actors = ['Operator', 'Field Engineer', 'Line Leader', 'Quality Engineer', 'System'];

  const load = useCallback(async () => {
    try {
      const data = await api.getAudit({
        entity: entityFilter || undefined,
        actor: actorFilter || undefined,
      });
      setEntries(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actorFilter]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = () => {
    if (!entries.length) return;
    exportToCSV('Audit_Trail_Report', entries);
  };

  return (
    <Layout title={t('audit.title')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-steel-500 dark:text-steel-400">{t('audit.subtitle')}</p>
        <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={!entries.length}>
          <span className="flex items-center gap-1.5">
            <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Export Audit Log CSV
          </span>
        </Button>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select
              label={t('audit.filterEntity')}
              value={entityFilter}
              onChange={setEntityFilter}
              options={entities.map((e) => ({ value: e, label: e }))}
              placeholder={t('common.all')}
            />
            <Select
              label={t('audit.filterActor')}
              value={actorFilter}
              onChange={setActorFilter}
              options={actors.map((a) => ({ value: a, label: a }))}
              placeholder={t('common.all')}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : error ? (
          <ErrorState message={t('common.error')} onRetry={load} />
        ) : entries.length === 0 ? (
          <EmptyState message={t('audit.empty')} icon={<ScrollText className="h-8 w-8 text-steel-300 dark:text-steel-600" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-steel-200 bg-steel-50 text-left text-xs text-steel-500 dark:border-steel-700 dark:bg-steel-800/50 dark:text-steel-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('common.time')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.actor')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.entity')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.action')}</th>
                  <th className="px-3 py-2 font-medium">{t('common.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100 dark:divide-steel-700/50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-steel-50 dark:hover:bg-steel-700/20">
                    <td className="px-3 py-2 font-mono tabular-nums text-xs text-steel-500 dark:text-steel-400">{formatTime(e.timestamp)}</td>
                    <td className="px-3 py-2 text-xs text-steel-700 dark:text-steel-300">{e.actor}</td>
                    <td className="px-3 py-2 text-xs text-steel-700 dark:text-steel-300">{e.entity}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-steel-100 px-2 py-0.5 font-mono text-xs text-steel-600 dark:bg-steel-700 dark:text-steel-300">{e.action}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-steel-600 dark:text-steel-400">{e.details}</td>
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
