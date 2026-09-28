export type DashboardKpiValues = {
  raw_events: number
  valid_clicks: number
  technical_duplicates: number
  unique_visitors: number
  identified_visitor_clicks: number
  visitor_id_coverage_rate: number
  attributed_clicks: number
  confirmed_attribution_clicks: number
  inferred_attribution_clicks: number
  legacy_attribution_clicks: number
  attribution_rate: number
  confirmed_attribution_rate: number
  duplicate_rate: number
  google_ads_clicks: number
  meta_ads_clicks: number
  organic_clicks: number
  direct_clicks: number
  referral_clicks: number
}

export type DashboardKpiChange = {
  valid_clicks_pct: number | null
  google_ads_pct: number | null
  meta_ads_pct: number | null
  organic_pct: number | null
}

export type DashboardPreset =
  | 'hoy'
  | 'ayer'
  | '7d'
  | '30d'
  | 'mes_actual'
  | 'mes_anterior'
  | 'personalizado'

export type AttributionModel = 'first' | 'last'

export type DashboardRequest = {
  preset: DashboardPreset
  attribution_model: AttributionModel
  custom_start?: string | null
  custom_end?: string | null
  limit?: number
}

export type DashboardIntegrity = {
  kpi_valid_clicks: number
  breakdown_valid_clicks: number
  timeseries_valid_clicks: number
  campaign_contacts: number
  core_totals_match: boolean
  campaign_coverage_rate: number
}

export type DashboardPeriod = {
  generated_at: string
  label: string
  start_date: string
  end_date: string
  is_partial_period: boolean
  cutoff_local_time: string | null
  [key: string]: unknown
}

export type DashboardTimeseriesMeta = {
  granularity?: string
  timezone?: string
  [key: string]: unknown
}

export type DashboardTimeseriesTotals = {
  current_contacts: number
  previous_contacts: number
  change_pct: number | null
  [key: string]: unknown
}

export type DashboardTimeseriesComparisonPoint = {
  position: number
  current_day: string
  previous_day: string
  current_contacts: number
  previous_contacts: number
  is_partial_day: boolean
  change_pct: number | null
}

export type DashboardTimeseriesChannelPoint = {
  day: string
  channel: string
  contacts: number
}

export type DashboardTimeseries = {
  meta: DashboardTimeseriesMeta
  totals: DashboardTimeseriesTotals
  comparison: DashboardTimeseriesComparisonPoint[]
  channels: DashboardTimeseriesChannelPoint[]
}

export type DashboardChannelBreakdown = {
  channel: string
  contacts: number
}

export type DashboardBreakdowns = {
  channels: DashboardChannelBreakdown[]
  landing_pages: DashboardLandingPage[]
  click_pages: DashboardClickPage[]
  buttons: DashboardButton[]
  keywords: DashboardKeyword[]
  devices: DashboardDevice[]
  networks: DashboardNetwork[]
  matchtypes: DashboardMatchType[]
  meta_placements: DashboardMetaPlacement[]
  [key: string]: unknown
}

export type DashboardLandingPage = {
  page: string
  quality: string
  contacts: number
}

export type DashboardClickPage = {
  page: string
  contacts: number
}

export type DashboardButton = {
  button: string
  contacts: number
}

export type DashboardKeyword = {
  channel: string
  campaign: string
  keyword: string
  contacts: number
}

export type DashboardDevice = {
  device: string
  contacts: number
}

export type DashboardNetwork = {
  network: string
  contacts: number
}

export type DashboardMatchType = {
  matchtype: string
  contacts: number
}

export type DashboardMetaPlacement = {
  source: string
  placement: string
  contacts: number
}

export type DashboardCampaignConfidence = {
  confirmed: number
  confirmed_by_referrer: number
  inferred_historical: number
  legacy: number
  unidentified: number
}

export type DashboardCampaign = {
  channel: string
  campaign: string
  contacts: number
  share_pct: number
  confidence: DashboardCampaignConfidence
}

export type DashboardCampaigns = {
  campaigns: DashboardCampaign[]
  total_campaign_contacts: number
  [key: string]: unknown
}

export type DashboardSnapshot = {
  schema_version: string
  period: DashboardPeriod
  kpis: {
    period?: { previous_available?: boolean }
    current: DashboardKpiValues
    previous: DashboardKpiValues
    change: DashboardKpiChange
  }
  integrity: DashboardIntegrity
  timeseries: DashboardTimeseries
  breakdowns: DashboardBreakdowns
  campaigns: DashboardCampaigns
  comparisons?: { comparisons?: { previous_period?: { available?: boolean | null } } }
}

export type DashboardFunctionResponse = {
  ok: boolean
  data?: DashboardSnapshot
}
