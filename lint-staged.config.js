export default {
  "apps/api/**/*.{ts,js}": [
    "apps/api/node_modules/.bin/eslint --fix",
    "apps/api/node_modules/.bin/prettier --write",
  ],
  "apps/web/**/*.{ts,tsx,js,jsx,json,css,html}": [
    "apps/web/node_modules/.bin/biome check --write --no-errors-on-unmatched",
  ],
};
