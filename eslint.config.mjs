import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable TypeScript rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",

      // Disable React hook dependency warnings
      "react-hooks/exhaustive-deps": "off",

      // Disable Next.js image element warnings
      "@next/next/no-img-element": "off",
      
      // Add any additional rules to disable here...
    },
  },
];

export default eslintConfig;
