import { Boom } from '@hapi/boom'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import fs from 'node:fs/promises'
import QRCode from 'qrcode'

import { secondsFromNow } from '../utils/date.js'
import { extractPhoneNumber, normalizePhoneNumber } from '../utils/phone-number.js'

const DEFAULT_STATUS = {
  connectionMode: null,
  connectionStatus: 'disconnected',
  statusMessage: 'WhatsApp gateway is not connected.',
  qrCode: null,
  qrCodeDataUrl: null,
  qrExpiresAt: null,
  pairingCode: null,
  pairingCodeExpiresAt: null,
  connectedUser: null,
  lastDisconnectReason: null,
  lastErrorMessage: null,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  phoneNumber: null,
  jid: null
}

export class WhatsappGatewayService {
  constructor({ config, callbackClient, logger }) {
    this.config = config
    this.callbackClient = callbackClient
    this.logger = logger
    this.socket = null
    this.isConnecting = false
    this.reconnectTimer = null
    this.state = { ...DEFAULT_STATUS }
  }

  getStatus() {
    return {
      status: this.state.connectionStatus,
      message: this.state.statusMessage,
      connection_mode: this.state.connectionMode,
      phone_number: this.state.phoneNumber,
      jid: this.state.jid,
      qr_code: this.state.qrCode,
      qr_code_data_url: this.state.qrCodeDataUrl,
      qr_expires_at: this.state.qrExpiresAt,
      pairing_code: this.state.pairingCode,
      pairing_code_expires_at: this.state.pairingCodeExpiresAt,
      connected_user: this.state.connectedUser,
      last_disconnect_reason: this.state.lastDisconnectReason,
      last_error_message: this.state.lastErrorMessage,
      last_connected_at: this.state.lastConnectedAt,
      last_disconnected_at: this.state.lastDisconnectedAt
    }
  }

  async connectQr() {
    await this.connect({ mode: 'qr' })

    return this.getStatus()
  }

  async connectPairingCode(phoneNumber) {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber)

    if (!normalizedPhoneNumber) {
      const error = new Error('A valid phone_number is required.')
      error.status = 422
      throw error
    }

    await this.connect({ mode: 'pairing_code', phoneNumber: normalizedPhoneNumber })

