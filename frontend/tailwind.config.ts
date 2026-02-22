import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        mutedSurface: "var(--surface-muted)",
        "surface-muted": "var(--surface-muted)",
        altSurface: "var(--surface-alt)",
        "surface-alt": "var(--surface-alt)",
        border: "var(--border)",
        borderStrong: "var(--border-strong)",
        "border-strong": "var(--border-strong)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        textMuted: "var(--text-muted)",
        brand: "var(--brand)",
        brandStrong: "var(--brand-strong)",
        brandSoft: "var(--brand-soft)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        infoSoft: "var(--info-soft)"
      },
      borderRadius: {
        md: "6px",
        lg: "10px",
        xl: "12px"
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
