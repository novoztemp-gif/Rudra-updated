/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Formal navy + muted brass palette — replaces the generic gray/black
        // default look with a distinct, professional brand identity that the
        // Reports charts also draw from (see src/utils/chartTheme.js).
        brand: {
          50: "#eef2f6",
          100: "#dbe3ec",
          200: "#b8c7d9",
          300: "#8fa4bf",
          400: "#5f7ea0",
          500: "#3f6082",
          600: "#2e4a68",
          700: "#223a54",
          800: "#172a3f",
          900: "#0e1b2c",
          950: "#081220",
        },
        accent: {
          50: "#fbf6ec",
          100: "#f3e7c9",
          200: "#e8d29d",
          300: "#dbb96b",
          400: "#c9a04a",
          500: "#b3873a",
          600: "#93702f",
          700: "#705526",
          800: "#4f3c1c",
        },
      },
    },
  },
  plugins: [],
}
