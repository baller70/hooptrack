import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next.prev/**",
    ".next.staging/**",
    ".next.tmp/**",
    ".next.*/**",
    "out/**",
    "build/**",
    "coverage/**",
    "public/suite/**",
    "public/film/**",
    "public/calendar/**",
    "__codex_upload_tmp__/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
