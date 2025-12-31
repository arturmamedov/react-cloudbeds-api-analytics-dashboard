/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Nests Primary Colors
                'nests-teal': '#53CED1',        // Main brand color
                'nests-dark-teal': '#0D6F82',   // Secondary/emphasis

                // Nests Accent Colors
                'nests-green': '#53D195',       // Success states
                'nests-red': '#D15653',         // Errors/warnings
                'nests-yellow': '#E5B853',      // Warnings
                'nests-orange': '#E37C25',      // Special highlights
                'nests-lime': '#CED153',        // Additional accent
            },
            fontFamily: {
                'heading': ['Poppins', 'system-ui', 'sans-serif'],
                'body': ['Montserrat', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'nests-gradient': 'linear-gradient(to right, #53CED1, #0D6F82)',
                'nests-gradient-reverse': 'linear-gradient(to right, #0D6F82, #53CED1)',
                'nests-gradient-orange': 'linear-gradient(135deg, #53CED1, #E37C25)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
