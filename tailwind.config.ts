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
        },
      },
      fontFamily: {
        // Semantic names → CSS vars set by next/font/google in layout.tsx
        cinematic: ["var(--font-lora)", "Georgia", "serif"],
        data: ["var(--font-inter)", "system-ui", "sans-serif"],
        vibe: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.5rem',
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
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'fade-in': 'fade-in 1s ease-out forwards',
        'slide-up': 'slide-up 0.8s ease-out forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
