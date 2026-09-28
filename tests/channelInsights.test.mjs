import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareChannel, getChannelDetail, inspectSnapshot } from '../src/utils/channelInsights.ts'

const make = () => ({ kpis: { period: { previous_available: true }, current: { valid_clicks: 120 }, previous: { google_ads_clicks: 50, meta_ads_clicks: 0, organic_clicks: 25 } }, breakdowns: { channels: [{ channel: 'Google Ads', contacts: 100 }, { channel: 'Meta Ads', contacts: 20 }] }, timeseries: { comparison: [{ current_day: '2026-09-28', current_contacts: 120 }], channels: [{ day: '2026-09-28', channel: 'Google Ads', contacts: 60 }, { day: '2026-09-28', channel: 'Google Ads', contacts: 40 }, { day: '2026-09-28', channel: 'Meta Ads', contacts: 20 }] }, campaigns: { campaigns: [{ channel: 'Google Ads', campaign: 'A', contacts: 30 }, { channel: 'Meta Ads', campaign: 'B', contacts: 20 }] }, integrity: { core_totals_match: true } })
test('compares known channel using previous counts, including declines and no change', () => {
  assert.equal(compareChannel(make(), 'Google Ads', 100).percent, 100)
  assert.equal(compareChannel(make(), 'Google Ads', 25).percent, -50)
  assert.equal(compareChannel(make(), 'Google Ads', 50).state, 'unchanged')
})
test('hides comparison with insufficient or unknown historical coverage', () => {
  const snapshot=make();snapshot.kpis.period.previous_available=false
  assert.equal(compareChannel(snapshot,'Google Ads',100).state,'unavailable')
  delete snapshot.kpis.period
  assert.equal(compareChannel(snapshot,'Google Ads',100).state,'unavailable')
  snapshot.comparisons={comparisons:{previous_period:{available:true}}}
  assert.equal(compareChannel(snapshot,'Google Ads',100).percent,100)
})
test('does not invent percentages from zero or use aggregate organic for subchannels', () => {
  assert.equal(compareChannel(make(), 'Meta Ads', 20).state, 'new')
  assert.equal(compareChannel(make(), 'Meta Ads', 20).percent, null)
  assert.equal(compareChannel(make(), 'Meta Ads', 0).percent, 0)
  assert.equal(compareChannel(make(), 'Google orgánico', 10).previous, null)
  assert.equal(compareChannel(make(), 'Sin identificar', 10).previous, null)
})
test('filters channel details, combines daily rows and preserves partial campaign coverage', () => {
  const detail = getChannelDetail(make(), 'Google Ads')
  assert.deepEqual(detail.evolution, [{ day: '2026-09-28', contacts: 100 }])
  assert.equal(detail.campaigns.length, 1)
  assert.equal(detail.campaignTotal, 30)
  assert.equal(detail.evolutionTotal, 100)
  assert.deepEqual(getChannelDetail(make(), 'Referencia').evolution, [])
})
test('checks actual received sums and detects duplicates or invalid counts', () => {
  assert.deepEqual(inspectSnapshot(make()), [])
  const mismatch = make(); mismatch.kpis.current.valid_clicks = 121
  assert.equal(inspectSnapshot(mismatch).length, 2)
  const duplicate = make(); duplicate.breakdowns.channels.push({channel: 'Google Ads', contacts: 0})
  assert.ok(inspectSnapshot(duplicate).some(message => message.includes('duplicados')))
  const invalid = make(); invalid.breakdowns.channels[0].contacts = -1
  assert.ok(inspectSnapshot(invalid).some(message => message.includes('inválidos')))
})
