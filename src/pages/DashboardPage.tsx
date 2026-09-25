import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingDown, Package, Ticket, Play, ChevronRight, Activity as ActivityIcon, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { SeverityBadge, StateBadge, severityLeftBorderClass } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Form';
import { Skeleton, CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Form';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { formatTime, formatTimeShort } from '@/utils/format';
import type { SummaryMetrics, Alert, ActivityEvent, TrendPoint } from '@/types';

import { exportToCSV, exportToJSON } from '@/utils/export';
import { Download, FileSpreadsheet } from 'lucide-react';

export function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [stationRisk, setStationRisk] = useState<{ stationId: string; count: number; threshold: number }[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [selectedStation, setSelectedStation] = useState('ST-07');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoDone, setDemoDone] = useState(false);

  // Tracks which alert ids have already been seen
  const knownAlertIds = useRef<Set<string> | null>(null);
  const [freshAlertIds, setFreshAlertIds] = useState<Set<string>>(new Set());

  const flagFreshAlerts = useCallback((list: Alert[]) => {
    const ids = new Set(list.map((a) => a.id));
    if (knownAlertIds.current === null) {
      knownAlertIds.current = ids;
      return;
    }
    const newOnes = [...ids].filter((id) => !knownAlertIds.current!.has(id));
    if (newOnes.length === 0) return;
    newOnes.forEach((id) => knownAlertIds.current!.add(id));
    setFreshAlertIds((prev) => new Set([...prev, ...newOnes]));

    // Sound alert on new critical alert
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // AudioContext unavailable or blocked
    }

    setTimeout(() => {
      setFreshAlertIds((prev) => {
        const next = new Set(prev);
        newOnes.forEach((id) => next.delete(id));
        return next;
      });
    }, 2500);
  }, []);

  const stations = api.getStations();

  const loadAll = useCallback(async () => {
    try {
      const [m, a, act, risk, tr] = await Promise.all([
        api.getMetrics(),
        api.getAlerts(),
        api.getActivity(),
        api.getStationRisk(),
        api.getTrend(selectedStation),
      ]);
      setMetrics(m);
      const openAlerts = a.filter((al) => al.state !== 'RESOLVED');
      flagFreshAlerts(openAlerts);
      setAlerts(openAlerts);
      setActivity(act);
      setStationRisk(risk);
      setTrend(tr);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedStation, flagFreshAlerts]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const [m, a] = await Promise.all([api.getMetrics(), api.getAlerts()]);
      setMetrics(m);
      const openAlerts = a.filter((al) => al.state !== 'RESOLVED');
      flagFreshAlerts(openAlerts);
      setAlerts(openAlerts);
    }, 5000);
    return () => clearInterval(interval);
  }, [flagFreshAlerts]);

  useEffect(() => {
    api.getTrend(selectedStation).then(setTrend).catch(() => {});
  }, [selectedStation]);

  const runDemo = async () => {
    setDemoRunning(true);
    setDemoDone(false);
    await api.runDemoScenario();
    setDemoRunning(false);
    setDemoDone(true);
    await loadAll();
    setTimeout(() => setDemoDone(false), 5000);
  };

  const handleExportAlertsCSV = () => {
    if (!alerts.length) return;
    exportToCSV('Active_Alerts_Report', alerts);
  };

  const handleExportSummaryJSON = () => {
    exportToJSON('Defect_Analytics_Summary', {
      metrics,
      activeAlerts: alerts,
      stationRisk,
      exportedAt: new Date().toISOString(),
    });
  };

  const summaryCards = [
    { key: 'openAlerts', value: metrics?.openAlerts, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', link: '/alerts' },
    { key: 'systemicPatternsToday', value: metrics?.systemicPatternsToday, icon: TrendingDown, color: 'text-orange-600 dark:text-orange-400', link: '/alerts' },
    { key: 'affectedUnits', value: metrics?.affectedUnits, icon: Package, color: 'text-amber-600 dark:text-amber-400', link: '/alerts' },
    { key: 'unresolvedTickets', value: metrics?.unresolvedTickets, icon: Ticket, color: 'text-blue-600 dark:text-blue-400', link: '/audit' },
  ];

  const trendCodes = trend.length > 0 ? Object.keys(trend[0]).filter((k) => k !== 'timestamp' && k !== 'label') : [];
  const lineColors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#10b981'];
  const currentThreshold = stationRisk.find((s) => s.stationId === selectedStation)?.threshold ?? 3;

  return (
    <Layout title={t('dashboard.title')}>
      <div className="space-y-4">
        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 p-3 rounded-lg border border-steel-200 dark:bg-steel-800/70 dark:border-steel-700 shadow-sm">
          <div className="flex items-center gap-3">
            <Button onClick={runDemo} disabled={demoRunning} className={demoRunning ? 'animate-pulse' : ''}>
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {demoRunning ? t('dashboard.demoRunning') : t('dashboard.runDemo')}
              </span>
            </Button>
            {demoDone && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {t('dashboard.demoDone')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportAlertsCSV} disabled={!alerts.length}>
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
                Export CSV
              </span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportSummaryJSON}>
              <span className="flex items-center gap-1.5">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Export JSON
              </span>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.key}
                    onClick={() => navigate(card.link)}
                    className="group text-left focus:outline-none focus:ring-2 focus:ring-brass-500 rounded-lg"
                  >
                    <Card className="transition-all group-hover:shadow-card-hover group-hover:-translate-y-0.5">
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-steel-500 dark:text-steel-400">
                            {t(`dashboard.${card.key}`)}
                          </span>
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-steel-100 dark:bg-steel-700/50`}>
                            <Icon className={`h-4 w-4 ${card.color}`} />
                          </div>
                        </div>
                        <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-steel-800 dark:text-steel-100">
                          {card.value ?? 0}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-steel-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {t('common.viewDetails')}
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      </CardBody>
                    </Card>
                  </button>
                );
              })}
        </div>

        {error && <ErrorState message={t('common.error')} onRetry={loadAll} />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Active Alerts */}
          <Card className="lg:col-span-2">
            <CardHeader title={t('dashboard.activeAlerts')} action={<span className="text-xs text-steel-400">{alerts.length}</span>} />
            {loading ? (
              <TableSkeleton rows={3} cols={7} />
            ) : alerts.length === 0 ? (
              <EmptyState message={t('dashboard.noActiveAlerts')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-steel-200 bg-steel-50 dark:border-steel-700 dark:bg-steel-800/50">
                    <tr className="text-left text-xs text-steel-500 dark:text-steel-400">
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
                        className={`relative cursor-pointer border-l-[3px] transition-colors hover:bg-steel-50 dark:hover:bg-steel-700/30 ${severityLeftBorderClass(a.severity)} ${
                          freshAlertIds.has(a.id) ? 'animate-signal-sweep' : ''
                        }`}
                      >
                        <td className="px-3 py-2"><SeverityBadge severity={a.severity} /></td>
                        <td className="px-3 py-2 font-mono text-xs text-steel-700 dark:text-steel-300">{a.stationId}</td>
                        <td className="px-3 py-2 font-mono text-xs text-steel-700 dark:text-steel-300">{a.defectCode}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-xs text-steel-700 dark:text-steel-300">{a.count} / {a.threshold}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-xs text-steel-500 dark:text-steel-400">{formatTimeShort(a.firstOccurrence)}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-xs text-steel-500 dark:text-steel-400">{formatTimeShort(a.latestOccurrence)}</td>
                        <td className="px-3 py-2"><StateBadge state={a.state} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Station Risk */}
          <Card>
            <CardHeader title={t('dashboard.stationRisk')} />
            <CardBody>
              {loading ? (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {stationRisk.map((s) => {
                    const isCritical = s.count >= s.threshold;
                    const isAtRisk = s.count >= s.threshold - 1 && s.count < s.threshold;
                    const fillPct = Math.min(100, Math.round((s.count / s.threshold) * 100));
                    const bg = isCritical
                      ? 'bg-red-50 border-red-300 dark:bg-red-950/50 dark:border-red-800'
                      : isAtRisk
                        ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/50 dark:border-amber-800'
                        : 'bg-steel-50 border-steel-200 dark:bg-steel-700/50 dark:border-steel-600';
                    const text = isCritical
                      ? 'text-red-700 dark:text-red-300'
                      : isAtRisk
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-steel-600 dark:text-steel-400';
                    const fillColor = isCritical ? 'bg-red-500' : isAtRisk ? 'bg-amber-500' : 'bg-steel-400';
                    return (
                      <button
                        key={s.stationId}
                        onClick={() => setSelectedStation(s.stationId)}
                        className={`overflow-hidden rounded-lg border p-2.5 text-center transition-all hover:shadow-card-hover hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brass-500 ${bg} ${
                          selectedStation === s.stationId ? 'ring-2 ring-brass-500 ring-offset-1 dark:ring-offset-steel-800' : ''
                        }`}
                      >
                        <p className="font-mono text-xs font-semibold text-steel-700 dark:text-steel-300">{s.stationId}</p>
                        <p className={`mt-1 text-xl font-bold tabular-nums ${text}`}>{s.count} / {s.threshold}</p>
                        {/* A small gauge-fill readout instead of just numbers -- shows how close to threshold this station is at a glance. */}
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-steel-200/70 dark:bg-steel-900/50" aria-hidden>
                          <div className={`h-full rounded-full transition-all ${fillColor}`} style={{ width: `${fillPct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Trend chart */}
          <Card>
            <CardHeader
              title={t('dashboard.trendChart')}
              action={
                <Select
                  value={selectedStation}
                  onChange={setSelectedStation}
                  options={stations.map((s) => ({ value: s.id, label: s.id }))}
                  className="w-28"
                />
              }
            />
            <CardBody>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : trend.length === 0 ? (
                <EmptyState message={t('common.empty')} />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#f1f5f9',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <ReferenceLine y={currentThreshold} stroke="#ef4444" strokeDasharray="5 5" label={{ value: t('dashboard.threshold'), fontSize: 10, fill: '#ef4444' }} />
                    {trendCodes.map((code, i) => (
                      <Line key={code} type="monotone" dataKey={code} stroke={lineColors[i % lineColors.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader title={t('dashboard.recentActivity')} />
            <CardBody>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : activity.length === 0 ? (
                <EmptyState message={t('dashboard.noActivity')} icon={<ActivityIcon className="h-8 w-8 text-steel-300 dark:text-steel-600" />} />
              ) : (
                <ul className="space-y-2">
                  {activity.map((ev) => (
                    <li key={ev.id} className="flex items-center gap-3 text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-steel-100 dark:bg-steel-700">
                        <ActivityIcon className="h-3.5 w-3.5 text-steel-500 dark:text-steel-400" />
                      </span>
                      <span className="flex-1 text-steel-700 dark:text-steel-300">{ev.message}</span>
                      <span className="font-mono tabular-nums text-xs text-steel-400">{formatTime(ev.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
