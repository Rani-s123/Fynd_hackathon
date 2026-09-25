import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Save, Info } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { TextInput, Button } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { api } from '@/api';
import { useI18n } from '@/i18n';

export function SettingsPage() {
  const { t } = useI18n();
  const [thresholdN, setThresholdN] = useState('3');
  const [windowT, setWindowT] = useState('30');
  const [ruleVersion, setRuleVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setThresholdN(String(s.thresholdN));
      setWindowT(String(s.windowT));
      setRuleVersion(s.ruleVersion);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const parsedThreshold = Number(thresholdN);
    const parsedWindow = Number(windowT);
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 1 || !Number.isInteger(parsedThreshold)) {
      setValidationError(t('settings.validation.threshold'));
      return;
    }
    if (!Number.isFinite(parsedWindow) || parsedWindow < 1) {
      setValidationError(t('settings.validation.window'));
      return;
    }
    setValidationError('');
    setSaving(true);
    try {
      await api.saveSettings(parsedThreshold, parsedWindow);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title={t('settings.title')}>
      <p className="mb-4 text-sm text-steel-500 dark:text-steel-400">{t('settings.subtitle')}</p>

      {loading ? (
        <Card><CardBody><Skeleton className="h-48 w-full max-w-md" /></CardBody></Card>
      ) : error ? (
        <Card><CardBody><ErrorState message={t('common.error')} onRetry={load} /></CardBody></Card>
      ) : (
        <div className="max-w-lg space-y-4">
          <Card>
            <CardHeader title={t('settings.title')} action={<SettingsIcon className="h-4 w-4 text-steel-400" />} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  id="thresholdN"
                  label={t('settings.thresholdN')}
                  type="number"
                  value={thresholdN}
                  onChange={setThresholdN}
                />
                <TextInput
                  id="windowT"
                  label={t('settings.windowT')}
                  type="number"
                  value={windowT}
                  onChange={setWindowT}
                />
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-300">{t('settings.ruleExplanation')}</p>
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      {t('settings.ruleVersion')}: <span className="font-mono font-semibold">{ruleVersion}</span>
                    </p>
                  </div>
                </div>
              </div>

              {validationError && <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>}

              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {t('settings.save')}
                  </span>
                </Button>
                {saved && <span className="text-sm text-green-600 dark:text-green-400">{t('settings.saved')}</span>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </Layout>
  );
}
