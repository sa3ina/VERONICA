import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Orbitron', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#f0ffe6',
          100: '#e1ffcc',
          200: '#ccff99',
          300: '#d9ff4d',
          400: '#ccff00', // Primary neon yellow/green
          500: '#bfff00',
          600: '#a3d900',
          700: '#7aa300',
          800: '#526d00',
          900: '#293600'
        },
        neon: {
          yellow: '#ccff00',
          green: '#bfff00',
          purple: '#8b5cf6',
          cyan: '#00ddff',
          pink: '#ff3366',
          orange: '#ffaa00'
        },
        midnight: {
          900: '#0a0a0f', // Deepest black
          800: '#111118',
          700: '#16161f',
          600: '#1e1e28',
          500: '#2a2a3a'
        },
        app: {
          bg: 'var(--bg)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          surface: 'var(--surface)',
          border: 'var(--border)'
        }
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.04), 0 10px 28px rgba(0,0,0,0.4)',
        elevated: '0 1px 0 rgba(255,255,255,0.05), 0 18px 42px rgba(0,0,0,0.5)',
        floating: '0 1px 0 rgba(255,255,255,0.06), 0 26px 60px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(204,255,0,0.2), 0 18px 80px rgba(204,255,0,0.15)',
        'neon-sm': '0 0 10px rgba(204,255,0,0.3)',
        'neon-md': '0 0 20px rgba(204,255,0,0.4)',
        'neon-lg': '0 0 40px rgba(204,255,0,0.5)',
        'purple-glow': '0 0 20px rgba(139,92,246,0.3)'
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.05rem',
        '3xl': '1.35rem'
      },
      backgroundImage: {
        'hero-grid': 'radial-gradient(circle at top, rgba(204,255,0,0.15), transparent 30%), linear-gradient(180deg, #0a0a0f 0%, #07070a 100%)',
        'midnight-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #16161f 100%)',
        'neon-glow': 'radial-gradient(ellipse at center, rgba(204,255,0,0.15) 0%, transparent 70%)'
      }
    }
  },
  plugins: []
};

export default config;
