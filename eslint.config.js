import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["js/vendor/**"],
  },
  {
    files: ["js/**/*.{js,mjs}", "tools/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
