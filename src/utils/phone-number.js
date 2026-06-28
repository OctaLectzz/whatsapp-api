export function normalizePhoneNumber(value) {
  if (typeof value !== 'string') {
    return null
  }

  let digits = value.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`
  }

  if (digits.length < 8 || digits.length > 15) {
    return null
  }

  return digits
}

export function extractPhoneNumber(value) {
  if (typeof value !== 'string') {
    return null
  }

  return value.split('@')[0]?.split(':')[0] ?? null
}
