const zone = 'America/Bahia'

export function bahiaInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`
}

export function bahiaInputToIso(value: string) {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute)
  let instant = wallClockUtc
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const shown = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(instant))
    const actual = Object.fromEntries(shown.map((part) => [part.type, part.value]))
    const shownAsUtc = Date.UTC(+actual.year, +actual.month - 1, +actual.day, +actual.hour, +actual.minute, +actual.second)
    instant += wallClockUtc - shownAsUtc
  }
  return new Date(instant).toISOString()
}

export function formatBahiaTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatBahiaDate(iso: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: zone, ...options }).format(new Date(iso))
}

export function isTodayInBahia(iso: string) {
  return bahiaInputValue(new Date(iso)).slice(0, 10) === bahiaInputValue(new Date()).slice(0, 10)
}