    return this.getStatus()
  }

  async disconnect() {
    this.clearReconnectTimer()
    await this.updateConnectionState({
      status: 'disconnecting',
      message: 'Disconnecting WhatsApp gateway.',
      type: 'disconnecting'
    })

    if (this.socket) {
      await this.socket.logout().catch((error) => this.logger.warn({ error }, 'WhatsApp logout failed'))
      this.socket.end(undefined)
    }

    this.socket = null
    await fs.rm(this.config.whatsapp.authDir, { recursive: true, force: true })
    this.resetAuthPrompts()
    this.state.connectedUser = null
    this.state.jid = null
    this.state.phoneNumber = null
    this.state.lastDisconnectedAt = new Date().toISOString()

    await this.updateConnectionState({
      status: 'disconnected',
      message: 'WhatsApp device disconnected and session cleared.',
      type: 'disconnected'
    })

    return this.getStatus()
  }

  async sendTextMessage({ phoneNumber, message }) {
    if (!this.socket || this.state.connectionStatus !== 'connected') {
      const error = new Error('WhatsApp device is not connected.')
      error.status = 409
      throw error
    }

    const recipient = normalizePhoneNumber(phoneNumber)
    const trimmedMessage = typeof message === 'string' ? message.trim() : ''

    if (!recipient || trimmedMessage.length === 0) {
      const error = new Error('Valid phone_number and message are required.')
      error.status = 422
      throw error
    }

    const recipientJid = jidNormalizedUser(`${recipient}@s.whatsapp.net`)
    const sent = await this.socket.sendMessage(recipientJid, { text: trimmedMessage })

    return {
      message_id: sent?.key?.id ?? null,
      recipient,
      status: 'sent'
    }
  }

  async connect({ mode, phoneNumber = null }) {
    if (this.isConnecting) {
      return
    }

    if (this.socket && this.state.connectionStatus === 'connected') {
      this.state.statusMessage = 'WhatsApp device is already connected.'
      return
    }

    this.isConnecting = true
    this.clearReconnectTimer()
    this.resetAuthPrompts()
    this.state.connectionMode = mode
    this.state.phoneNumber = phoneNumber ?? this.state.phoneNumber

    await this.updateConnectionState({
      status: 'connecting',
      message: 'Connecting to WhatsApp.',
      type: 'connecting'
    })

    try {
      await fs.mkdir(this.config.whatsapp.authDir, { recursive: true })

      const { state, saveCreds } = await useMultiFileAuthState(this.config.whatsapp.authDir)
      const { version } = await fetchLatestBaileysVersion()

      this.socket = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger.child({ class: 'signal-key-store' }))
        },
        browser: Browsers.ubuntu('Anggrek Astuti POS'),
        logger: this.logger.child({ class: 'baileys' }),
        printQRInTerminal: false,
        version
      })

      this.socket.ev.on('creds.update', saveCreds)
      this.socket.ev.on('connection.update', (update) => {
        this.handleConnectionUpdate(update).catch((error) => {
          this.logger.error({ error }, 'WhatsApp connection update failed')
        })
      })

      if (mode === 'pairing_code' && phoneNumber && !state.creds.registered) {
        this.state.pairingCode = await this.socket.requestPairingCode(phoneNumber)
        this.state.pairingCodeExpiresAt = secondsFromNow(this.config.whatsapp.pairingTtlSeconds)
        await this.updateConnectionState({
          status: 'pairing_code_ready',
          message: 'Pairing code generated. Enter it on your WhatsApp device.',
          type: 'pairing_code_ready'
        })
      }
    } finally {
      this.isConnecting = false
    }
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      this.state.qrCode = qr
      this.state.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 })
      this.state.qrExpiresAt = secondsFromNow(this.config.whatsapp.qrTtlSeconds)
      this.state.pairingCode = null
      this.state.pairingCodeExpiresAt = null
      await this.updateConnectionState({
        status: 'qr_ready',
        message: 'Scan this QR code from WhatsApp linked devices.',
        type: 'qr_ready'
      })
    }

    if (connection === 'connecting') {
      await this.updateConnectionState({
        status: this.state.qrCode ? 'qr_ready' : 'connecting',
        message: this.state.qrCode ? this.state.statusMessage : 'Connecting to WhatsApp.',
        type: 'connecting'
      })
    }

    if (connection === 'open') {
      this.state.connectedUser = this.socket?.user ?? null
      this.state.jid = this.state.connectedUser?.id ?? null
      this.state.phoneNumber = extractPhoneNumber(this.state.jid) ?? this.state.phoneNumber
      this.state.lastConnectedAt = new Date().toISOString()
      this.resetAuthPrompts()
      await this.updateConnectionState({
        status: 'connected',
        message: 'WhatsApp device connected successfully.',
        type: 'connected'
      })
    }

    if (connection === 'close') {
      await this.handleClosedConnection(lastDisconnect)
    }
  }

  async handleClosedConnection(lastDisconnect) {
    const error = lastDisconnect?.error
    const statusCode = error instanceof Boom ? error.output.statusCode : error?.output?.statusCode
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut

    this.state.lastDisconnectReason = statusCode ? String(statusCode) : null
    this.state.lastErrorMessage = error instanceof Error ? error.message : null
    this.state.lastDisconnectedAt = new Date().toISOString()
    this.socket = null

    await this.updateConnectionState({
      status: shouldReconnect ? 'reconnecting' : 'disconnected',
      message: shouldReconnect
        ? 'WhatsApp disconnected. Reconnecting automatically.'
        : 'WhatsApp logged out. Please connect the device again.',
      type: shouldReconnect ? 'reconnecting' : 'disconnected'
    })

    if (shouldReconnect) {
      this.scheduleReconnect()
      return
    }

    this.state.connectedUser = null
    this.state.jid = null
    this.state.phoneNumber = null
    await fs.rm(this.config.whatsapp.authDir, { recursive: true, force: true })
  }

  scheduleReconnect() {
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.connect({ mode: 'qr' }).catch((error) => {
        this.logger.error({ error }, 'WhatsApp reconnect failed')
        this.scheduleReconnect()
      })
    }, this.config.whatsapp.reconnectDelayMs)
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  resetAuthPrompts() {
    this.state.qrCode = null
    this.state.qrCodeDataUrl = null
    this.state.qrExpiresAt = null
    this.state.pairingCode = null
    this.state.pairingCodeExpiresAt = null
  }

  async updateConnectionState({ status, message, type }) {
    this.state.connectionStatus = status
    this.state.statusMessage = message

    await this.callbackClient.sendGatewayEvent({
      type,
      status,
      message,
      connection_mode: this.state.connectionMode,
      phone_number: this.state.phoneNumber,
      jid: this.state.jid,
      connected_user: this.state.connectedUser,
      qr_code: this.state.qrCode,
      qr_code_data_url: this.state.qrCodeDataUrl,
      qr_expires_at: this.state.qrExpiresAt,
      pairing_code: this.state.pairingCode,
      pairing_code_expires_at: this.state.pairingCodeExpiresAt,
      last_disconnect_reason: this.state.lastDisconnectReason,
      last_error_message: this.state.lastErrorMessage,
      payload: this.getStatus()
    })
  }
}
