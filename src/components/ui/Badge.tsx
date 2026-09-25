import { AlertTriangle, ArrowUpCircle, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';
import type { Severity, AlertState, Classification } from '@/types';
import { useI18n } from '@/i18n';

const sevConfig: Record<Severity, { bg: string; text: string; border: string; icon: typeof AlertTriangle; ring: string; bar: string; leftBorder: string }> = {
  CRITICAL: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-800', icon: AlertTriangle, ring: 'ring-red-200 dark:ring-red-800/50', bar: 'bg-red-500', leftBorder: 'border-l-red-500' },
  HIGH: { bg: 'bg-orange-50 dark:bg-orange-950/50', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-800', icon: ArrowUpCircle, ring: 'ring-orange-200 dark:ring-orange-800/50', bar: 'bg-orange-500', leftBorder: 'border-l-orange-500' },
  MEDIUM: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800', icon: AlertCircle, ring: 'ring-amber-200 dark:ring-amber-800/50', bar: 'bg-amber-500', leftBorder: 'border-l-amber-500' },
  NORMAL: { bg: 'bg-green-50 dark:bg-green-950/50', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-800', icon: CheckCircle2, ring: 'ring-green-200 dark:ring-green-800/50', bar: 'bg-green-500', leftBorder: 'border-l-green-500' },
};

/** The left-edge "indicator light" bar used on table rows, matching a severity badge's hue. */
export function severityBarClass(severity: Severity): string {
  return sevConfig[severity].bar;
}

/** Same signal, as a left border color -- for rows where a solid bar element isn't practical. */
export function severityLeftBorderClass(severity: Severity): string {
  return sevConfig[severity].leftBorder;
}

const stateConfig: Record<AlertState, { bg: string; text: string; border: string; dot: string }> = {
  OPEN: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-800', dot: 'bg-red-500' },
  ACKNOWLEDGED: { bg: 'bg-orange-50 dark:bg-orange-950/50', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-800', dot: 'bg-orange-500' },
  INVESTIGATING: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800', dot: 'bg-amber-500' },
  CONTAINED: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800', dot: 'bg-brass-500' },
  RESOLVED: { bg: 'bg-green-50 dark:bg-green-950/50', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-800', dot: 'bg-green-500' },
};

const classConfig: Record<Classification, { bg: string; text: string; border: string; icon: typeof Info }> = {
  NORMAL: { bg: 'bg-green-50 dark:bg-green-950/50', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-800', icon: CheckCircle2 },
  KNOWN: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800', icon: Info },
  UNKNOWN: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800', icon: HelpCircle },
  SYSTEMIC: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-800', icon: AlertTriangle },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { t } = useI18n();
  const c = sevConfig[severity];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {t(`severity.${severity}`)}
    </span>
  );
}

export function StateBadge({ state }: { state: AlertState }) {
  const { t } = useI18n();
  const c = stateConfig[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text} ${c.border}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} aria-hidden />
      {t(`state.${state}`)}
    </span>
  );
}

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const { t } = useI18n();
  const c = classConfig[classification];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {t(`classification.${classification}`)}
    </span>
  );
}
