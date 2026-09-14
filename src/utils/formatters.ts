const numberFormatter = new Intl.NumberFormat('es-CL')
const percentageFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

export function formatNumber(value: number) {
  return numberFormatter.format(value)
}

export function formatPercent(value: number | null, showSign = false) {
  if (value === null || Number.isNaN(value)) return null
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${percentageFormatter.format(value)}%`
}

export function formatDate(value: string | undefined, includeYear = true) {
  if (!value) return '—'

  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone: 'America/Santiago',
  }).format(date)
}

export function formatDateTime(value: string | undefined) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(date)
}
