# Contributing

## Checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npx playwright test
```

`npm test` runs the unit tests, the API contract tests, and one MCP client call. Playwright covers Chromium, Firefox, and WebKit.

Extension load tests need a display:

```bash
npm run build -w @nxtl/extension
xvfb-run -a env DISPLAY=$DISPLAY npx playwright test tests/extension --project=chromium
```

## Firefox signing

From `apps/extension/dist-firefox`, on a machine that has the AMO credentials:

```bash
web-ext sign --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET" --channel=unlisted
```

The release XPI is unsigned.
