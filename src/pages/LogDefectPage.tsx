import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Info, HelpCircle, AlertTriangle, Upload, X, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Select, TextInput, TextArea, Button } from '@/components/ui/Form';
import { ClassificationBadge } from '@/components/ui/Badge';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useApp } from '@/context/AppContext';
import { toDateTimeLocal, fromDateTimeLocal } from '@/utils/format';
import type { DefectSubmitResponse } from '@/types';

export function LogDefectPage() {
  const { t } = useI18n();
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const stations = api.getStations();
  const products = api.getProducts();
  const knownCodes = api.getDefectCodes();

  const [stationId, setStationId] = useState('');
  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [defectCode, setDefectCode] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [codeDropdownOpen, setCodeDropdownOpen] = useState(false);
  const [newCodeMode, setNewCodeMode] = useState(false);
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoName, setPhotoName] = useState('');
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal(new Date().toISOString()));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DefectSubmitResponse | null>(null);

  const filteredCodes = knownCodes.filter(
    (c) =>
      c.code.toLowerCase().includes(codeSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(codeSearch.toLowerCase()),
  );

  const handlePhoto = (file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors((e) => ({ ...e, photo: t('logDefect.validation.photoType') }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: t('logDefect.validation.photoSize') }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
    setErrors((e) => ({ ...e, photo: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!stationId) e.stationId = t('logDefect.validation.station');
    if (!productId) e.productId = t('logDefect.validation.product');
    if (!serialNumber.trim()) e.serialNumber = t('logDefect.validation.serial');
    if (!defectCode.trim()) e.defectCode = t('logDefect.validation.code');
    if (!description.trim()) e.description = t('logDefect.validation.description');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.logDefect({
        stationId,
        productId,
        serialNumber: serialNumber.trim(),
        defectCode: defectCode.trim(),
        description: description.trim(),
        photoDataUrl,
        occurredAt: fromDateTimeLocal(occurredAt),
        actor: currentUser,
      });
      setResult(res);
    } catch {
      setErrors((e) => ({ ...e, submit: t('common.error') }));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setStationId('');
    setProductId('');
    setSerialNumber('');
    setDefectCode('');
    setCodeSearch('');
    setDescription('');
    setPhotoDataUrl(undefined);
    setPhotoName('');
    setOccurredAt(toDateTimeLocal(new Date().toISOString()));
    setErrors({});
    setNewCodeMode(false);
  };

  if (result) {
    return (
      <Layout title={t('logDefect.title')}>
        <ResultCard result={result} onReset={reset} onNavigate={navigate} t={t} />
      </Layout>
    );
  }

  return (
    <Layout title={t('logDefect.title')}>
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-sm text-steel-500 dark:text-steel-400">{t('logDefect.subtitle')}</p>
        <Card>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="station"
                label={t('logDefect.station')}
                value={stationId}
                onChange={setStationId}
                options={stations.map((s) => ({ value: s.id, label: `${s.id} — ${s.name}` }))}
                placeholder={t('logDefect.stationPlaceholder')}
                error={errors.stationId}
              />
              <Select
                id="product"
                label={t('logDefect.product')}
                value={productId}
                onChange={setProductId}
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                placeholder={t('logDefect.productPlaceholder')}
                error={errors.productId}
              />
            </div>

            <TextInput
              id="serial"
              label={t('logDefect.serial')}
              value={serialNumber}
              onChange={setSerialNumber}
              placeholder={t('logDefect.serialPlaceholder')}
              error={errors.serialNumber}
              monospace
            />

            {/* Searchable defect code select */}
            <div>
              <label htmlFor="defectCode" className="mb-1 block text-sm font-medium text-steel-700 dark:text-steel-300">
                {t('logDefect.defectCode')}
              </label>
              {!newCodeMode ? (
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={codeSearch}
                        onChange={(e) => {
                          setCodeSearch(e.target.value);
                          setCodeDropdownOpen(true);
                        }}
                        onFocus={() => setCodeDropdownOpen(true)}
                        placeholder={t('logDefect.defectCodePlaceholder')}
                        className="w-full rounded-md border border-steel-300 bg-white px-3 py-2 pr-8 text-sm font-mono text-steel-800 focus:outline-none focus:ring-2 focus:ring-brass-500 dark:border-steel-600 dark:bg-steel-800 dark:text-steel-100"
                      />
                      <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-steel-400" />
                      {defectCode && (
                        <span className="absolute right-8 top-2 text-xs font-medium text-green-600 dark:text-green-400">
                          {defectCode}
                        </span>
                      )}
                    </div>
                    <Button variant="secondary" onClick={() => { setNewCodeMode(true); setCodeDropdownOpen(false); }}>
                      {t('logDefect.defectCodeAddNew')}
                    </Button>
                  </div>
                  {codeDropdownOpen && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-steel-200 bg-white shadow-lg dark:border-steel-700 dark:bg-steel-800">
                      {filteredCodes.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-steel-400">No codes found</p>
                      ) : (
                        filteredCodes.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setDefectCode(c.code);
                              setCodeSearch('');
                              setCodeDropdownOpen(false);
                              setErrors((e) => ({ ...e, defectCode: '' }));
                            }}
                            className="block w-full px-3 py-2 text-left hover:bg-steel-100 focus:outline-none dark:hover:bg-steel-700"
                          >
                            <span className="font-mono text-xs font-semibold text-steel-700 dark:text-steel-300">{c.code}</span>
                            <span className="ml-2 text-xs text-steel-500 dark:text-steel-400">{c.description}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <TextInput
                    id="newCode"
                    value={defectCode}
                    onChange={setDefectCode}
                    placeholder="NEW_CODE"
                    monospace
                    error={errors.defectCode}
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={() => { setNewCodeMode(false); setDefectCode(''); }}>
                    {t('common.cancel')}
                  </Button>
                </div>
              )}
              {errors.defectCode && !newCodeMode && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.defectCode}</p>}
            </div>

            <TextArea
              id="description"
              label={t('logDefect.description')}
              value={description}
              onChange={setDescription}
              placeholder={t('logDefect.descriptionPlaceholder')}
              error={errors.description}
              rows={4}
            />

            {/* Photo upload */}
            <div>
              <label className="mb-1 block text-sm font-medium text-steel-700 dark:text-steel-300">
                {t('logDefect.photo')}
              </label>
              {photoDataUrl ? (
                <div className="relative inline-block">
                  <img src={photoDataUrl} alt="Preview" className="max-h-40 rounded-md border border-steel-200 dark:border-steel-700" />
                  <button
                    onClick={() => { setPhotoDataUrl(undefined); setPhotoName(''); }}
                    className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-500"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="mt-1 text-xs text-steel-500">{photoName}</p>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed border-steel-300 py-6 text-steel-500 hover:border-steel-400 hover:bg-steel-50 focus:outline-none focus:ring-2 focus:ring-brass-500 dark:border-steel-600 dark:hover:bg-steel-700/30"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">{t('logDefect.photoUpload')}</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhoto(f);
                }}
              />
              {errors.photo && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.photo}</p>}
            </div>

            <TextInput
              id="occurredAt"
              label={t('logDefect.occurredAt')}
              type="datetime-local"
              value={occurredAt}
              onChange={setOccurredAt}
            />

            {errors.submit && <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>}

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? t('logDefect.submitting') : t('logDefect.submit')}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}

function ResultCard({
  result,
  onReset,
  onNavigate,
  t,
}: {
  result: DefectSubmitResponse;
  onReset: () => void;
  onNavigate: (path: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (result.duplicate) {
    return (
      <Card className="mx-auto max-w-2xl border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
        <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
          <HelpCircle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{t('logDefect.result.duplicate')}</p>
          <Button onClick={onReset}>{t('logDefect.logAnother')}</Button>
        </CardBody>
      </Card>
    );
  }

  const configs: Record<string, { bg: string; border: string; icon: typeof CheckCircle2; iconColor: string }> = {
    NORMAL: { bg: 'bg-green-50 dark:bg-green-950/50', border: 'border-green-300 dark:border-green-800', icon: CheckCircle2, iconColor: 'text-green-600 dark:text-green-400' },
    KNOWN: { bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-300 dark:border-blue-800', icon: Info, iconColor: 'text-blue-600 dark:text-blue-400' },
    UNKNOWN: { bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-300 dark:border-purple-800', icon: HelpCircle, iconColor: 'text-purple-600 dark:text-purple-400' },
    SYSTEMIC: { bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-300 dark:border-red-800', icon: AlertTriangle, iconColor: 'text-red-600 dark:text-red-400' },
  };
  const c = configs[result.classification];
  const Icon = c.icon;

  return (
    <Card className={`mx-auto max-w-2xl ${c.border} ${c.bg}`}>
      <CardBody className="space-y-4 py-6">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${c.iconColor}`} />
          <div>
            <ClassificationBadge classification={result.classification} />
            <h3 className="mt-1 text-base font-semibold text-steel-800 dark:text-steel-100">
              {result.classification === 'NORMAL' && t('logDefect.result.normal.title')}
              {result.classification === 'KNOWN' && t('logDefect.result.known.title')}
              {result.classification === 'UNKNOWN' && t('logDefect.result.unknown.title')}
              {result.classification === 'SYSTEMIC' && t('logDefect.result.systemic.title')}
            </h3>
          </div>
        </div>

        {result.classification === 'NORMAL' && (
          <p className="font-mono text-sm text-steel-600 dark:text-steel-400">
            {t('logDefect.result.normal.count', {
              count: result.occurrenceCount,
              threshold: result.windowThreshold ?? 3,
              window: result.windowMinutes,
            })}
          </p>
        )}

        {result.classification === 'KNOWN' && result.knownFix && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('logDefect.result.known.probableCause')}</p>
              <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{result.knownFix.probableCause}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('logDefect.result.known.documentedFix')}</p>
              <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{result.knownFix.documentedFix}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('logDefect.result.known.safetyNote')}</p>
              <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">{result.knownFix.safetyNote}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('common.owner')}</p>
              <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{result.knownFix.owner}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" onClick={async () => { await api.markFixHelpful(result.knownFix!.code); onReset(); }}>
                {t('logDefect.result.known.fixHelped')}
              </Button>
              <Button variant="danger" onClick={() => { if (result.ticketId) onNavigate(`/alerts`); onReset(); }}>
                {t('logDefect.result.known.escalate')}
              </Button>
            </div>
          </div>
        )}

        {result.classification === 'UNKNOWN' && result.ticketId && (
          <div className="space-y-3">
            <p className="font-mono text-sm font-semibold text-purple-700 dark:text-purple-300">{result.ticketId}</p>
            <Button variant="secondary" onClick={() => onNavigate('/alerts')}>
              {t('logDefect.result.unknown.viewTicket')}
            </Button>
          </div>
        )}

        {result.classification === 'SYSTEMIC' && (
          <div className="space-y-3">
            <p className="font-mono text-sm font-semibold text-red-700 dark:text-red-300">
              {t('logDefect.result.systemic.summary', {
                count: result.occurrenceCount,
                code: result.defectCode,
                station: result.stationId,
                window: result.windowMinutes,
              })}
            </p>
            {result.recommendedAction && (
              <div>
                <p className="text-xs font-semibold text-steel-500 dark:text-steel-400">{t('logDefect.result.systemic.recommendedAction')}</p>
                <p className="mt-1 text-sm text-steel-700 dark:text-steel-300">{result.recommendedAction}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {result.alertId && <Button variant="primary" onClick={() => onNavigate(`/alerts/${result.alertId}`)}>{t('logDefect.result.systemic.viewAlert')}</Button>}
              {result.ticketId && <Button variant="secondary" onClick={() => onNavigate('/alerts')}>{t('logDefect.result.systemic.viewTicket')}</Button>}
              {result.ncrId && <Button variant="secondary" onClick={() => result.alertId && onNavigate(`/alerts/${result.alertId}`)}>{t('logDefect.result.systemic.viewNcr')}</Button>}
            </div>
          </div>
        )}

        <div className="border-t border-steel-200 pt-3 dark:border-steel-700">
          <Button variant="ghost" onClick={onReset}>{t('logDefect.logAnother')}</Button>
        </div>
      </CardBody>
    </Card>
  );
}
