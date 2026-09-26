/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.js",
    "./screens/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  // Colors are NOT defined here — they live in theme/theme.js and are applied via useTheme(),
  // so light/dark switching works everywhere. Use Tailwind only for layout, spacing and type.
  theme: {
    extend: {},
  },
  plugins: [],
};