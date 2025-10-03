// apps/client/src/eslint.config.mjs (version 2.0.0)
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// ARCHITECTURAL REFACTORING: The client's ESLint config is now simpler.
// It relies on the monorepo root configuration for shared rules like import restrictions.
// This ensures consistency and a single source of truth for architectural rules.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    // Local ignores for the client app.
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;