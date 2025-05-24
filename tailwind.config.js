/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#e0f2fe", // Light blue for file input button bg
          DEFAULT: "#0ea5e9", // Sky blue 500
          hover: "#0284c7", // Sky blue 600
        },
        secondary: "#64748b", // Slate 500
      },
      spacing: {
        section: "2rem", // For consistent spacing between sections
      },
      borderRadius: {
        container: "0.5rem", // Consistent border radius for containers
      },
    },
  },
  plugins: [],
};
