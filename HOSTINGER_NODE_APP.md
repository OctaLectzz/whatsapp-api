# Hostinger Node.js App Configuration

Use these values in Hostinger **Websites -> Manage -> Advanced -> Node.js**.

| Setting | Value |
| --- | --- |
| Node.js version | 20 or newer |
| Application mode | Production |
| Application root | uploaded `dist` folder path |
| Application URL | subdomain or path assigned for WhatsApp gateway |
| Application startup file | `src/server.js` |
| Install command | `npm install --omit=dev` |
| Start command | `npm start` |

## Environment Variables

Copy values from `.env.hostinger.example` into Hostinger's environment variable panel.

Do not set `WHATSAPP_GATEWAY_PORT` when Hostinger provides `PORT`. Set `WHATSAPP_GATEWAY_ALLOWED_ORIGIN` to the Laravel domain only, not `*`, for production.

## Security Checklist

- Use HTTPS for Laravel and WhatsApp gateway URLs.
- Use different random 64+ character values for `WHATSAPP_GATEWAY_API_TOKEN` and `LARAVEL_WHATSAPP_GATEWAY_TOKEN`.
- Store tokens only in Hostinger environment variables and Laravel `.env`.
- Keep `storage/auth` writable but never public.
- Restart the Node.js app after changing env values.
