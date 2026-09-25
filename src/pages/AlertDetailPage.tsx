import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, BookOpen, ImageIcon, ArrowRight, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { SeverityBadge, StateBadge } from '@/components/ui/Badge';
import { Button, TextArea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useApp } from '@/context/AppContext';
import { formatTime } from '@/utils/format';
import type { Alert, AlertState, AlertHistoryEntry, Defect, KnownFix } from '@/types';

const STATE_ORDER: AlertState[] = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'];
const NEXT_STATE: Record<AlertState, AlertState | null> = {
  OPEN: 'ACKNOWLEDGED',
  ACKNOWLEDGED: 'INVESTIGATING',
  INVESTIGATING: 'CONTAINED',
  CONTAINED: 'RESOLVED',
  RESOLVED: null,
};

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { currentUser } = useApp();
  const navigate = useNavigate();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [evidence, setEvidence] = useState<Defect[]>([]);
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [knownFix, setKnownFix] = useState<KnownFix | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [transitionModal, setTransitionModal] = useState<{ target: AlertState } | null>(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const [containment, setContainment] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [savingNcr, setSavingNcr] = useState(false);
  const [ncrSaved, setNcrSaved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [a, ev, hist] = await Promise.all([
        api.getAlert(id),
        api.getEvidence(id),
        api.getHistory(id),
      ]);
      if (!a) {
        setError(true);
        setLoading(false);
        return;
      }
      setAlert(a);
      setEvidence(ev);
      setHistory(hist);
      setContainment(a.containment ?? '');
      setCorrectiveAction(a.correctiveAction ?? '');
      const kf = await api.getKnownFix(a.defectCode);
      setKnownFix(kf ?? null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doTransition = async () => {
    if (!transitionModal || !alert) return;
    setTransitioning(true);
    try {
      let updated: Alert | undefined;
      if (transitionModal.target === 'ACKNOWLEDGED' && alert.state === 'OPEN') {
        updated = await api.acknowledgeAlert(alert.id, currentUser, transitionNote);
      } else {
        updated = await api.transitionAlert(alert.id, transitionModal.target, currentUser, transitionNote);
      }
      if (updated) setAlert(updated);
      setTransitionModal(null);
      setTransitionNote('');
      const hist = await api.getHistory(alert.id);
      setHistory(hist);
    } catch {
      setError(true);
    } finally {
      setTransitioning(false);
    }
  };

  const saveNcr = async () => {
    if (!alert) return;
    setSavingNcr(true);
    try {
      const updated = await api.updateNcr(alert.id, containment, correctiveAction);
      if (updated) setAlert(updated);
      setNcrSaved(true);
      setTimeout(() => setNcrSaved(false), 3000);
    } catch {
      setError(true);
    } finally {
      setSavingNcr(false);
    }
  };

  if (loading) {
    return (
      <Layout title={t('alertDetail.title')}>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !alert) {
    return (
      <Layout title={t('alertDetail.title')}>
        <ErrorState message={t('alertDetail.notFound')} onRetry={() => navigate('/alerts')} />
      </Layout>
    );
  }

  const currentStateIndex = STATE_ORDER.indexOf(alert.state);
  const nextState = NEXT_STATE[alert.state];
  const triggerDefect = evidence[evidence.length - 1];

  return (
    <Layout title={t('alertDetail.title')}>
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardBody className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <SeverityBadge severity={alert.severity} />
              <StateBadge state={alert.state} />
              <span className="font-mono text-sm font-semibold text-steel-700 dark:text-steel-300">{alert.id}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-steel-600 dark:text-steel-400">
              <span><strong className="text-steel-500">{t('common.station')}:</strong> <span className="font-mono">{alert.stationId}</span></span>
              <span><strong className="text-steel-500">{t('common.code')}:</strong> <span className="font-mono">{alert.defectCode}</span></span>
              {alert.ticketId && <span><strong className="text-steel-500">Ticket:</strong> <span className="font-mono">{alert.ticketId}</span></span>}
              {alert.ncrId && <span><strong className="text-steel-500">NCR:</strong> <span className="font-mono">{alert.ncrId}</span></span>}
            </div>
          </CardBody>
        </Card>

        {/* Why this alert fired */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-300">{t('alertDetail.whyFired')}</h3>
            <p className="text-sm text-steel-700 dark:text-steel-300">
              {t('alertDetail.whyFiredText', {
                threshold: alert.threshold,
                window: alert.windowMinutes,
                version: alert.ruleVersion,
                trigger: triggerDefect?.id ?? alert.id,
              })}
            </p>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Evidence timeline */}
          <Card>
            <CardHeader title={t('alertDetail.evidenceTimeline')} />
            <CardBody>
              {evidence.length === 0 ? (
                <EmptyState message={t('alertDetail.noEvidence')} />
              ) : (
                <ol className="relative space-y-4 border-l border-steel-200 pl-4 dark:border-steel-700">
                  {evidence.map((d) => (
                    <li key={d.id} className="relative">
                      <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-steel-400 dark:border-steel-800" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-steel-700 dark:text-steel-300">{d.serialNumber}</span>
                          <span className="font-mono tabular-nums text-xs text-steel-400">{formatTime(d.occurredAt)}</span>
                        </div>
                        <p className="text-xs text-steel-600 dark:text-steel-400">{d.description}</p>
                        <p className="text-xs text-steel-400">{t('common.actor')}: {d.loggedBy}</p>
                        {d.photoDataUrl && (
                          <button
                            onClick={() => setPhotoModal(d.photoDataUrl!)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <ImageIcon className="h-3 w-3" />
                            Photo
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {/* Known fix */}
          <Card>
            <CardHeader title={t('alertDetail.knownFix')} action={<BookOpen className="h-4 w-4 text-steel-400" />} />
            <CardBody>
              {knownFix === undefined ? (
                <Skeleton className="h-20 w-full" />
              ) : knownFix === null ? (
                <EmptyState message={t('alertDetail.noKnownFix')} />
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('kb.probableCause')}</p>
                    <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{knownFix.probableCause}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('kb.documentedFix')}</p>
                    <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{knownFix.documentedFix}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('kb.safetyNote')}</p>
                    <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">{knownFix.safetyNote}</p>
                  </div>
                  <p className="text-xs text-steel-400">{t('common.owner')}: {knownFix.owner}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Lifecycle stepper */}
        <Card>
          <CardHeader title={t('alertDetail.lifecycle')} />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {STATE_ORDER.map((s, i) => {
                const isDone = i < currentStateIndex;
                const isCurrent = i === currentStateIndex;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${
                        isCurrent
                          ? 'border-brass-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : isDone
                            ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300'
                            : 'border-steel-200 text-steel-400 dark:border-steel-700 dark:text-steel-500'
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        isCurrent ? 'bg-blue-600 text-white' : isDone ? 'bg-green-600 text-white' : 'bg-steel-200 text-steel-500 dark:bg-steel-700'
                      }`}>
                        {i + 1}
                      </span>
                      {t(`state.${s}`)}
                    </div>
                    {i < STATE_ORDER.length - 1 && <ChevronRight className="h-3 w-3 text-steel-300 dark:text-steel-600" />}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              {nextState && (
                <Button onClick={() => setTransitionModal({ target: nextState })}>
                  <span className="flex items-center gap-2">
                    {t(`state.${nextState}`)}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              )}
              {alert.state === 'RESOLVED' && (
                <Button variant="secondary" onClick={() => navigate('/alerts')}>
                  {t('alertDetail.closeAlert')}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* NCR section */}
        {alert.ncrId && (
          <Card>
            <CardHeader title={t('alertDetail.ncrSection')} action={<span className="font-mono text-xs text-steel-400">{alert.ncrId}</span>} />
            <CardBody className="space-y-3">
              <TextArea
                id="containment"
                label={t('alertDetail.containment')}
                value={containment}
                onChange={setContainment}
                rows={2}
              />
              <TextArea
                id="correctiveAction"
                label={t('alertDetail.correctiveAction')}
                value={correctiveAction}
                onChange={setCorrectiveAction}
                rows={2}
              />
              <div className="flex items-center gap-3">
                <Button onClick={saveNcr} disabled={savingNcr}>{t('alertDetail.saveNcr')}</Button>
                {ncrSaved && <span className="text-sm text-green-600 dark:text-green-400">{t('settings.saved')}</span>}
                {alert.ncrStatus && (
                  <span className="ml-auto text-xs text-steel-500 dark:text-steel-400">
                    {t('common.status')}: <span className="font-medium">{alert.ncrStatus}</span>
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* History */}
        <Card>
          <CardHeader title={t('alertDetail.history')} />
          <CardBody>
            {history.length === 0 ? (
              <EmptyState message={t('alertDetail.noHistory')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-steel-200 text-left text-xs text-steel-500 dark:border-steel-700 dark:text-steel-400">
                    <tr>
                      <th className="py-2 pr-3 font-medium">{t('common.actor')}</th>
                      <th className="py-2 pr-3 font-medium">{t('common.time')}</th>
                      <th className="py-2 pr-3 font-medium">{t('alertDetail.lifecycle')}</th>
                      <th className="py-2 font-medium">{t('common.details')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100 dark:divide-steel-700/50">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="py-2 pr-3 text-steel-700 dark:text-steel-300">{h.actor}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums text-xs text-steel-500 dark:text-steel-400">{formatTime(h.timestamp)}</td>
                        <td className="py-2 pr-3">
                          <span className="font-mono text-xs text-steel-600 dark:text-steel-400">
                            {h.fromState !== '—' ? t(`state.${h.fromState}`) : '—'} → {t(`state.${h.toState}`)}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-steel-600 dark:text-steel-400">{h.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Transition modal */}
      <Modal
        open={!!transitionModal}
        onClose={() => setTransitionModal(null)}
        title={t('alertDetail.confirmTransition')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransitionModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={doTransition} disabled={transitioning || !transitionNote.trim()}>
              {t('alertDetail.confirmTransition')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-steel-600 dark:text-steel-400">
            <span className="font-medium">{t(`state.${alert.state}`)} → {transitionModal && t(`state.${transitionModal.target}`)}</span>
          </p>
          <TextArea
            id="transitionNote"
            label={t('alertDetail.transitionNote')}
            value={transitionNote}
            onChange={setTransitionNote}
            placeholder={t('alertDetail.transitionNotePlaceholder')}
            rows={3}
          />
        </div>
      </Modal>

      {/* Photo modal */}
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-steel-900/70 p-4" onClick={() => setPhotoModal(null)}>
          <img src={photoModal} alt="Defect photo" className="max-h-[80vh] max-w-full rounded-lg" />
          <button className="absolute right-4 top-4 rounded-full bg-white p-2 text-steel-700 hover:bg-steel-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </Layout>
  );
}
