import type { DashboardLandingPage } from '../../types/dashboard'
import { formatPageUrl } from '../../utils/pageUrl'
import { formatNumber, formatPercent } from '../../utils/formatters'

function qualityLabel(quality: string) {
  if (quality === 'First Touch capturado' || quality === 'Last Touch capturado') return 'Captura directa'
  if (quality === 'Fallback histórico') return 'Histórico'
  if (quality === 'Fallback página del clique') return 'Estimado'
  if (quality === 'No identificada') return 'No identificada'
  return quality
}

function qualityClass(quality: string) {
  if (quality === 'First Touch capturado' || quality === 'Last Touch capturado') return 'bg-[#edf7f1] text-[#398067]'
  if (quality === 'Fallback histórico') return 'bg-[#fff5e8] text-[#a86b43]'
  if (quality === 'Fallback página del clique') return 'bg-[#f0efff] text-[#7567c1]'
  return 'bg-[#f2f3f5] text-[#6f808b]'
}

type LandingPagesTableProps = {
  pages: DashboardLandingPage[]
  totalValidContacts: number
}

function LandingPagesTable({ pages, totalValidContacts }: LandingPagesTableProps) {
  const orderedPages = [...pages].sort((a, b) => b.contacts - a.contacts)

  return (
    <section className="rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div>
        <h3 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Páginas de destino</h3>
        <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Dónde entraron los usuarios antes de iniciar el contacto.</p>
      </div>

      <p className="mt-5 rounded-xl bg-[#fbfcfd] px-4 py-3 text-xs leading-5 text-[#7f909b]">
        Parte del historial utiliza la página registrada antes de la implementación completa de First Touch y Last Touch.
      </p>

      {orderedPages.length === 0 ? (
        <div className="mt-5 grid h-[170px] place-items-center rounded-xl border border-dashed border-[#dbe5ea] text-sm text-[#81919b]">
          No hay páginas de destino identificadas para este período.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#e8eef1]">
          <table className="min-w-[650px] w-full border-collapse text-left">
            <thead className="bg-[#fbfcfd] text-xs font-semibold text-[#81919b]">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Página</th>
                <th className="px-4 py-3.5 text-right font-semibold">Contactos</th>
                <th className="px-4 py-3.5 text-right font-semibold">Participación</th>
                <th className="px-4 py-3.5 font-semibold">Calidad del dato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f3]">
              {orderedPages.map((page) => {
                const percentage = totalValidContacts > 0 ? (page.contacts / totalValidContacts) * 100 : 0
                return (
                  <tr className="transition hover:bg-[#fbfcfd]" key={`${page.page}-${page.quality}`}>
                    <td className="max-w-[250px] px-4 py-3.5">
                      <p className="truncate text-sm font-semibold text-ink" title={page.page}>{formatPageUrl(page.page)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-['Manrope'] text-sm font-extrabold text-ink">{formatNumber(page.contacts)}</td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#657b89]">{formatPercent(percentage, false)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${qualityClass(page.quality)}`} title={page.quality}>
                        {qualityLabel(page.quality)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default LandingPagesTable
