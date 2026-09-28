import { hasPreviousCoverage } from '../utils/channelInsights'
import Overview from '../components/dashboard/Overview'
import { LayoutDashboard, ChartNoAxesCombined, GitBranch, ListFilter } from 'lucide-react'
import { lazy, Suspense, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  LogOut,
  Minus,
  RefreshCw,
  SlidersHorizontal,
  UserRound,
  Users,
} from 'lucide-react'
import CampaignsTable from '../components/dashboard/CampaignsTable'
import ContactButtonsCard from '../components/dashboard/ContactButtonsCard'
import GoogleKeywordsTable from '../components/dashboard/GoogleKeywordsTable'
import LandingPagesTable from '../components/dashboard/LandingPagesTable'
import MetaPlacementsTable from '../components/dashboard/MetaPlacementsTable'
import { DevicesCard, GoogleNetworkCard, MatchTypeCard } from '../components/dashboard/PaidMediaBreakdownCards'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import type { AttributionModel, DashboardPreset, DashboardRequest, DashboardSnapshot } from '../types/dashboard'
import { formatDate, formatDateTime, formatNumber, formatPercent } from '../utils/formatters'

const ContactsEvolutionChart = lazy(() => import('../components/dashboard/ContactsEvolutionChart'))
const ChannelDistributionChart = lazy(() => import('../components/dashboard/ChannelDistributionChart'))
const ConversionPagesChart = lazy(() => import('../components/dashboard/ConversionPagesChart'))

const presetOptions: Array<{ value: DashboardPreset; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'ayer', label: 'Ayer' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'mes_actual', label: 'Mes actual' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: 'personalizado', label: 'Personalizado' },
]

const attributionOptions: Array<{ value: AttributionModel; label: string }> = [
  { value: 'first', label: 'Primer contacto' },
  { value: 'last', label: 'Último contacto' },
]

function isDashboardPreset(value: string | null): value is DashboardPreset {
  return presetOptions.some((option) => option.value === value)
}

function isAttributionModel(value: string | null): value is AttributionModel {
  return attributionOptions.some((option) => option.value === value)
}

function isValidDateValue(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function formatNewContacts(value: number) {
  return `+${formatNumber(value)} ${value === 1 ? 'nuevo contacto' : 'nuevos contactos'}`
}

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) {
    return <span className="text-xs font-medium text-[#93a1aa]">Sin comparación</span>
  }

  const label = formatPercent(value, true)

  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7f8e98]">
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </span>
    )
  }

  const positive = value > 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-[#287d67]' : 'text-[#b45b58]'}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {label}
    </span>
  )
}

type MetricCardProps = {
  label: string
  value: number
  change: number | null
  icon: typeof Users
  iconClassName: string
  primary?: boolean
}

