import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "dist/"] },
  js.configs.recommended,
  {
    files: ["extension/**/*.js"],
    languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
  },
  {
    files: ["tests/**/*.{js,mjs}", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "multi-line"],
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
      "no-shadow": "error",
      "no-param-reassign": "error",
      "no-implicit-coercion": "error",
      "no-console": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-use-before-define": ["error", { functions: false, variables: true }],
    },
  },
  { files: ["tests/e2e/**"], rules: { "no-console": "off" } },
];
