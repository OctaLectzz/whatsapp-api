import cors from 'cors'
import express from 'express'

import { createGatewayAuthMiddleware } from './auth-middleware.js'

function allowedOrigins(value) {
  return value === '*' ? true : value.split(',').map((origin) => origin.trim())
}

export function createApp({ config, gatewayService, logger }) {
  const app = express()

  app.use(express.json({ limit: '1mb' }))
  app.use(cors({ origin: allowedOrigins(config.server.allowedOrigin) }))
  app.use(createGatewayAuthMiddleware(config.server.apiToken))

  app.get('/health', (request, response) => {
    response.json({ ok: true, data: gatewayService.getStatus() })
  })

  app.get('/status', (request, response) => {
    response.json({ ok: true, data: gatewayService.getStatus() })
  })

  app.post('/connect/qr', async (request, response) => {
    const data = await gatewayService.connectQr()

    response.json({
      ok: true,
      message: 'WhatsApp QR connection started.',
      data
    })
  })

  app.post('/connect/pairing-code', async (request, response) => {
    const data = await gatewayService.connectPairingCode(request.body?.phone_number)

    response.json({
      ok: true,
      message: 'WhatsApp pairing code requested.',
      data
    })
  })

  app.post('/disconnect', async (request, response) => {
    const data = await gatewayService.disconnect()

    response.json({ ok: true, message: data.message, data })
  })

  app.post('/messages/send', async (request, response) => {
    const data = await gatewayService.sendTextMessage({
      phoneNumber: request.body?.phone_number,
      message: request.body?.message
    })

    response.json({
      ok: true,
      message: 'WhatsApp message sent successfully.',
      data
    })
  })

  app.use((request, response) => {
    response.status(404).json({ ok: false, message: 'Route not found.' })
  })

  app.use((error, request, response, next) => {
    logger.error({ error }, 'WhatsApp gateway request failed')

    response.status(error.status || 500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'WhatsApp gateway request failed.'
    })
  })

  return app
}
