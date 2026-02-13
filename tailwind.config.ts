import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "hsl(210, 100%, 50%)",
                    foreground: "hsl(0, 0%, 100%)",
                },
                card: {
                    DEFAULT: "hsl(220, 15%, 10%)",
                    foreground: "hsl(0, 0%, 100%)",
                },
            },
        },
    },
    plugins: [],
};
export default config;
