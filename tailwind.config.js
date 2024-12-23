const { transform } = require("next/dist/build/swc")

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            scale: {
                60: "0.6",
                65: "0.65",
                70: "0.7",
            },
            gridTemplateColumns: {
                "fill-150": "repeat(auto-fill, minmax(150px, 1fr))",
            },
            dropShadow: {
                neon: [
                    "0 0px 4px theme('colors.light_green')",
                    "0 0 1px theme('colors.night_green')",
                ],
            },
            boxShadow: {
                footer: "0 -3px 10px -1px rgb(0 0 0 / 0.1), 0 -2px 10px 1px rgb(0 0 0 / 0.1)",
                neon: "0 0 5px theme('colors.light_green'), 0 0 15px theme('colors.primary_green')",
                neon_exp:
                    "0 0 8px theme('colors.light_green'), 0 0 15px theme('colors.primary_green')",
            },
            keyframes: {
                emersion: {
                    "0%": { opacity: "0", scale: "0.9" },
                    "100%": { opacity: "1", scale: "1" },
                },
                apparition: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                spinner: {
                    "0%": { transform: "rotate(45deg)" },
                    "100%": { transform: "rotate(405deg)" },
                },
                scale: {
                    // transform: 'translateY(-10%)',
                    "0%": { opacity: "0.8", transform: "scale(1.1)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                opacity: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                transformer: {
                    "0%": { transform: "translateY(150px)" },
                    "45%": { transform: "translateY(-10px)" },
                    "75%": { transform: "translateY(5px)" },
                    "100%": { transform: "translateY(0px)" },
                },
                shake: {
                    "0%": { transform: "translateY(6px)" },
                    "25%": { transform: "translateY(-4px)" },
                    "50%": { transform: "translateY(2px)" },
                    "75%": { transform: "translateY(-2px)" },
                    "50%": { transform: "translateY(0px)" },
                },
            },
            animation: {
                shaker: "shake 0.4s ease-in-out ",
                transformt: "transformer 0.7s ease-in-out ",
                spinner: "spinner 2s cubic-bezier(0.1, 0.1, 0.8, 0.2) infinite",
                emersion: "emersion 0.3s ease-in-out",
                apparition: "apparition 0.3s ease-in-out",
                scale: "scale 0.3s ease-in-out",
                opacity: "opacity 0.7s ease-in-out",
            },
            height: {
                128: "32rem",
                120: "28rem",
            },
            backgroundImage: {
                slider: "url('/home/sliderShape.svg')",
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            colors: {
                body_bg: "#fcfbf8",
                night_green: "#133531",
                primary_green: "#15C8B4",
                dark_green: "#31968B",
                contrast_green: "#11B19F",
                txtLight: "#bebeb4",
                middle_green: "#14a091",
                txtMiddle: "#7e9895",
                light_green: "#26f7df",

                bodyColor: "#fcfbf8",
                txtGreen: "#133531",
                mainGreen: "#15C8B4",
                contrastColor: "#11B19F",
                txtLight: "#bebeb4",
                txtMiddle: "#7e9895",
                backMiddle: "#14a091",
            },
            screens: {
                lg1245: "1245px",
                sm920: "920px",
                lg1100: "1100px",
                lg2: "1250px",
                md1100: "1100px",
                md1372: "1372px",
                md1200: "1200px",
            },
        },
    },
    plugins: [],
}
