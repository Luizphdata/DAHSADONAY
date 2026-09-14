import { CircleOff, Search } from 'lucide-react'
import type { DashboardKeyword } from '../../types/dashboard'
import { formatNumber } from '../../utils/formatters'

type GoogleKeywordsTableProps = {
  keywords: DashboardKeyword[]
}

function GoogleKeywordsTable({ keywords }: GoogleKeywordsTableProps) {
  const googleKeywords = [...keywords]
    .filter((item) => /google/i.test(item.channel))
    .sort((a, b) => b.contacts - a.contacts)

  return (
    <section className="rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-[#5475c3]">
          <Search className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Palabras clave de Google Ads</h3>
          <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Términos identificados en los contactos atribuidos a campañas de Google Ads.</p>
        </div>
      </div>

      {googleKeywords.length === 0 ? (
        <div className="mt-6 flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-[#dbe5ea] px-5 text-center">
          <CircleOff className="h-5 w-5 text-[#9aa8af]" strokeWidth={1.7} />
          <p className="mt-3 text-sm font-semibold text-[#687d8b]">Aún no hay suficientes datos de palabras clave para este período.</p>
          <p className="mt-1 text-xs text-[#94a1a8]">Estos parámetros se están recopilando en los nuevos contactos.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#e8eef1]">
          <table className="min-w-[620px] w-full border-collapse text-left">
            <thead className="bg-[#fbfcfd] text-xs font-semibold text-[#81919b]">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Palabra clave</th>
                <th className="px-4 py-3.5 font-semibold">Campaña</th>
                <th className="px-4 py-3.5 text-right font-semibold">Contactos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f3]">
              {googleKeywords.map((item) => (
                <tr className="transition hover:bg-[#fbfcfd]" key={`${item.channel}-${item.campaign}-${item.keyword}`}>
                  <td className="max-w-[270px] px-4 py-3.5">
                    <p className="truncate text-sm font-semibold text-ink" title={item.keyword}>{item.keyword}</p>
                  </td>
                  <td className="max-w-[320px] px-4 py-3.5">
                    <p className="truncate text-sm text-[#687d8b]" title={item.campaign}>{item.campaign}</p>
                  </td>
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

export default GoogleKeywordsTable
