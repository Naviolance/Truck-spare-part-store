import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Next's official rules (React, React Hooks, accessibility basics, Next
// pitfalls such as <img> vs next/image) plus its TypeScript rules, in
// ESLint's flat-config format. Run with `pnpm --filter frontend lint`.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Config files Node loads directly as CommonJS.
  { files: ["*.js", "*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];

export default config;
