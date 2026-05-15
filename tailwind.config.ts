import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cooked: {
          bg: "#14181c",
          accent: "#FF4D4D",
          glow: "#FF4500",
        },
        chill: {
          bg: "#FAF1E4",
          accent: "#2D9E8B",
        },
        unstable: {
          bg: "#FFFBF2",
          accent: "#D49E2D",
        },
        delusional: {
          bg: "#FFF5F2",
          accent: "#D45D2D",
        },
        lore: {
          ink: "#1a1a1a",
          muted: "#6b6b6b",
          soft: "#4d4d4d",
          accent: "#7C6AFF",
        },
        film: {
          dark: "#060604",
          card: "#0E0E0C",
          border: "rgba(255,255,255,0.06)",
        },
      },
      fontFamily: {
        // CSS vars from layout.tsx — must match exactly
        cinematic: ["var(--font-playfair)", "Georgia", "serif"],
        data:      ["var(--font-inter)",    "system-ui", "sans-serif"],
        vibe:      ["var(--font-syne)",     "system-ui", "sans-serif"],
        mono:      ["var(--font-dm-mono)",  "monospace"],
        sans:      ["var(--font-inter)",    "system-ui", "sans-serif"],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        floatA: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(3%, 5%) scale(1.08)' },
        },
        floatB: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(-4%, -3%) scale(1.06)' },
        },
        floatC: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(2%, -4%) scale(1.05)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%':  { transform: 'translate(-2%, -3%)' },
          '20%':  { transform: 'translate(3%, 2%)' },
          '30%':  { transform: 'translate(-1%, 3%)' },
          '40%':  { transform: 'translate(2%, -1%)' },
          '50%':  { transform: 'translate(-3%, 1%)' },
          '60%':  { transform: 'translate(1%, 3%)' },
          '70%':  { transform: 'translate(-2%, -1%)' },
          '80%':  { transform: 'translate(3%, -2%)' },
          '90%':  { transform: 'translate(-1%, 2%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        flicker: {
          '0%, 90%, 100%': { opacity: '1' },
          '91%':            { opacity: '0.5' },
          '92%':            { opacity: '1' },
          '94%':            { opacity: '0.15' },
          '95%':            { opacity: '1' },
        },
        'float-up': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        marquee:      'marquee 35s linear infinite',
        'fade-in':    'fade-in 0.8s ease-out forwards',
        'slide-up':   'slide-up 0.6s ease-out forwards',
        'slide-in':   'slide-in 0.5s ease-out forwards',
        'float-a':    'floatA 12s ease-in-out infinite',
        'float-b':    'floatB 14s ease-in-out infinite',
        'float-c':    'floatC 10s ease-in-out infinite',
        grain:        'grain 0.8s steps(1) infinite',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
        shimmer:      'shimmer 2s linear infinite',
        flicker:      'flicker 8s ease-in-out infinite',
        'float-up':   'float-up 5s ease-in-out infinite',
        scan:         'scan 6s linear infinite',
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0,0,0,0.5)',
        'glow-red':   '0 0 40px rgba(255,77,77,0.25)',
        'glow-teal':  '0 0 40px rgba(45,158,139,0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
