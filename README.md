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
```

## Local Run

```bash
npm install
cp .env.example .env
npm start
```

The Laravel backend must use the same gateway token values configured in this service.