function MetricCard({ label, value, change, icon: Icon, iconClassName, primary = false }: MetricCardProps) {
  return (
    <article
      className={`min-h-[164px] rounded-2xl border bg-white p-5 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] transition hover:-translate-y-0.5 hover:shadow-card ${
        primary ? 'border-[#b9dfe4] ring-1 ring-[#e5f5f7]' : 'border-[#e4ebef]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {primary && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan">Principal</p>}
          <p className={`text-sm font-semibold ${primary ? 'text-ink' : 'text-[#687d8b]'}`}>{label}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClassName}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
      </div>
      <p className={`mt-7 font-['Manrope'] font-extrabold tracking-[-0.065em] text-ink ${primary ? 'text-[2.35rem]' : 'text-[2rem]'}`}>
        {formatNumber(value)}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-[#98a5ad]">vs. período anterior</span>
        <ChangeIndicator value={change} />
      </div>
    </article>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="min-h-[164px] animate-pulse rounded-2xl border border-[#e4ebef] bg-white p-5" key={index}>
            <div className="flex justify-between">
              <div className="h-4 w-24 rounded bg-[#e9eff2]" />
              <div className="h-9 w-9 rounded-xl bg-[#edf3f5]" />
            </div>
            <div className="mt-8 h-9 w-28 rounded-lg bg-[#e9eff2]" />
            <div className="mt-5 h-3 w-36 rounded bg-[#edf3f5]" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-[290px] animate-pulse rounded-2xl border border-[#e4ebef] bg-white" />
    </>
  )
}

function QualityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e6edf1] bg-[#fbfcfd] px-4 py-3.5">
      <p className="text-xs font-medium leading-5 text-[#81919b]">{label}</p>
      <p className="mt-1.5 font-['Manrope'] text-xl font-extrabold tracking-[-0.05em] text-ink">{value}</p>
    </div>
  )
}

function ChartLoadingCard({ height = 'h-[300px]' }: { height?: string }) {
  return (
    <section className="mt-6 rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7" aria-label="Cargando gráfico">
      <div className="h-5 w-48 animate-pulse rounded bg-[#e9eff2]" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[#edf3f5]" />
      <div className={`mt-6 w-full animate-pulse rounded-xl bg-[#fbfcfd] ${height}`} />
    </section>
  )
}

function DashboardContent({ snapshot }: { snapshot: DashboardSnapshot }) {
  const current = snapshot.kpis.current
  const changes = hasPreviousCoverage(snapshot) ? snapshot.kpis.change : { valid_clicks_pct: null, google_ads_pct: null, meta_ads_pct: null, organic_pct: null }
  const confirmedRate = Math.max(0, Math.min(100, current.confirmed_attribution_rate))
  const isPartialPeriod = snapshot.period.is_partial_period === true

  const metrics: MetricCardProps[] = [
    {
      label: 'Contactos',
      value: current.valid_clicks,
      change: changes.valid_clicks_pct,
      icon: Users,
      iconClassName: 'bg-[#e5f5f7] text-cyan',
      primary: true,
    },
    {
      label: 'Google Ads',
      value: current.google_ads_clicks,
      change: changes.google_ads_pct,
      icon: BarChart3,
      iconClassName: 'bg-[#edf3ff] text-[#5475c3]',
    },
    {
      label: 'Meta Ads',
      value: current.meta_ads_clicks,
      change: changes.meta_ads_pct,
      icon: ArrowRight,
      iconClassName: 'bg-[#f1efff] text-[#7567c1]',
    },
    {
      label: 'Orgánico',
      value: current.organic_clicks,
      change: changes.organic_pct,
      icon: UserRound,
      iconClassName: 'bg-[#edf7f1] text-[#4f9271]',
    },
    {
      label: 'Directo',
      value: current.direct_clicks,
      change: null,
      icon: ArrowDownRight,
      iconClassName: 'bg-[#f3f5f6] text-[#728591]',
    },
    {
      label: 'Referencia',
      value: current.referral_clicks,
      change: null,
      icon: SlidersHorizontal,
      iconClassName: 'bg-[#f3f5f6] text-[#728591]',
    },
  ]

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                Calidad de atribución
              </div>
              <h2 className="mt-2 max-w-sm font-['Manrope'] text-xl font-extrabold leading-tight tracking-[-0.045em] text-ink">
                Atribución confirmada
              </h2>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-['Manrope'] text-[3rem] font-extrabold leading-none tracking-[-0.08em] text-ink">
                  {formatPercent(current.confirmed_attribution_rate)}
                </span>
              </div>
              <div className="mt-5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-[#e9eff1]" aria-label="Tasa de atribución confirmada">
                <div className="h-full rounded-full bg-cyan transition-all" style={{ width: `${confirmedRate}%` }} />
              </div>
            </div>

            <div className="mt-7 flex items-start gap-3 border-t border-[#edf1f3] pt-5">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-cyan" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-semibold text-ink">Identificación de visitantes</p>
                <p className="mt-1 text-2xl font-extrabold tracking-[-0.05em] text-ink">
                  {formatPercent(current.visitor_id_coverage_rate)}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-[#8797a0]">
                  La identificación de visitantes comenzó recientemente, por lo que la cobertura histórica aún es limitada.
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#4d6473]">Origen de la atribución</p>
                <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Distribución de contactos según el nivel de confirmación.</p>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-[#edf7f1] px-3 py-1.5 text-xs font-semibold text-[#398067] sm:inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                Procesado
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <QualityStat label="Confirmada" value={formatNumber(current.confirmed_attribution_clicks)} />
              <QualityStat label="Inferida histórica" value={formatNumber(current.inferred_attribution_clicks)} />
              <QualityStat label="Legacy" value={formatNumber(current.legacy_attribution_clicks)} />
            </div>
            {isPartialPeriod && (
              <p className="mt-5 text-xs text-[#8a99a2]">Los datos del período actual están en curso.</p>
            )}
          </div>
        </div>
      </section>

      <Suspense fallback={<ChartLoadingCard height="h-[300px] sm:h-[360px]" />}>
        <ContactsEvolutionChart data={snapshot.timeseries.comparison} comparisonAvailable={hasPreviousCoverage(snapshot)} />
      </Suspense>
      <Suspense fallback={<ChartLoadingCard height="h-[300px] sm:h-[350px]" />}>
        <ChannelDistributionChart data={snapshot.breakdowns.channels} totalValidContacts={current.valid_clicks} />
      </Suspense>
      <CampaignsTable campaigns={snapshot.campaigns.campaigns} />

      <section className="mt-10">
        <div>
          <h2 className="font-['Manrope'] text-2xl font-extrabold tracking-[-0.055em] text-ink">Páginas y puntos de conversión</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#81919b]">Identifica dónde llegan los usuarios y en qué páginas generan el contacto.</p>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <LandingPagesTable pages={snapshot.breakdowns.landing_pages} totalValidContacts={current.valid_clicks} />
          <Suspense fallback={<ChartLoadingCard height="h-[300px] sm:h-[350px]" />}>
            <ConversionPagesChart pages={snapshot.breakdowns.click_pages} totalValidContacts={current.valid_clicks} />
          </Suspense>
        </div>
        <ContactButtonsCard buttons={snapshot.breakdowns.buttons} totalValidContacts={current.valid_clicks} />
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-['Manrope'] text-2xl font-extrabold tracking-[-0.055em] text-ink">Detalle de medios pagados</h2>
            <p className="mt-1.5 text-sm leading-6 text-[#81919b]">Información técnica capturada desde Google Ads y Meta Ads.</p>
          </div>
          <div className="flex max-w-xl items-start gap-2.5 rounded-xl border border-[#e8e4d9] bg-[#fffdf7] px-4 py-3 text-xs leading-5 text-[#89795c]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>Estos parámetros comenzaron a recopilarse recientemente. Los datos históricos pueden no incluir dispositivo, red, concordancia o ubicación.</span>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <GoogleKeywordsTable keywords={snapshot.breakdowns.keywords ?? []} />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <DevicesCard devices={snapshot.breakdowns.devices ?? []} />
            <GoogleNetworkCard networks={snapshot.breakdowns.networks ?? []} />
            <MatchTypeCard matchtypes={snapshot.breakdowns.matchtypes ?? []} />
          </div>
          <MetaPlacementsTable placements={snapshot.breakdowns.meta_placements ?? []} />
        </div>
      </section>
    </>
  )
}

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'overview' | 'detail'>('overview')
  const initialPresetValue = searchParams.get('preset')
  const initialAttributionValue = searchParams.get('attribution')
  const initialPreset = isDashboardPreset(initialPresetValue) ? initialPresetValue : 'mes_actual'
  const initialAttribution = isAttributionModel(initialAttributionValue) ? initialAttributionValue : 'last'
  const initialStart = searchParams.get('start') ?? ''
  const initialEnd = searchParams.get('end') ?? ''
  const initialCustomDatesAreValid = initialPreset === 'personalizado' && isValidDateValue(initialStart) && isValidDateValue(initialEnd) && initialStart <= initialEnd

  const [preset, setPreset] = useState<DashboardPreset>(initialPreset)
  const [attribution, setAttribution] = useState<AttributionModel>(initialAttribution)
  const [customStart, setCustomStart] = useState(initialStart)
  const [customEnd, setCustomEnd] = useState(initialEnd)
  const [appliedCustomStart, setAppliedCustomStart] = useState<string | null>(initialCustomDatesAreValid ? initialStart : null)
  const [appliedCustomEnd, setAppliedCustomEnd] = useState<string | null>(initialCustomDatesAreValid ? initialEnd : null)
  const [filterValidationError, setFilterValidationError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { signOut } = useAuth()
  const filters = useMemo<DashboardRequest | null>(() => {
    if (preset === 'personalizado') {
      if (!appliedCustomStart || !appliedCustomEnd) return null

      return {
        preset,
        attribution_model: attribution,
        custom_start: appliedCustomStart,
        custom_end: appliedCustomEnd,
        limit: 15,
      }
    }

    return {
      preset,
      attribution_model: attribution,
      custom_start: null,
      custom_end: null,
      limit: 15,
    }
  }, [appliedCustomEnd, appliedCustomStart, attribution, preset])
  const { data, loading, error, backgroundError, reload, refreshing, newContacts, isOffline } = useDashboard(filters)
  const navigate = useNavigate()

  function updateUrl(nextPreset: DashboardPreset, nextAttribution: AttributionModel, start?: string | null, end?: string | null) {
    const params = new URLSearchParams()
    params.set('preset', nextPreset)
    params.set('attribution', nextAttribution)

    if (nextPreset === 'personalizado' && start && end) {
      params.set('start', start)
      params.set('end', end)
    }

    setSearchParams(params, { replace: true })
  }

  function handlePresetChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextPreset = event.target.value as DashboardPreset
    setFilterValidationError('')
    setPreset(nextPreset)

    if (nextPreset === 'personalizado') {
      setAppliedCustomStart(null)
      setAppliedCustomEnd(null)
      updateUrl(nextPreset, attribution)
      return
    }

    setCustomStart('')
    setCustomEnd('')
    setAppliedCustomStart(null)
    setAppliedCustomEnd(null)
    updateUrl(nextPreset, attribution)
  }

  function handleAttributionChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextAttribution = event.target.value as AttributionModel
    setAttribution(nextAttribution)
    setFilterValidationError('')
    updateUrl(preset, nextAttribution, appliedCustomStart, appliedCustomEnd)
  }

  function handleApplyCustomPeriod() {
    if (!customStart || !customEnd || !isValidDateValue(customStart) || !isValidDateValue(customEnd)) {
      setFilterValidationError('Selecciona una fecha válida de inicio y una fecha válida de término.')
      return
    }

    if (customStart > customEnd) {
      setFilterValidationError('La fecha de inicio no puede ser posterior a la fecha de término.')
      return
    }

    setFilterValidationError('')
    setAppliedCustomStart(customStart)
    setAppliedCustomEnd(customEnd)
    updateUrl('personalizado', attribution, customStart, customEnd)
  }

  async function handleSignOut() {
    setLogoutError('')
    setIsSigningOut(true)

    try {
      const { error: signOutError } = await signOut()

      if (signOutError) {
        setLogoutError('No fue posible cerrar la sesión. Inténtalo nuevamente.')
        return
      }

      navigate('/login', { replace: true })
    } catch {
      setLogoutError('No fue posible cerrar la sesión. Inténtalo nuevamente.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand"><img src="/brand/adonay-logo.jpeg" alt="Clínica Dental Adonay" /><span>Panel de resultados</span></div>
        <nav aria-label="Navegación principal">
          <button onClick={() => setView('overview')} className={view === 'overview' ? 'active' : ''} aria-current={view === 'overview' ? 'page' : undefined}><LayoutDashboard size={18} />Visión general</button>
          <a href="#origins" onClick={() => setView('overview')}><GitBranch size={18} />Orígenes</a>
          <a href="#evolution" onClick={() => setView('overview')}><ChartNoAxesCombined size={18} />Evolución</a>
          <button onClick={() => setView('detail')} className={view === 'detail' ? 'active' : ''} aria-current={view === 'detail' ? 'page' : undefined}><ListFilter size={18} />Análisis detallado</button>
        </nav>
        <div className="dashboard-account"><span>Equipo Adonay</span><button onClick={handleSignOut} disabled={isSigningOut}>{isSigningOut ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}Cerrar sesión</button></div>
      </aside>
      <div className="dashboard-workspace">
        <header className="dashboard-topbar"><span>Adonay / {view === 'overview' ? 'Visión general' : 'Análisis detallado'}</span><div className="dashboard-update" aria-live="polite"><Clock3 size={14} /><span>{refreshing ? 'Actualizando…' : 'Actualizado: ' + formatDateTime(data?.period.generated_at)}</span><button aria-label="Actualizar datos" onClick={() => void reload()} disabled={refreshing || loading || isOffline || !filters}><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /></button>{isOffline && <span>Sin conexión</span>}{newContacts > 0 && <span>{formatNewContacts(newContacts)}</span>}</div></header>
        <div className="dashboard-title"><h1>{view === 'overview' ? 'Visión general' : 'Análisis detallado'}</h1><p>{view === 'overview' ? 'Tus contactos y de dónde vienen.' : 'Campañas, páginas y calidad de atribución.'}</p></div>
        <section className="border-b border-[#e2eaee] py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <label className="flex min-w-[220px] flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#81919b]">Período</span>
                  <span className="relative flex items-center rounded-xl border border-[#dbe5ea] bg-white shadow-[0_5px_18px_-16px_rgba(16,38,63,0.45)]">
                    <CalendarDays className="pointer-events-none absolute left-3.5 h-4 w-4 text-cyan" strokeWidth={1.8} />
                    <select
                      aria-label="Período"
                      value={preset}
                      onChange={handlePresetChange}
                      className="h-11 w-full appearance-none rounded-xl bg-transparent pl-10 pr-4 text-sm font-semibold text-ink outline-none focus:ring-4 focus:ring-cyan/10"
                    >
                      {presetOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="flex min-w-[220px] flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#81919b]">Modelo de atribución</span>
                  <span className="relative flex items-center rounded-xl border border-[#dbe5ea] bg-white shadow-[0_5px_18px_-16px_rgba(16,38,63,0.45)]">
                    <SlidersHorizontal className="pointer-events-none absolute left-3.5 h-4 w-4 text-cyan" strokeWidth={1.8} />
                    <select
                      aria-label="Modelo de atribución"
                      value={attribution}
                      onChange={handleAttributionChange}
                      className="h-11 w-full appearance-none rounded-xl bg-transparent pl-10 pr-4 text-sm font-semibold text-ink outline-none focus:ring-4 focus:ring-cyan/10"
                    >
                      {attributionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#81919b]">
                {filters !== null && data?.period.is_partial_period === true && (
                  <span className="inline-flex items-center rounded-full border border-[#dbe9e7] bg-[#f2faf7] px-3 py-1.5 font-semibold text-[#42816d]">
                    Datos hasta hoy{data.period.cutoff_local_time ? ` · corte ${data.period.cutoff_local_time}` : ''}
                  </span>
                )}
              </div>
            </div>

            {preset === 'personalizado' && (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#e4ebef] bg-[#fbfcfd] p-4 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#81919b]">Desde</span>
                  <input type="date" value={customStart} onChange={(event) => { setCustomStart(event.target.value); setFilterValidationError('') }} className="h-11 rounded-xl border border-[#dbe5ea] bg-white px-3 text-sm font-medium text-ink outline-none focus:border-cyan focus:ring-4 focus:ring-cyan/10" />
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#81919b]">Hasta</span>
                  <input type="date" value={customEnd} onChange={(event) => { setCustomEnd(event.target.value); setFilterValidationError('') }} className="h-11 rounded-xl border border-[#dbe5ea] bg-white px-3 text-sm font-medium text-ink outline-none focus:border-cyan focus:ring-4 focus:ring-cyan/10" />
                </label>
                <button type="button" onClick={handleApplyCustomPeriod} className="h-11 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-[#183b5c] focus:outline-none focus:ring-4 focus:ring-ink/15">Aplicar</button>
              </div>
            )}

            {filterValidationError && <p className="text-sm font-medium text-[#b45b58]" role="alert">{filterValidationError}</p>}
            {attribution === 'first' ? (
              <p className="text-xs text-[#8a99a2]">Primer contacto: origen por el que el contacto llegó inicialmente.</p>
            ) : (
              <p className="text-xs text-[#8a99a2]">Último contacto: último origen identificado antes de la conversión.</p>
            )}
            {filters !== null && data && (
              <p className="text-xs text-[#8a99a2]">
                {data.period.label} · {formatDate(data.period.start_date)} — {formatDate(data.period.end_date)}
              </p>
            )}
          </div>
        </section>

        <section className="dashboard-results" aria-busy={loading || refreshing}>
          {logoutError && (
            <p className="mb-6 rounded-xl border border-[#f0d5d2] bg-[#fff8f7] px-4 py-3 text-sm leading-5 text-[#a54842]" role="alert">
              {logoutError}
            </p>
          )}

          {filters === null && (
            <div className="rounded-2xl border border-dashed border-[#dbe5ea] bg-white p-8 text-center shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)]">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e5f5f7] text-cyan">
                <CalendarDays className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h2 className="mt-5 font-['Manrope'] text-xl font-extrabold tracking-[-0.04em] text-ink">Selecciona un período personalizado</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#80919e]">Define las fechas Desde y Hasta y presiona Aplicar para cargar los datos.</p>
            </div>
          )}

          {filters !== null && loading && !data && <DashboardSkeleton />}

          {filters !== null && !loading && error && !data && (
            <div className="rounded-2xl border border-[#f0d5d2] bg-white p-8 text-center shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)]">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff3f1] text-[#b45c59]">
                <CircleAlert className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h2 className="mt-5 font-['Manrope'] text-xl font-extrabold tracking-[-0.04em] text-ink">No fue posible cargar los datos.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#80919e]">Comprueba tu conexión y vuelve a intentarlo.</p>
              <button
                type="button"
                onClick={() => void reload()}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-[#183b5c] focus:outline-none focus:ring-4 focus:ring-ink/15"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2} />
                Intentar nuevamente
              </button>
            </div>
          )}

          {filters !== null && data && backgroundError && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#f0d8c9] bg-[#fffaf6] px-5 py-4 text-sm text-[#a86b43] sm:flex-row sm:items-center sm:justify-between">
              <span>No fue posible actualizar los datos.</span>
              <button type="button" onClick={() => void reload()} className="inline-flex w-fit items-center gap-2 font-semibold text-[#8e5c3e] hover:text-ink">
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>
            </div>
          )}

          {filters !== null && data && (
            <>
              {!data.integrity.core_totals_match && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#f0d8c9] bg-[#fffaf6] px-5 py-4 text-sm text-[#a86b43]" role="alert">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
                  <span>Se detectó una inconsistencia en los datos.</span>
                </div>
              )}
              {view === 'overview' ? <Overview snapshot={data} attribution={attribution} /> : <DashboardContent snapshot={data} />}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default Dashboard
