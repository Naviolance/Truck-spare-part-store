// ESLint flat config (ESLint 9+). Recommended rules only, without the
// type-aware ones, so linting stays fast and does not run the compiler.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Allow intentionally unused arguments/variables when prefixed with _.
      // ignoreRestSiblings: `const { passwordHash, ...safeUser } = user` strips a
      // field on purpose; the removed variable is meant to stay unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Tests build partial mocks with `as any` on purpose.
    files: ["**/*.spec.ts"],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
