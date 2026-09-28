import type { DashboardKpiValues, DashboardSnapshot } from '../types/dashboard'

// Only map categories whose grain matches the previous-period KPI.
const channelKpis: Record<string, keyof DashboardKpiValues> = {
  'Google Ads': 'google_ads_clicks',
  'Meta Ads': 'meta_ads_clicks',
  Directo: 'direct_clicks',
  Referencia: 'referral_clicks',
  'Orgánico': 'organic_clicks',
}

export function compareChannel(snapshot: DashboardSnapshot, channel: string, current: number) {
  if (!hasPreviousCoverage(snapshot)) return { previous: null, difference: null, percent: null, state: 'unavailable' as const }
  const key = channelKpis[channel]
  const previous = key ? snapshot.kpis.previous?.[key] : undefined
  if (previous === undefined || !Number.isFinite(previous) || previous < 0 || !Number.isFinite(current) || current < 0) {
    return { previous: null, difference: null, percent: null, state: 'unavailable' as const }
  }
  const difference = current - previous
  if (previous === 0) return { previous, difference, percent: current === 0 ? 0 : null, state: current === 0 ? 'unchanged' as const : 'new' as const }
  return { previous, difference, percent: difference / previous * 100, state: difference > 0 ? 'up' as const : difference < 0 ? 'down' as const : 'unchanged' as const }
}

export function hasPreviousCoverage(snapshot: DashboardSnapshot): boolean {
  const coverage = snapshot.kpis.period?.previous_available ?? snapshot.comparisons?.comparisons?.previous_period?.available
  return coverage === true
}

export function getChannelDetail(snapshot: DashboardSnapshot, channel: string) {
  const campaigns = snapshot.campaigns.campaigns.filter(row => row.channel === channel).sort((a, b) => b.contacts - a.contacts)
  const byDay = new Map<string, number>()
  for (const row of snapshot.timeseries.channels) {
    if (row.channel === channel) byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.contacts)
  }
  const evolution = [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, contacts]) => ({ day, contacts }))
  return { campaigns, evolution, campaignTotal: campaigns.reduce((sum, row) => sum + row.contacts, 0), evolutionTotal: evolution.reduce((sum, row) => sum + row.contacts, 0) }
}

export function inspectSnapshot(snapshot: DashboardSnapshot): string[] {
  const issues: string[] = []
  const total = snapshot.kpis.current.valid_clicks
  const valid = (value: number) => Number.isFinite(value) && value >= 0 && Number.isInteger(value)
  if (!valid(total)) issues.push('El total de contactos no es un conteo válido.')
  const channels = snapshot.breakdowns.channels
  const daily = snapshot.timeseries.comparison
  if (channels.some(row => !valid(row.contacts)) || daily.some(row => !valid(row.current_contacts))) issues.push('Hay conteos inválidos en los orígenes o la evolución.')
  if (channels.reduce((sum, row) => sum + row.contacts, 0) !== total) issues.push('La suma de los orígenes no coincide con el total de contactos.')
  if (daily.reduce((sum, row) => sum + row.current_contacts, 0) !== total) issues.push('La suma de la evolución no coincide con el total de contactos.')
  if (new Set(channels.map(row => row.channel)).size !== channels.length) issues.push('La respuesta contiene orígenes duplicados.')
  if (new Set(daily.map(row => row.current_day)).size !== daily.length) issues.push('La evolución contiene fechas duplicadas.')
  if (snapshot.integrity.core_totals_match === false) issues.push('El servidor reportó una inconsistencia en sus totales.')
  return issues
}
