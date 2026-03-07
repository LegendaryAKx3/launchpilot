import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Legacy brand colors (keep for compatibility)
        brand: {
          50: "#f0f7ff",
          100: "#d9ebff",
          200: "#bad8ff",
          300: "#8cbcff",
          400: "#5697ff",
          500: "#2f74f0",
          600: "#2057cc",
          700: "#1f48a5",
          800: "#1f3f82",
          900: "#1f376b"
        },
        // Semantic surface colors using CSS variables with RGB
        surface: {
          base: "rgb(var(--color-bg-base) / <alpha-value>)",
          subtle: "rgb(var(--color-bg-subtle) / <alpha-value>)",
          muted: "rgb(var(--color-bg-muted) / <alpha-value>)",
          elevated: "rgb(var(--color-bg-elevated) / <alpha-value>)",
          overlay: "rgb(var(--color-bg-overlay) / <alpha-value>)"
        },
        // Foreground colors
        fg: {
          primary: "rgb(var(--color-fg-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-fg-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-fg-muted) / <alpha-value>)",
          faint: "rgb(var(--color-fg-faint) / <alpha-value>)"
        },
        // Border/edge colors
        edge: {
          subtle: "rgb(var(--color-border-subtle) / <alpha-value>)",
          muted: "rgb(var(--color-border-muted) / <alpha-value>)",
          accent: "rgb(var(--color-border-accent) / <alpha-value>)"
        },
        // Accent system
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          hover: "rgb(var(--color-accent-hover) / <alpha-value>)",
          muted: "rgb(var(--color-accent-muted) / <alpha-value>)",
          subtle: "rgb(var(--color-accent) / 0.1)",
          glow: "rgb(var(--color-accent) / 0.4)"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Menlo", "monospace"]
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }]
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out both",
        "slide-down": "slide-down 0.3s ease-out both",
        "scale-in": "scale-in 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        skeleton: "skeleton-shimmer 1.5s ease-in-out infinite",
        spin: "spin 1s linear infinite"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(59, 130, 246, 0.4)" },
          "50%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)" }
        },
        "skeleton-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      backdropBlur: {
        xs: "2px"
      },
      transitionDuration: {
        "250": "250ms"
      }
    }
  },
  plugins: []
};

export default config;
