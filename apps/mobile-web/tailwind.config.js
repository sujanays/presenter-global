/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0c10",
        surface: "#1f2833",
        textMain: "#c5c6c7",
        textBright: "#ffffff",
        primary: "#66fcf1",
        secondary: "#45f3ff",
        accent: "#f75a68",
        success: "#00b37e",
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        neon: "0 0 15px rgba(102, 252, 241, 0.35)",
        neonSuccess: "0 0 15px rgba(0, 179, 126, 0.35)",
        neonAccent: "0 0 15px rgba(247, 90, 104, 0.35)",
      }
    },
  },
  plugins: [],
};
