import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Lang } from '@/types';
import en from './en.json';
import te from './te.json';

const dicts: Record<Lang, Record<string, string>> = {
  en: en as Record<string, string>,
  te: te as Record<string, string>,
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = dicts[lang][key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
