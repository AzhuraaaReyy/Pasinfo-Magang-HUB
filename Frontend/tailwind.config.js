/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/views/**/*.html", "./src/views/**/*.js", "./public/js/**/*.js"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        md: "1.5rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Roboto", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1D4ED8",
          alt: "#2563EB",
        },
        footer: "#0B132A",
      },
    },
  },
  plugins: [],
};
