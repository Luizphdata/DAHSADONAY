export function formatPageUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.pathname === '/' ? 'Página principal' : parsedUrl.pathname
  } catch {
    if (url === '/') return 'Página principal'
    return url.startsWith('/') ? url : `/${url}`
  }
}
