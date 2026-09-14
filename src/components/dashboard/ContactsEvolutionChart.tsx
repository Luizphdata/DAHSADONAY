import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import type { DashboardTimeseriesComparisonPoint } from '../../types/dashboard'
import { formatDate, formatNumber } from '../../utils/formatters'

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload as DashboardTimeseriesComparisonPoint | undefined
  if (!point) return null

  return (
    <div className="min-w-[220px] rounded-2xl border border-[#e1e9ed] bg-white p-4 shadow-[0_16px_40px_-20px_rgba(16,38,63,0.32)]">
      <div className="border-b border-[#edf1f3] pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan">Período actual</p>
        <p className="mt-1 text-sm font-semibold text-ink">{formatDate(point.current_day)}</p>
        <p className="mt-1 font-['Manrope'] text-xl font-extrabold tracking-[-0.04em] text-ink">
          {formatNumber(point.current_contacts)} contactos
        </p>
        {point.is_partial_day && <span className="mt-2 inline-flex rounded-full bg-[#fff5e8] px-2 py-1 text-[11px] font-semibold text-[#a86b43]">Día en curso</span>}
      </div>
      <div className="pt-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#82939d]">Período anterior</p>
        <p className="mt-1 text-sm font-semibold text-[#526a79]">{formatDate(point.previous_day)}</p>
        <p className="mt-1 font-['Manrope'] text-lg font-extrabold tracking-[-0.04em] text-[#526a79]">
          {formatNumber(point.previous_contacts)} contactos
        </p>
      </div>
    </div>
  )
}

type ContactsEvolutionChartProps = {
  data: DashboardTimeseriesComparisonPoint[]
}

function ContactsEvolutionChart({ data }: ContactsEvolutionChartProps) {
  return (
    <section className="mt-6 rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Evolución de contactos</h2>
          <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Comparación con el período anterior.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#718492]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan" />
            Período actual
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ink" />
            Período anterior
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-8 grid h-[280px] place-items-center rounded-xl border border-dashed border-[#dbe5ea] text-sm text-[#81919b]">
          No hay datos de evolución para este período.
        </div>
      ) : (
        <div className="mt-6 h-[300px] w-full sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid stroke="#e9eff2" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="current_day"
                tickFormatter={(value) => formatDate(value, false)}
                tick={{ fill: '#81919b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#81919b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={38}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbdde2', strokeDasharray: '4 4' }} />
              <Line
                type="monotone"
                dataKey="current_contacts"
                stroke="#0b9eb5"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#0b9eb5', stroke: '#ffffff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="previous_contacts"
                stroke="#10263f"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: '#10263f', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default ContactsEvolutionChart
