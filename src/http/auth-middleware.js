export function createGatewayAuthMiddleware(apiToken) {
  return (request, response, next) => {
    if (!apiToken) {
      response.status(500).json({ ok: false, message: 'Gateway API token is not configured.' })
      return
    }

    const token = request.header('x-gateway-token')

    if (token !== apiToken) {
      response.status(401).json({ ok: false, message: 'Unauthorized gateway request.' })
      return
    }

    next()
  }
}
