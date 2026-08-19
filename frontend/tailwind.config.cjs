/** Soccer Beast design tokens — mirrors the approved design prototype 1:1. */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0A120E',
        bg1: '#0E1913',
        surface: '#132018',
        surface2: '#182A20',
        line: '#233529',
        lineSoft: '#1B2A21',
        text: '#F2F6F2',
        textDim: '#B6C6BA',
        textMute: '#7C9284',
        gold: '#E8B84B',
        goldDim: '#8A6C2C',
        diamond: '#63D9E6',
        win: '#3FB876',
        draw: '#8B9AA0',
        loss: '#E1594F',
      },
      fontFamily: {
        display: ['Anton', 'Vazirmatn', 'sans-serif'],
        body: ['Inter', 'Vazirmatn', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,.35)',
      },
    },
  },
  plugins: [
    // `rtl:` / `ltr:` variants, keyed off a `dir` attribute on an ancestor
    // (App.jsx sets this on the root wrapper). Used only for the handful of
    // things CSS logical properties can't express on their own — e.g.
    // mirroring a literal arrow glyph or a toggle-switch knob's travel
    // direction. Everything else (alignment, spacing, borders, absolute
    // positioning) uses Tailwind's built-in logical utilities (start/end,
    // ps/pe, ms/me, border-s/border-e) instead, since those don't need a
    // custom variant — they flip automatically off the `dir` attribute.
    function ({ addVariant }) {
      addVariant('rtl', '[dir="rtl"] &');
      addVariant('ltr', '[dir="ltr"] &');
    },
  ],
};
