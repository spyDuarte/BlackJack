export default [
    {
        files: ["src/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                localStorage: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                performance: "readonly",
                fetch: "readonly",
                AudioContext: "readonly",
                Storage: "readonly",
                Blob: "readonly",
                URL: "readonly",
                FileReader: "readonly",
                crypto: "readonly",
                location: "readonly",
                btoa: "readonly",
                atob: "readonly",
                globalThis: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "error",
            "no-const-assign": "error",
            "no-dupe-args": "error",
            "no-dupe-keys": "error",
            "no-duplicate-case": "error",
            "no-unreachable": "warn",
            "eqeqeq": ["warn", "smart"],
            "no-var": "error",
            "prefer-const": "warn"
        }
    },
    {
        ignores: ["node_modules/", "tests/", "*.config.js"]
    }
];
