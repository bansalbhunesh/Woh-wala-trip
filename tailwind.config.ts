import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light theme tokens (resolved from CSS vars in globals.css)
        bg: 'var(--bg)',
        surface: 'var(--bg-surface)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        // Named palettes — still available for documentary pages
        cooked: {
          bg: '#14181c',
          accent: '#FF4D4D',
          glow: '#FF4500',
        },
        chill: {
          bg: '#FAF1E4',
          accent: '#2D9E8B',
        },
        unstable: {
          bg: '#FFFBF2',
          accent: '#D49E2D',
        },
        delusional: {
          bg: '#FFF5F2',
          accent: '#D45D2D',
        },
        lore: {
          ink: '#1a1a1a',
          muted: '#6b6b6b',
          soft: '#4d4d4d',
          accent: '#7C6AFF',
        },
        film: {
          dark: '#060604',
          card: '#0E0E0C',
          border: 'rgba(255,255,255,0.06)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        // Legacy aliases — keep so documentary components don't break
        cinematic: ['var(--font-display)', 'Georgia', 'serif'],
        vibe: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        data: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translate3d(-40px,0,0)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)', filter: 'blur(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translate3d(40px,0,0)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)', filter: 'blur(0)' },
        },
        'slide-out-left': {
          '0%': { opacity: '1', transform: 'translate3d(0,0,0)' },
          '100%': { opacity: '0', transform: 'translate3d(-40px,0,0)', filter: 'blur(4px)' },
        },
        'slide-out-right': {
          '0%': { opacity: '1', transform: 'translate3d(0,0,0)' },
          '100%': { opacity: '0', transform: 'translate3d(40px,0,0)', filter: 'blur(4px)' },
        },
        'slam-up': {
          '0%': {
            opacity: '0',
            transform: 'translate3d(0,48px,0) scale(0.88)',
            filter: 'blur(10px)',
          },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0) scale(1)', filter: 'blur(0)' },
        },
        'zoom-in': {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(16px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
        'zoom-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)', filter: 'blur(4px)' },
        },
        shockwave: {
          '0%': {
            transform: 'scale(0.8)',
            opacity: '0.8',
            boxShadow: '0 0 0 0 rgba(255,77,77,0.6)',
          },
          '70%': { transform: 'scale(1)', opacity: '0', boxShadow: '0 0 0 40px rgba(255,77,77,0)' },
          '100%': { transform: 'scale(1)', opacity: '0', boxShadow: '0 0 0 0 rgba(255,77,77,0)' },
        },
        'ring-pulse': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'glow-pulse-red': {
          '0%,100%': { boxShadow: '0 0 4px rgba(255,77,77,0.4)' },
          '50%': { boxShadow: '0 0 16px rgba(255,77,77,0.9), 0 0 32px rgba(255,77,77,0.4)' },
        },
        'glow-pulse-teal': {
          '0%,100%': { boxShadow: '0 0 4px rgba(45,158,139,0.4)' },
          '50%': { boxShadow: '0 0 16px rgba(45,158,139,0.9), 0 0 32px rgba(45,158,139,0.4)' },
        },
        'number-reveal': {
          '0%': {
            opacity: '0',
            transform: 'translate3d(0,20px,0) scale(0.8)',
            filter: 'blur(8px)',
          },
          '60%': {
            opacity: '1',
            transform: 'translate3d(0,-4px,0) scale(1.05)',
            filter: 'blur(0)',
          },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0) scale(1)', filter: 'blur(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.7)', filter: 'blur(4px)' },
          '70%': { transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translate3d(0,12px,0)', filter: 'blur(3px)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)', filter: 'blur(0)' },
        },
        'text-wipe': {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0% 0 0)' },
        },
        'float-horizontal': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(6px,0,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        floatA: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(3%, 5%) scale(1.06)' },
        },
        floatB: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-4%, -3%) scale(1.05)' },
        },
        floatC: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(2%, -4%) scale(1.04)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-2%, -3%)' },
          '20%': { transform: 'translate(3%, 2%)' },
          '30%': { transform: 'translate(-1%, 3%)' },
          '40%': { transform: 'translate(2%, -1%)' },
          '50%': { transform: 'translate(-3%, 1%)' },
          '60%': { transform: 'translate(1%, 3%)' },
          '70%': { transform: 'translate(-2%, -1%)' },
          '80%': { transform: 'translate(3%, -2%)' },
          '90%': { transform: 'translate(-1%, 2%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        flicker: {
          '0%, 90%, 100%': { opacity: '1' },
          '91%': { opacity: '0.5' },
          '92%': { opacity: '1' },
          '94%': { opacity: '0.15' },
          '95%': { opacity: '1' },
        },
        'float-up': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'card-in': {
          '0%': { opacity: '0', transform: 'translateY(16px) rotate(var(--r, 0deg))' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(var(--r, 0deg))' },
        },
        'blob-float': {
          '0%, 100%': { transform: 'scale(1) translate(0, 0)' },
          '33%': { transform: 'scale(1.08) translate(2%, -3%)' },
          '66%': { transform: 'scale(0.96) translate(-2%, 2%)' },
        },
      },
      animation: {
        // Ticker — 28s feels right at any viewport width
        marquee: 'marquee 28s linear infinite',
        'marquee-slow': 'marquee 48s linear infinite',
        // Entrances
        'fade-in': 'fade-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in-slow': 'fade-in 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up': 'slide-up 0.55s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in': 'slide-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-left': 'slide-in-left 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-out-left': 'slide-out-left 0.35s cubic-bezier(0.4,0,1,1) forwards',
        'slide-out-right': 'slide-out-right 0.35s cubic-bezier(0.4,0,1,1) forwards',
        'slam-up': 'slam-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'zoom-in': 'zoom-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'zoom-out': 'zoom-out 0.3s cubic-bezier(0.4,0,1,1) forwards',
        'page-enter': 'page-enter 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'number-reveal': 'number-reveal 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'pop-in': 'pop-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'text-wipe': 'text-wipe 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        // Continuous
        shockwave: 'shockwave 1.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'ring-pulse': 'ring-pulse 1.5s ease-out infinite',
        'glow-pulse-red': 'glow-pulse-red 2s ease-in-out infinite',
        'glow-pulse-teal': 'glow-pulse-teal 2s ease-in-out infinite',
        'float-a': 'floatA 14s ease-in-out infinite',
        'float-b': 'floatB 16s ease-in-out infinite',
        'float-c': 'floatC 12s ease-in-out infinite',
        'float-up': 'float-up 5s ease-in-out infinite',
        'float-horizontal': 'float-horizontal 6s ease-in-out infinite',
        grain: 'grain 1.2s steps(3) infinite',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        flicker: 'flicker 8s ease-in-out infinite',
        scan: 'scan 6s linear infinite',
        'card-in': 'card-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'blob-float': 'blob-float 12s ease-in-out infinite',
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0,0,0,0.12)',
        card: '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        'glow-red': '0 0 40px rgba(255,77,77,0.25)',
        'glow-teal': '0 0 40px rgba(45,158,139,0.2)',
        'inset-sm': 'inset 0 1px 2px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
