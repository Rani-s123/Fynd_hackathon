/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // IBM Plex was designed for technical/enterprise instrumentation --
        // a deliberate fit for a factory-floor field-engineer tool, and a
        // clear step away from the generic Inter/system-ui default.
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Warm graphite-steel neutral scale -- replaces the default slate
        // everywhere in this app. Slightly warm undertone instead of cool
        // blue-grey, so panels read like a worked instrument, not a SaaS trial.
        steel: {
          50: '#f7f5f2',
          100: '#efece5',
          200: '#e1dcd2',
          300: '#c8c0b1',
          400: '#a39a89',
          500: '#7d7364',
          600: '#5c5449',
          700: '#443e35',
          800: '#2b2723',
          900: '#1c1a17',
          950: '#100f0d',
        },
        // The one deliberate accent: a muted bronze/brass, reserved for the
        // logo mark, the active nav rail, primary actions, and focus rings.
        // Chosen to sit clearly apart from the amber "MEDIUM severity"
        // signal so the two are never confused.
        brass: {
          50: '#faf6ee',
          100: '#f3e9d4',
          200: '#e5cd9d',
          300: '#d3ac6a',
          400: '#bd8c44',
          500: '#9c6b30',
          600: '#805528',
          700: '#654222',
          800: '#4c321c',
          900: '#372414',
        },
      },
      boxShadow: {
        // Flatter, hairline-led panel shadows -- deliberately not the
        // uniform soft-grey drop-shadow every SaaS card kit uses.
        card: '0 1px 2px 0 rgba(28,26,23,0.05)',
        'card-hover': '0 2px 6px -1px rgba(28,26,23,0.10)',
        dropdown: '0 6px 16px -4px rgba(28,26,23,0.18), 0 2px 6px -2px rgba(28,26,23,0.10)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        // The one orchestrated motion moment: a brief signal sweep across a
        // row/card when a new systemic alert actually appears, echoing an
        // indicator light catching your eye on a control panel.
        'signal-sweep': 'signalSweep 1600ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        signalSweep: {
          '0%': { boxShadow: '0 0 0 0 rgba(156,107,48,0.45)' },
          '60%': { boxShadow: '0 0 0 8px rgba(156,107,48,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(156,107,48,0)' },
        },
      },
    },
  },
  plugins: [],
};
