const channelColors: Record<string, string> = {
  'Google Ads': '#5577c6',
  'Meta Ads': '#7869c6',
  'Google orgánico': '#5b9b78',
  'Instagram orgánico': '#a16b9c',
  'Facebook orgánico': '#5c86b7',
  Directo: '#85939b',
  Referencia: '#5da9b5',
}

export function getChannelColor(channel: string) {
  return channelColors[channel] ?? '#7f909b'
}

export default channelColors
