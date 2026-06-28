import 'dotenv/config'

import { config } from './config/env.js'
import { logger } from './config/logger.js'
import { createApp } from './http/app.js'
import { LaravelCallbackClient } from './services/laravel-callback-client.js'
import { WhatsappGatewayService } from './services/whatsapp-gateway-service.js'

const callbackClient = new LaravelCallbackClient({
  apiUrl: config.laravel.apiUrl,
  gatewayToken: config.laravel.gatewayToken,
  callbackTimeoutMs: config.laravel.callbackTimeoutMs,
  logger
})

const gatewayService = new WhatsappGatewayService({
  config,
  callbackClient,
  logger
})

const app = createApp({ config, gatewayService, logger })

app.listen(config.server.port, config.server.host, () => {
  logger.info({ host: config.server.host, port: config.server.port }, 'WhatsApp gateway started')
})
