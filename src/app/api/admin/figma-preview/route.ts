import { requireAdminAuth } from '@/lib/utils/admin-auth'

function extractFigmaFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:file|proto|slides|design)\/([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

function decodeHtmlEntities(str: string): string {
  return str.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

// POST /api/admin/figma-preview
// Body: { url: string }
// Returns: { preview_url: string }
export async function POST(request: Request) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const url = (body as { url?: string }).url?.trim()
  if (!url) return Response.json({ error: 'URL requise' }, { status: 422 })

  const fileKey = extractFigmaFileKey(url)
  if (!fileKey) return Response.json({ error: 'URL Figma invalide — format attendu : figma.com/slides/KEY' }, { status: 422 })

  // Figma Slides n'est pas supporté par la REST API — on extrait l'og:image depuis la page publique
  const pageUrl = url.includes('/slides/') ? url : `https://www.figma.com/slides/${fileKey}`

  const pageRes = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
  })

  if (!pageRes.ok) {
    return Response.json({ error: `HTTP ${pageRes.status} sur ${pageUrl}` }, { status: 404 })
  }

  const html = await pageRes.text()
  const match = html.match(/og:image[^>]*content="([^"]+)"/)

  if (!match) {
    const ogIdx = html.indexOf('og:')
    return Response.json({
      error: 'match_null',
      debug: {
        htmlLength: html.length,
        htmlStart: html.slice(0, 300),
        ogContext: ogIdx > -1 ? html.slice(ogIdx, ogIdx + 300) : 'og: absent',
        finalUrl: pageRes.url,
      }
    }, { status: 404 })
  }

  const previewUrl = decodeHtmlEntities(match[1])
  return Response.json({ preview_url: previewUrl })
}
