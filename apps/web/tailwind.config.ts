import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // RR Kitchen brand palette (from the logo): terracotta primary,
        // deep green accent, warm cream backgrounds, dark brown text —
        // deliberately not a sterile/corporate blue-and-white food-app look.
        // 500/600 anchor exactly on the brand hex codes; other steps are
        // generated tints/shades at the same hue/saturation.
        cream: {
          50: "#FDF6EC",
          100: "#F8ECD9",
        },
        spice: {
          50: "hsl(20, 70%, 96%)",
          100: "hsl(20, 68%, 91%)",
          200: "hsl(20, 66%, 82%)",
          300: "hsl(20, 66%, 72%)",
          400: "hsl(20, 66%, 64%)",
          500: "#D97748",
          600: "hsl(20, 60%, 48%)",
          700: "hsl(20, 62%, 40%)",
          800: "hsl(20, 64%, 32%)",
          900: "hsl(20, 66%, 24%)",
        },
        leaf: {
          50: "hsl(138, 30%, 95%)",
          100: "hsl(138, 28%, 89%)",
          200: "hsl(138, 26%, 78%)",
          300: "hsl(138, 25%, 65%)",
          400: "hsl(138, 25%, 52%)",
          500: "hsl(138, 25%, 44%)",
          600: "#4A7C59",
          700: "hsl(138, 27%, 32%)",
          800: "hsl(138, 29%, 25%)",
          900: "hsl(138, 31%, 18%)",
        },
        charcoal: "#3E2723",
      },
      fontFamily: {
        display: ["var(--font-lora)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
