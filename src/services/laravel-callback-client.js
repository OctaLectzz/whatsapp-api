export class LaravelCallbackClient {
  constructor({ apiUrl, gatewayToken, callbackTimeoutMs, logger }) {
    this.apiUrl = apiUrl
    this.gatewayToken = gatewayToken
    this.callbackTimeoutMs = callbackTimeoutMs
    this.logger = logger
  }

  async sendGatewayEvent(payload) {
    if (!this.apiUrl || !this.gatewayToken) {
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.callbackTimeoutMs)

    try {
      const response = await fetch(`${this.apiUrl}/internal/whatsapp-gateway/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Whatsapp-Gateway-Token': this.gatewayToken
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      if (!response.ok) {
        this.logger.warn({ status: response.status, body: await response.text() }, 'Laravel gateway callback failed')
      }
    } catch (error) {
      this.logger.warn({ error }, 'Laravel gateway callback could not be delivered')
    } finally {
      clearTimeout(timeout)
    }
  }
}
