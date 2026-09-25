import type { ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  label,
  id,
  error,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  id?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-steel-700 dark:text-steel-300">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-steel-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 dark:bg-steel-800 dark:text-steel-100 ${
          error
            ? 'border-red-400 focus:ring-red-500'
            : 'border-steel-300 focus:border-brass-500 focus:ring-brass-500/30 dark:border-steel-600'
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  label,
  id,
  placeholder,
  error,
  type = 'text',
  className = '',
  monospace = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  error?: string;
  type?: string;
  className?: string;
  monospace?: boolean;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-steel-700 dark:text-steel-300">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-steel-800 shadow-sm placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-offset-0 dark:bg-steel-800 dark:text-steel-100 dark:placeholder:text-steel-500 ${
          monospace ? 'font-mono tabular-nums' : ''
        } ${
          error
            ? 'border-red-400 focus:ring-red-500'
            : 'border-steel-300 focus:border-brass-500 focus:ring-brass-500/30 dark:border-steel-600'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function TextArea({
  value,
  onChange,
  label,
  id,
  placeholder,
  error,
  rows = 3,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  error?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-steel-700 dark:text-steel-300">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-steel-800 shadow-sm placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-offset-0 dark:bg-steel-800 dark:text-steel-100 dark:placeholder:text-steel-500 ${
          error
            ? 'border-red-400 focus:ring-red-500'
            : 'border-steel-300 focus:border-brass-500 focus:ring-brass-500/30 dark:border-steel-600'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-brass-600 text-white hover:bg-brass-700 active:scale-[0.98] dark:bg-brass-500 dark:hover:bg-brass-600 shadow-sm',
    secondary: 'border border-steel-300 text-steel-700 hover:bg-steel-50 active:scale-[0.98] dark:border-steel-600 dark:text-steel-300 dark:hover:bg-steel-700/50 shadow-sm',
    ghost: 'text-steel-600 hover:bg-steel-100 dark:text-steel-400 dark:hover:bg-steel-700/50',
    danger: 'bg-red-600 text-white hover:bg-red-500 active:scale-[0.98] shadow-sm',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brass-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
