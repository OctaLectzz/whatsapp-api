export function secondsFromNow(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}
