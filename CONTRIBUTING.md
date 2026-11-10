# Contributing

## Checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npx playwright test
```

`npm test` runs the unit tests, the API contract tests, and one MCP client call. Playwright covers Chromium and Firefox. WebKit runs when its host libraries are installed.

If WebKit fails to launch with missing libraries (common on minimal Linux images), skip it:

```bash
PLAYWRIGHT_SKIP_WEBKIT=1 npx playwright test tests/e2e
```

The cross-browser Private messages & files test still tries Firefox. WebKit is skipped automatically when its launcher reports missing host dependencies.

Extension load tests need a display:

```bash
npm run build -w @nxtl/extension
xvfb-run -a npx playwright test tests/extension --project=chromium
```

## Firefox signing

From `apps/extension/dist-firefox`, on a machine that has the AMO credentials:

```bash
npx web-ext sign --source-dir=. --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET" --channel=unlisted
```

The GitHub release may also include an unsigned Firefox build for inspection.
