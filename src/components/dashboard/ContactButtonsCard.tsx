import type { DashboardButton } from '../../types/dashboard'
import { formatNumber, formatPercent } from '../../utils/formatters'

type ContactButtonsCardProps = {
  buttons: DashboardButton[]
  totalValidContacts: number
}

function ContactButtonsCard({ buttons, totalValidContacts }: ContactButtonsCardProps) {
  const orderedButtons = [...buttons].sort((a, b) => b.contacts - a.contacts)
  const maxContacts = orderedButtons[0]?.contacts ?? 0

  return (
    <section className="mt-6 rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div>
        <h3 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Botones de contacto</h3>
        <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Elementos utilizados para iniciar la conversación.</p>
      </div>

      {orderedButtons.length === 0 ? (
        <div className="mt-7 grid h-[180px] place-items-center rounded-xl border border-dashed border-[#dbe5ea] text-sm text-[#81919b]">
          No hay información de botones para este período.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orderedButtons.map((item, index) => {
            const percentage = totalValidContacts > 0 ? (item.contacts / totalValidContacts) * 100 : 0
            const width = maxContacts > 0 ? (item.contacts / maxContacts) * 100 : 0
            const isUnknown = item.button === 'No identificado'

            return (
              <div className="rounded-xl border border-[#e8eef1] bg-[#fbfcfd] px-4 py-4" key={item.button} title={isUnknown ? 'El texto del botón no estaba disponible en este registro.' : undefined}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-[#82939d]">{index + 1}</span>
                    <p className={`truncate text-sm font-semibold ${isUnknown ? 'text-[#81919b]' : 'text-ink'}`}>{item.button}</p>
                  </div>
                  <p className="shrink-0 font-['Manrope'] text-lg font-extrabold tracking-[-0.04em] text-ink">{formatNumber(item.contacts)}</p>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e8eef0]">
                  <div className={`h-full rounded-full ${isUnknown ? 'bg-[#9aa7ad]' : 'bg-cyan'}`} style={{ width: `${Math.min(100, Math.max(0, width))}%` }} />
                </div>
                <p className="mt-2 text-xs text-[#8a99a2]">{formatPercent(percentage, false)} de los contactos válidos</p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ContactButtonsCard
