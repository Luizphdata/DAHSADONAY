import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import type { DashboardClickPage } from '../../types/dashboard'
import { formatPageUrl } from '../../utils/pageUrl'
import { formatNumber, formatPercent } from '../../utils/formatters'

type ConversionPageRow = DashboardClickPage & {
  percentage: number
}

function ConversionTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload as ConversionPageRow | undefined
  if (!row) return null

  return (
    <div className="min-w-[210px] rounded-2xl border border-[#e1e9ed] bg-white p-4 shadow-[0_16px_40px_-20px_rgba(16,38,63,0.32)]">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan">Página completa</p>
      <p className="mt-1 break-all text-sm font-semibold text-ink">{row.page}</p>
      <p className="mt-3 font-['Manrope'] text-xl font-extrabold tracking-[-0.04em] text-ink">{formatNumber(row.contacts)} contactos</p>
      <p className="mt-1 text-xs text-[#81919b]">{formatPercent(row.percentage)} del total válido</p>
    </div>
  )
}

type ConversionPagesChartProps = {
  pages: DashboardClickPage[]
  totalValidContacts: number
}

function ConversionPagesChart({ pages, totalValidContacts }: ConversionPagesChartProps) {
  const chartData: ConversionPageRow[] = [...pages]
    .sort((a, b) => b.contacts - a.contacts)
    .map((page) => ({
      ...page,
      percentage: totalValidContacts > 0 ? (page.contacts / totalValidContacts) * 100 : 0,
    }))

  return (
    <section className="rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div>
        <h3 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Páginas de conversión</h3>
        <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Páginas donde el usuario hizo clic para iniciar el contacto.</p>
      </div>

      {chartData.length === 0 ? (
        <div className="mt-7 grid h-[260px] place-items-center rounded-xl border border-dashed border-[#dbe5ea] text-sm text-[#81919b]">
          No hay páginas de conversión para este período.
        </div>
      ) : (
        <div className="mt-6 h-[300px] w-full sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="#e9eff2" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: '#81919b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="page"
                width={138}
                tickFormatter={formatPageUrl}
                tick={{ fill: '#526a79', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ConversionTooltip />} cursor={{ fill: '#f7fafb' }} />
              <Bar dataKey="contacts" fill="#0b9eb5" radius={[0, 7, 7, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default ConversionPagesChart
