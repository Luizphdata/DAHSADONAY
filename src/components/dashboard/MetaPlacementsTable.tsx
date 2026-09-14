import { CircleOff, Layers3 } from 'lucide-react'
import type { DashboardMetaPlacement } from '../../types/dashboard'
import { formatNumber } from '../../utils/formatters'

type MetaPlacementsTableProps = {
  placements: DashboardMetaPlacement[]
}

function MetaPlacementsTable({ placements }: MetaPlacementsTableProps) {
  const orderedPlacements = [...placements].sort((a, b) => b.contacts - a.contacts)

  return (
    <section className="rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#7567c1]">
          <Layers3 className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Ubicaciones de Meta Ads</h3>
          <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Origen y placement registrados en los contactos provenientes de Meta.</p>
        </div>
      </div>

      {orderedPlacements.length === 0 ? (
        <div className="mt-6 flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-[#dbe5ea] px-5 text-center">
          <CircleOff className="h-5 w-5 text-[#9aa8af]" strokeWidth={1.7} />
          <p className="mt-3 text-sm font-semibold text-[#687d8b]">Aún no hay datos suficientes.</p>
          <p className="mt-1 text-xs leading-5 text-[#94a1a8]">Estos parámetros se están recopilando en los nuevos contactos.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#e8eef1]">
          <table className="min-w-[560px] w-full border-collapse text-left">
            <thead className="bg-[#fbfcfd] text-xs font-semibold text-[#81919b]">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Origen</th>
                <th className="px-4 py-3.5 font-semibold">Ubicación</th>
                <th className="px-4 py-3.5 text-right font-semibold">Contactos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f3]">
              {orderedPlacements.map((item) => (
                <tr className="transition hover:bg-[#fbfcfd]" key={`${item.source}-${item.placement}`}>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ink">{item.source}</td>
                  <td className="px-4 py-3.5 text-sm text-[#687d8b]">{item.placement}</td>
                  <td className="px-4 py-3.5 text-right font-['Manrope'] text-sm font-extrabold text-ink">{formatNumber(item.contacts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default MetaPlacementsTable
