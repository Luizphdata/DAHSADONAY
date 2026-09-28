import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { compareChannel, getChannelDetail, inspectSnapshot, hasPreviousCoverage } from '../../utils/channelInsights'
import type { AttributionModel, DashboardSnapshot } from '../../types/dashboard'
import { formatDate, formatNumber, formatPercent } from '../../utils/formatters'

export default function Overview({ snapshot, attribution }: { snapshot: DashboardSnapshot; attribution: AttributionModel }) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  useEffect(() => { setSelectedChannel(null) }, [snapshot.period.start_date, snapshot.period.end_date, attribution])
  const total = snapshot.kpis.current.valid_clicks
  const change = hasPreviousCoverage(snapshot) ? snapshot.kpis.change.valid_clicks_pct : null
  const channels = [...snapshot.breakdowns.channels].sort((a, b) => b.contacts - a.contacts)
  const leading = channels.find(channel => channel.contacts > 0)
  const max = Math.max(1, ...channels.map(channel => channel.contacts))
  const share = (value: number) => total > 0 ? formatPercent(value / total * 100) : '—'
  const issues = inspectSnapshot(snapshot)
  const selected = channels.find(channel => channel.channel === selectedChannel)
  const detail = selected ? getChannelDetail(snapshot, selected.channel) : null
  const comparison = selected ? compareChannel(snapshot, selected.channel, selected.contacts) : null
  const comparisonText = (result: ReturnType<typeof compareChannel>) => result.state === 'unavailable' ? 'Comparación no disponible' : result.state === 'new' ? 'Sin base anterior (0)' : `${formatPercent(result.percent, true)} vs. anterior`
  const evolution = detail ? detail.evolution.map(point => ({ day: point.day, contacts: point.contacts, partial: false })) : snapshot.timeseries.comparison.map(point => ({ day: point.current_day, contacts: point.current_contacts, partial: point.is_partial_day }))

  return <div className="overview-grid">
    {!hasPreviousCoverage(snapshot) && <p className="overview-validation" role="status">Comparación no disponible: no se confirmó cobertura histórica suficiente para el período anterior.</p>}
    {issues.length > 0 && <section className="overview-validation" role="alert"><h2>Revisar datos del período</h2><ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul><p>Revisa estas diferencias antes de comparar los resultados.</p></section>}
    <section className="overview-total" aria-label="Resumen de contactos">
      <div>
        <p className="overview-eyebrow">Contactos del período</p>
        <p className="overview-number">{formatNumber(total)}</p>
        <div className="overview-change"><strong>{change === null ? 'Sin comparación' : formatPercent(change, true)}</strong><span>vs. período anterior</span></div>
        <p className="overview-note">Clics válidos registrados. No equivalen necesariamente a personas únicas o conversaciones iniciadas.</p>
      </div>
      <div className="overview-leading">
        <p className="overview-eyebrow">Principal origen</p>
        <h2>{leading?.channel ?? 'Sin contactos'}</h2>
        <p>{leading ? `${share(leading.contacts)} de los contactos del período` : 'No hay contactos registrados en este período.'}</p>
        {leading && <div className="overview-track"><span style={{ width: `${Math.min(100, total > 0 ? leading.contacts / total * 100 : 0)}%` }} /></div>}
      </div>
    </section>
    <section className="overview-panel" id="origins">
      <h2>Origen de los contactos</h2><p className="overview-muted">Cantidad, participación y cambio. Selecciona un origen para explorar.</p>
      <div className="overview-channels">
        {channels.length === 0 ? <p className="overview-empty">No hay datos de origen para este período.</p> : channels.map(channel => <button type="button" className="overview-channel" key={channel.channel} aria-pressed={selected?.channel === channel.channel} aria-controls="channel-detail" onClick={() => setSelectedChannel(selected?.channel === channel.channel ? null : channel.channel)}>
          <span>{channel.channel}</span><strong>{formatNumber(channel.contacts)}</strong><small>{share(channel.contacts)}</small>
          <div className="overview-channel-track" aria-hidden="true"><div style={{ width: `${channel.contacts / max * 100}%` }} /></div>
          <span className={`overview-channel-change is-${compareChannel(snapshot, channel.channel, channel.contacts).state}`}>{comparisonText(compareChannel(snapshot, channel.channel, channel.contacts))}</span>
        </button>)}
      </div>
      <p className="overview-foot">Atribución de {attribution === 'first' ? 'primer' : 'último'} contacto. Porcentajes sobre el total de clics válidos.</p>
    </section>
    <section className="overview-panel overview-detail" id="channel-detail" aria-label="Detalle del origen" hidden={!selected || !detail}>
      {selected && detail && comparison && <>
        <div className="overview-chart-heading"><div><h2>{selected.channel}</h2><p className="overview-muted">Detalle del origen seleccionado</p></div><button className="overview-clear" onClick={() => setSelectedChannel(null)}>Ver todos los orígenes</button></div>
        <dl className="overview-detail-stats"><div><dt>Contactos actuales</dt><dd>{formatNumber(selected.contacts)}</dd></div><div><dt>Período anterior</dt><dd>{comparison.previous === null ? 'No disponible' : formatNumber(comparison.previous)}</dd></div><div><dt>Diferencia</dt><dd>{comparison.difference === null ? '—' : `${comparison.difference > 0 ? '+' : ''}${formatNumber(comparison.difference)}`}</dd></div></dl>
        {snapshot.period.is_partial_period && <p className="overview-muted">El período actual está en curso. La comparación corresponde al período anterior.</p>}
        <h3>Campañas de {selected.channel}</h3>
        <p className="overview-muted">Campañas disponibles en este período; la lista puede ser parcial. Participación sobre el total del canal.</p>
        {detail.campaigns.length === 0 ? <p className="overview-empty">No hay campañas disponibles para este origen.</p> : <div className="overview-campaigns"><table><thead><tr><th>Campaña</th><th>Contactos</th><th>Del canal</th></tr></thead><tbody>{detail.campaigns.map((campaign, index) => <tr key={`${campaign.campaign}-${index}`}><td>{campaign.campaign || 'Sin identificar'}</td><td>{formatNumber(campaign.contacts)}</td><td>{selected.contacts > 0 ? formatPercent(campaign.contacts / selected.contacts * 100) : '—'}</td></tr>)}</tbody></table></div>}
        <p className="overview-muted">Contactos en las campañas mostradas: {formatNumber(detail.campaignTotal)} de {formatNumber(selected.contacts)} del canal.</p>
        {detail.campaignTotal > selected.contacts && <p className="overview-warning">Las campañas mostradas superan el total del canal. Revisa los datos del período.</p>}
        <p className="overview-foot">El detalle de páginas por origen aún no está disponible.</p>
      </>}
    </section>
    <section className="overview-panel overview-evolution" id="evolution">
      <div className="overview-chart-heading"><h2>{selected ? `Evolución · ${selected.channel}` : 'Evolución de contactos'}</h2><span>Contactos por día</span></div>
      {detail && selected && detail.evolutionTotal !== selected.contacts && <p className="overview-warning">La serie diaria recibida suma {formatNumber(detail.evolutionTotal)} de {formatNumber(selected.contacts)} contactos del canal. No se completan días ausentes con ceros.</p>}
      {evolution.length === 0 ? <p className="overview-empty">{selected ? 'No hay evolución disponible para este origen.' : 'No hay datos de evolución para este período.'}</p> : <>
        <div className="overview-chart" role="img" aria-label={selected ? `Evolución de ${selected.channel}` : 'Evolución de contactos del período seleccionado'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolution} margin={{ top: 12, right: 10, bottom: 4, left: -15 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="#e8e8f2" />
              <XAxis dataKey="day" tickFormatter={value => formatDate(value, false)} tick={{ fill: '#69718a', fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={32} />
              <YAxis allowDecimals={false} tick={{ fill: '#69718a', fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip position={{ x: 48, y: 0 }} labelFormatter={label => formatDate(String(label))} formatter={value => [formatNumber(Number(value)), 'Contactos']} wrapperStyle={{ maxWidth: 180, whiteSpace: 'normal' }} contentStyle={{ borderRadius: 12, borderColor: '#e7e4f1', whiteSpace: 'normal' }} cursor={{ fill: '#f2eff9' }} />
              <Bar dataKey="contacts" name="Contactos" fill="#aaa0d7" radius={[5, 5, 0, 0]} maxBarSize={44} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="overview-data"><summary>Ver datos diarios</summary><table><thead><tr><th>Fecha</th><th>Contactos</th></tr></thead><tbody>{evolution.map((point, index) => <tr key={`${point.day}-${index}`}><td>{formatDate(point.day)}{point.partial ? ' · En curso' : ''}</td><td>{formatNumber(point.contacts)}</td></tr>)}</tbody></table></details>
      </>}
    </section>
  </div>
}
