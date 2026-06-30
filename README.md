# Anggrek Astuti WhatsApp Gateway

Express and Baileys service for connecting one WhatsApp device and sending automated messages requested by the Laravel API.

## Structure

```text
src/
  config/                 Environment and logger setup
  http/                   Express app, routes, and request authentication
  services/               Baileys gateway state and Laravel callback client
  utils/                  Small shared helpers
  server.js               Application entrypoint
scripts/
  build.js                Syntax check and production bundle copy
```

## Local Run

```bash
npm install
cp .env.example .env
npm start
```

The Laravel backend must use the same gateway token values configured in this service.

## Build

```bash
npm install
npm run build
```

The build command checks JavaScript syntax and creates `dist/` with production files for a Node.js host.

## Production Safety

Deploying through Hostinger Node.js app is acceptable for this gateway when it runs behind HTTPS, uses environment variables, and is protected by `WHATSAPP_GATEWAY_API_TOKEN`. Do not expose this service as an open public API.

Production startup fails when these required variables are missing:

- `WHATSAPP_GATEWAY_API_TOKEN`
- `LARAVEL_API_URL`
- `LARAVEL_WHATSAPP_GATEWAY_TOKEN`

Use `.env.hostinger.example` and `HOSTINGER_NODE_APP.md` as the Hostinger configuration template.

## Hostinger Business Shared Hosting Deploy

Use Hostinger's Node.js application feature with Node.js 24.x. This service is not static hosting and must run as a Node.js app.

1. Run `npm run build` locally or in CI.
2. Upload the contents of `anggrek-astuti-whatsapp/dist` to the Node.js app root on Hostinger.
3. In Hostinger Node.js app settings, set startup file to `src/server.js` or start command to `npm start`.
4. Run `npm install --omit=dev` in the uploaded app root if Hostinger does not install dependencies automatically.
5. Configure environment variables from `.env.hostinger.example` in Hostinger, not hardcoded in files.
6. Leave `WHATSAPP_GATEWAY_PORT` empty if Hostinger injects `PORT`; the app reads `WHATSAPP_GATEWAY_PORT` first, then `PORT`.
7. Set `WHATSAPP_GATEWAY_HOST=0.0.0.0` so the Node.js app binds correctly behind Hostinger's proxy.
8. Set `WHATSAPP_GATEWAY_AUTH_DIR=storage/auth`; make sure the app can write to `storage/` so Baileys session persists.
9. Set `LARAVEL_API_URL` to the public Laravel API base URL, for example `https://your-domain.com/api`.
10. Set matching secret values for `WHATSAPP_GATEWAY_API_TOKEN` and `LARAVEL_WHATSAPP_GATEWAY_TOKEN`.

## Required Environment Variables

```env
NODE_ENV=production
WHATSAPP_GATEWAY_HOST=0.0.0.0
# WHATSAPP_GATEWAY_PORT= leave unset on Hostinger when PORT is injected
WHATSAPP_GATEWAY_API_TOKEN=replace-with-random-64-char-secret
WHATSAPP_GATEWAY_AUTH_DIR=storage/auth
WHATSAPP_GATEWAY_LOG_LEVEL=info
WHATSAPP_GATEWAY_ALLOWED_ORIGIN=https://your-laravel-domain.com
WHATSAPP_GATEWAY_RECONNECT_DELAY_MS=5000
WHATSAPP_GATEWAY_QR_TTL_SECONDS=60
WHATSAPP_GATEWAY_PAIRING_TTL_SECONDS=120

LARAVEL_API_URL=https://your-laravel-domain.com/api
LARAVEL_WHATSAPP_GATEWAY_TOKEN=replace-with-random-64-char-secret
LARAVEL_CALLBACK_TIMEOUT_MS=5000
```

