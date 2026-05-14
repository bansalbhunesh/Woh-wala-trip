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
        // WWT Design System - From the "Total 11" Study
        cooked: {
          bg: "#14181c", // Letterboxd Deep Blue-Black
          accent: "#FF4D4D",
          glow: "#FF4500",
        },
        chill: {
          bg: "#FAF1E4", // Unfold Warm Beige
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
        }
      },
      fontFamily: {
        cinematic: ["Lora", "serif"], // Storytelling/Nostalgia
        data: ["Inter", "sans-serif"], // Identity/Stats
        vibe: ["Space Grotesk", "sans-serif"], // Gen Z/Viral
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
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'fade-in': 'fade-in 1s ease-out forwards',
        'slide-up': 'slide-up 0.8s ease-out forwards',
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
};
export default config;
