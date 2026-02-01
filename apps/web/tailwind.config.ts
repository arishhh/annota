import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                accent: {
                    0: 'var(--accent-0)',
                    1: 'var(--accent-1)',
                    glow: 'var(--accent-glow)',
                },
                bg: {
                    0: 'var(--bg-0)',
                    1: 'var(--bg-1)',
                    2: 'var(--bg-2)',
                }
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;
