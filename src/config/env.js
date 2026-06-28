import path from 'node:path'

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback)

  return Number.isFinite(value) ? value : fallback
}

export const config = {
  server: {
    host: process.env.WHATSAPP_GATEWAY_HOST ?? '127.0.0.1',
    port: numberFromEnv('WHATSAPP_GATEWAY_PORT', 3030),
    allowedOrigin: process.env.WHATSAPP_GATEWAY_ALLOWED_ORIGIN ?? '*',
    apiToken: process.env.WHATSAPP_GATEWAY_API_TOKEN
  },
  whatsapp: {
    authDir: path.resolve(process.env.WHATSAPP_GATEWAY_AUTH_DIR ?? 'storage/auth'),
    reconnectDelayMs: numberFromEnv('WHATSAPP_GATEWAY_RECONNECT_DELAY_MS', 5000),
    qrTtlSeconds: numberFromEnv('WHATSAPP_GATEWAY_QR_TTL_SECONDS', 60),
    pairingTtlSeconds: numberFromEnv('WHATSAPP_GATEWAY_PAIRING_TTL_SECONDS', 120)
  },
  laravel: {
    apiUrl: (process.env.LARAVEL_API_URL ?? '').replace(/\/$/, ''),
    gatewayToken: process.env.LARAVEL_WHATSAPP_GATEWAY_TOKEN,
    callbackTimeoutMs: numberFromEnv('LARAVEL_CALLBACK_TIMEOUT_MS', 5000)
  },
  logging: {
    level: process.env.WHATSAPP_GATEWAY_LOG_LEVEL ?? 'info'
  }
}
