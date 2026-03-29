import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.browser,
    },
    rules: {
      // Cross-file globals (loaded via <script> tags) appear unused per-file
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: "warn",
    },
  },
  prettier,
];
