import { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, ThumbsUp, ShieldAlert, Wrench, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { TextInput, Button } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import type { KnownFix } from '@/types';

export function KnowledgeBasePage() {
  const { t } = useI18n();
  const [fixes, setFixes] = useState<KnownFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<KnownFix | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getAllKnownFixes();
      setFixes(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = fixes.filter(
    (f) =>
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.probableCause.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Layout title={t('kb.title')}>
      <p className="mb-4 text-sm text-steel-500 dark:text-steel-400">{t('kb.subtitle')}</p>

      <div className="mb-4">
        <TextInput
          id="kbSearch"
          value={search}
          onChange={setSearch}
          placeholder={t('kb.searchPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* List */}
        <Card>
          <CardHeader title={`${t('kb.title')} (${filtered.length})`} />
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : error ? (
            <ErrorState message={t('common.error')} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState message={t('kb.empty')} icon={<BookOpen className="h-8 w-8 text-steel-300 dark:text-steel-600" />} />
          ) : (
            <ul className="divide-y divide-steel-100 dark:divide-steel-700/50">
              {filtered.map((f) => (
                <li key={f.code}>
                  <button
                    onClick={() => setSelected(f)}
                    className={`block w-full border-l-[3px] px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-brass-500 ${
                      selected?.code === f.code
                        ? 'border-brass-500 bg-brass-50 dark:bg-brass-900/20'
                        : 'border-transparent hover:bg-steel-50 dark:hover:bg-steel-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-semibold text-steel-700 dark:text-steel-300">{f.code}</span>
                        <p className="mt-0.5 text-xs text-steel-500 dark:text-steel-400">{f.title}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-steel-400">
                        <ThumbsUp className="h-3 w-3" />
                        {f.helpfulCount}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Detail */}
        <Card>
          <CardHeader title={selected ? selected.code : t('kb.viewFix')} />
          <CardBody>
            {!selected ? (
              <EmptyState message={t('kb.viewFix')} icon={<BookOpen className="h-8 w-8 text-steel-300 dark:text-steel-600" />} />
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-steel-800 dark:text-steel-100">{selected.title}</h3>
                  <p className="mt-1 font-mono text-xs text-steel-500 dark:text-steel-400">{selected.code}</p>
                </div>

                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-steel-500 dark:text-steel-400">
                    <Search className="h-3 w-3" />
                    {t('kb.probableCause')}
                  </p>
                  <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{selected.probableCause}</p>
                </div>

                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-steel-500 dark:text-steel-400">
                    <Wrench className="h-3 w-3" />
                    {t('kb.documentedFix')}
                  </p>
                  <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{selected.documentedFix}</p>
                </div>

                <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
                    <ShieldAlert className="h-3 w-3" />
                    {t('kb.safetyNote')}
                  </p>
                  <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">{selected.safetyNote}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-steel-200 pt-3 dark:border-steel-700">
                  <span className="flex items-center gap-1.5 text-xs text-steel-500 dark:text-steel-400">
                    <User className="h-3 w-3" />
                    {t('common.owner')}: <span className="font-medium text-steel-700 dark:text-steel-300">{selected.owner}</span>
                  </span>
                  <span className="text-xs text-steel-500 dark:text-steel-400">
                    {t('kb.lastReviewed')}: <span className="font-mono tabular-nums text-steel-700 dark:text-steel-300">{selected.lastReviewed}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-steel-500 dark:text-steel-400">
                    <ThumbsUp className="h-3 w-3" />
                    {t('kb.helpfulCount')} <span className="font-mono tabular-nums font-medium text-steel-700 dark:text-steel-300">{selected.helpfulCount}</span> {t('kb.times')}
                  </span>
                </div>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    const updated = await api.markFixHelpful(selected.code);
                    if (updated) {
                      setSelected(updated);
                      setFixes((prev) => prev.map((f) => (f.code === updated.code ? updated : f)));
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    {t('logDefect.result.known.fixHelped')}
                  </span>
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}
