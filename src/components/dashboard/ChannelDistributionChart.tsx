import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import type { DashboardChannelBreakdown } from '../../types/dashboard'
import { getChannelColor } from '../../utils/channelColors'
import { formatNumber, formatPercent } from '../../utils/formatters'

type ChannelChartRow = DashboardChannelBreakdown & {
  percentage: number
}

function ChannelTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload as ChannelChartRow | undefined
  if (!row) return null

  return (
    <div className="min-w-[190px] rounded-2xl border border-[#e1e9ed] bg-white p-4 shadow-[0_16px_40px_-20px_rgba(16,38,63,0.32)]">
      <p className="text-sm font-semibold text-ink">{row.channel}</p>
      <p className="mt-3 font-['Manrope'] text-xl font-extrabold tracking-[-0.04em] text-ink">
        {formatNumber(row.contacts)} contactos
      </p>
      <p className="mt-1 text-xs text-[#81919b]">{formatPercent(row.percentage)} del total válido</p>
    </div>
  )
}

type ChannelDistributionChartProps = {
  data: DashboardChannelBreakdown[]
  totalValidContacts: number
}

function ChannelDistributionChart({ data, totalValidContacts }: ChannelDistributionChartProps) {
  const chartData: ChannelChartRow[] = [...data]
    .sort((a, b) => b.contacts - a.contacts)
    .map((channel) => ({
      ...channel,
      percentage: totalValidContacts > 0 ? (channel.contacts / totalValidContacts) * 100 : 0,
    }))

  return (
    <section className="mt-6 rounded-2xl border border-[#e4ebef] bg-white p-6 shadow-[0_14px_38px_-28px_rgba(16,38,63,0.38)] sm:p-7">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-['Manrope'] text-xl font-extrabold tracking-[-0.045em] text-ink">Distribución por canales</h2>
          <p className="mt-1 text-sm leading-6 text-[#8a99a2]">Participación de los contactos según su origen.</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="mt-7 grid h-[240px] place-items-center rounded-xl border border-dashed border-[#dbe5ea] text-sm text-[#81919b]">
          No hay datos de canales para este período.
        </div>
      ) : (
        <div className="mt-6 h-[300px] w-full sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="#e9eff2" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: '#81919b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="channel"
                width={128}
                tick={{ fill: '#526a79', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChannelTooltip />} cursor={{ fill: '#f7fafb' }} />
              <Bar dataKey="contacts" radius={[0, 7, 7, 0]} maxBarSize={28}>
                {chartData.map((channel) => (
                  <Cell key={channel.channel} fill={getChannelColor(channel.channel)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default ChannelDistributionChart
