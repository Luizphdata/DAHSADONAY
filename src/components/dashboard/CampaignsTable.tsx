import type { DashboardCampaign, DashboardCampaignConfidence } from '../../types/dashboard'
import { formatNumber, formatPercent } from '../../utils/formatters'

function confidenceValues(confidence: DashboardCampaignConfidence) {
  const total = confidence.confirmed + confidence.confirmed_by_referrer + confidence.inferred_historical + confidence.legacy + confidence.unidentified
  const highConfidence = confidence.confirmed + confidence.confirmed_by_referrer

  return {
    total,
    highConfidence,
    rate: total > 0 ? (highConfidence / total) * 100 : 0,
  }
}

function confidenceLabel(confidence: DashboardCampaignConfidence) {
  const { total, highConfidence } = confidenceValues(confidence)
  if (total === 0) return 'Mixta'

  const highRate = highConfidence / total
  const inferredRate = confidence.inferred_historical / total
  const legacyRate = confidence.legacy / total

  if (highRate >= 0.9) return 'Confirmada'
  if (legacyRate >= 0.5) return 'Legacy'
  if (inferredRate >= 0.3) return 'Inferida'
  return 'Mixta'
}

function confidenceBadgeClass(label: string) {
  if (label === 'Confirmada') return 'bg-[#edf7f1] text-[#398067]'
  if (label === 'Inferida') return 'bg-[#fff5e8] text-[#a86b43]'
  if (label === 'Legacy') return 'bg-[#f2f3f5] text-[#6f808b]'
  return 'bg-[#f0efff] text-[#7567c1]'
}

function CampaignConfidence({ confidence }: { confidence: DashboardCampaignConfidence }) {
  const { rate } = confidenceValues(confidence)
  const label = confidenceLabel(confidence)
  const detail = `Confirmada: ${confidence.confirmed} · Confirmada por referencia: ${confidence.confirmed_by_referrer} · Inferida histórica: ${confidence.inferred_historical} · Legacy: ${confidence.legacy}`

  return (
    <div className="min-w-[150px]" title={detail}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-semibold ${confidenceBadgeClass(label)}`}>{label}</span>
        <span className="font-semibold text-[#6f818d]">{formatPercent(rate, false)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e9eff1]">
        <div className="h-full rounded-full bg-cyan" style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] leading-4 text-[#93a1aa]">C {confidence.confirmed} · Ref {confidence.confirmed_by_referrer} · Inf {confidence.inferred_historical} · L {confidence.legacy}</p>
    </div>
  )
}

type CampaignsTableProps = {
  campaigns: DashboardCampaign[]
}

function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const orderedCampaigns = [...campaigns].sort((a, b) => b.contacts - a.contacts)

  return (
    <section className="mt-6 rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div>
        <h2 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Rendimiento por campañas</h2>
        <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Campañas con mayor volumen de contactos atribuidos.</p>
      </div>

      {orderedCampaigns.length === 0 ? (
        <div className="mt-7 grid h-[180px] place-items-center rounded-xl border border-dashed border-[#dbe5ea] text-sm text-[#81919b]">
          No hay campañas identificadas para este período.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#e8eef1]">
          <table className="min-w-[780px] w-full border-collapse text-left">
            <thead className="bg-[#fbfcfd] text-xs font-semibold text-[#81919b]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Campaña</th>
                <th className="px-4 py-3.5 font-semibold">Canal</th>
                <th className="px-4 py-3.5 text-right font-semibold">Contactos</th>
                <th className="px-4 py-3.5 text-right font-semibold">Participación</th>
                <th className="px-4 py-3.5 font-semibold">Calidad</th>
                <th className="px-5 py-3.5 font-semibold">Confianza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f3]">
              {orderedCampaigns.map((campaign) => (
                <tr className="transition hover:bg-[#fbfcfd]" key={`${campaign.channel}-${campaign.campaign}`}>
                  <td className="max-w-[270px] px-5 py-4">
                    <p className="truncate text-sm font-semibold text-ink" title={campaign.campaign}>{campaign.campaign}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[#657b89]">{campaign.channel}</td>
                  <td className="px-4 py-4 text-right font-['Manrope'] text-sm font-extrabold tracking-[-0.02em] text-ink">{formatNumber(campaign.contacts)}</td>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-[#657b89]">{formatPercent(campaign.share_pct, false)}</td>
                  <td className="px-4 py-4"><CampaignConfidence confidence={campaign.confidence} /></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceBadgeClass(confidenceLabel(campaign.confidence))}`}>{confidenceLabel(campaign.confidence)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default CampaignsTable
