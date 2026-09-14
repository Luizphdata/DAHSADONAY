import { CircleOff, GitBranch, Globe2, Monitor, Smartphone, Tablet } from 'lucide-react'
import type { DashboardDevice, DashboardMatchType, DashboardNetwork } from '../../types/dashboard'
import { formatNumber, formatPercent } from '../../utils/formatters'

function formatPercentage(value: number, total: number) {
  return formatPercent(total > 0 ? (value / total) * 100 : 0, false)
}

function TechnicalEmptyState({ message }: { message: string }) {
  return (
    <div className="mt-5 flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-[#dbe5ea] px-4 text-center">
      <CircleOff className="h-5 w-5 text-[#9aa8af]" strokeWidth={1.7} />
      <p className="mt-3 text-sm font-semibold text-[#687d8b]">Aún no hay datos suficientes.</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-[#94a1a8]">{message}</p>
    </div>
  )
}

function RankingRow({ label, contacts, total, icon }: { label: string; contacts: number; total: number; icon?: typeof Smartphone }) {
  const Icon = icon
  const width = total > 0 ? (contacts / total) * 100 : 0

  return (
    <div className="rounded-xl border border-[#e8eef1] bg-[#fbfcfd] px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-cyan" strokeWidth={1.8} />}
          <p className="truncate text-sm font-semibold text-ink">{label}</p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-['Manrope'] text-base font-extrabold tracking-[-0.03em] text-ink">{formatNumber(contacts)}</span>
          <span className="text-xs font-semibold text-[#81919b]">{formatPercentage(contacts, total)}</span>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8eef0]">
        <div className="h-full rounded-full bg-cyan" style={{ width: `${Math.min(100, Math.max(0, width))}%` }} />
      </div>
    </div>
  )
}

type DevicesCardProps = {
  devices: DashboardDevice[]
}

export function DevicesCard({ devices }: DevicesCardProps) {
  const orderedDevices = [...devices].sort((a, b) => b.contacts - a.contacts)
  const total = orderedDevices.reduce((sum, item) => sum + Math.max(0, item.contacts), 0)

  function getIcon(device: string) {
    const normalized = device.toLowerCase()
    if (normalized.includes('móvil') || normalized.includes('movil')) return Smartphone
    if (normalized.includes('tablet')) return Tablet
    return Monitor
  }

  return (
    <section className="rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f5f7] text-cyan">
          <Smartphone className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-['Manrope'] text-lg font-extrabold tracking-[-0.04em] text-ink">Dispositivos</h3>
          <p className="mt-1 text-sm leading-5 text-[#8a99a2]">Registros técnicos disponibles por dispositivo.</p>
        </div>
      </div>
      {orderedDevices.length === 0 ? (
        <TechnicalEmptyState message="Estos parámetros se están recopilando en los nuevos contactos." />
      ) : (
        <div className="mt-5 space-y-3">
          {orderedDevices.map((item) => <RankingRow key={item.device} label={item.device} contacts={item.contacts} total={total} icon={getIcon(item.device)} />)}
        </div>
      )}
    </section>
  )
}

type GoogleNetworkCardProps = {
  networks: DashboardNetwork[]
}

export function GoogleNetworkCard({ networks }: GoogleNetworkCardProps) {
  const orderedNetworks = [...networks].sort((a, b) => b.contacts - a.contacts)
  const total = orderedNetworks.reduce((sum, item) => sum + Math.max(0, item.contacts), 0)

  return (
    <section className="rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-[#5475c3]">
          <Globe2 className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-['Manrope'] text-lg font-extrabold tracking-[-0.04em] text-ink">Red de Google Ads</h3>
          <p className="mt-1 text-sm leading-5 text-[#8a99a2]">Distribución de los registros técnicos capturados.</p>
        </div>
      </div>
      {orderedNetworks.length === 0 ? (
        <TechnicalEmptyState message="Los datos de red comenzarán a aparecer con los nuevos contactos rastreados." />
      ) : (
        <div className="mt-5 space-y-3">
          {orderedNetworks.map((item) => <RankingRow key={item.network} label={item.network} contacts={item.contacts} total={total} icon={Globe2} />)}
        </div>
      )}
    </section>
  )
}

type MatchTypeCardProps = {
  matchtypes: DashboardMatchType[]
}

export function MatchTypeCard({ matchtypes }: MatchTypeCardProps) {
  const preferredOrder = ['Exacta', 'Frase', 'Amplia']
  const orderedMatchtypes = [...matchtypes].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.matchtype)
    const bIndex = preferredOrder.indexOf(b.matchtype)
    if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
    return b.contacts - a.contacts
  })
  const total = orderedMatchtypes.reduce((sum, item) => sum + Math.max(0, item.contacts), 0)

  return (
    <section className="rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#7567c1]">
          <GitBranch className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-['Manrope'] text-lg font-extrabold tracking-[-0.04em] text-ink">Tipo de concordancia</h3>
          <p className="mt-1 text-sm leading-5 text-[#8a99a2]">Participación sobre los registros disponibles.</p>
        </div>
      </div>
      {orderedMatchtypes.length === 0 ? (
        <TechnicalEmptyState message="Estos parámetros se están recopilando en los nuevos contactos." />
      ) : (
        <div className="mt-5 space-y-3">
          {orderedMatchtypes.map((item) => <RankingRow key={item.matchtype} label={item.matchtype} contacts={item.contacts} total={total} icon={GitBranch} />)}
        </div>
      )}
    </section>
  )
}
