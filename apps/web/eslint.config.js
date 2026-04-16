import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      // TypeScript types already enforce prop shapes — prop-types is redundant
      "react/prop-types": "off",
    },
  },
];
