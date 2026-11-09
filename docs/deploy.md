# Deploy

## GitHub Pages

Pushes to `main` run `.github/workflows/pages.yml`. The site is served at https://nxtlsim.github.io/nxtl-shield/.

The repository setting is Settings → Pages → Build and deployment → Source: GitHub Actions.

Local preview:

```bash
npm run build -w @nxtl/web
npm run preview -w @nxtl/web -- --host 127.0.0.1 --port 4173
```

## Static Hugging Face Space

```bash
npm run build:hf-static
hf upload nxtl-esim/nxtl-shield dist/hf-static --repo-type=space
```

Use `apps/web/public/og/hf-thumbnail.png` as the Space thumbnail. This needs a logged-in `hf` CLI. A static Space is the free option.

## API Space

A container Space needs a paid Hugging Face plan. From the repository root:

```bash
docker build -f deploy/hf-mcp/Dockerfile -t nxtl-shield-api .
```

The image listens on port 7860. It is not required for the public page.

## Firefox add-on signature

```bash
cd apps/extension/dist-firefox
web-ext sign --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET" --channel=unlisted
```

Run that on a machine that already has the AMO credentials.
