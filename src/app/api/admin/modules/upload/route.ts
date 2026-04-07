import { createServiceClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/admin-auth'

const ALLOWED_TYPES: Record<string, 'video' | 'pdf' | 'image'> = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
}

// POST /api/admin/modules/upload/presign
// Body: { filename: string, contentType: string }
// Retourne une URL signée pour uploader directement depuis le navigateur vers Supabase Storage
export async function POST(request: Request) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { filename, contentType } = body as { filename?: string; contentType?: string }

  if (!filename || !contentType) {
    return Response.json({ error: 'filename et contentType requis' }, { status: 400 })
  }

  const assetType = ALLOWED_TYPES[contentType]
  if (!assetType) {
    return Response.json({ error: `Type non supporté : ${contentType}` }, { status: 422 })
  }

  const ext = filename.split('.').pop() ?? 'bin'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from('module-assets')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return Response.json({ error: error?.message ?? 'Erreur création URL signée' }, { status: 500 })
  }

  const { data: urlData } = service.storage.from('module-assets').getPublicUrl(path)

  return Response.json({
    token: data.token,
    path,
    publicUrl: urlData.publicUrl,
    asset_type: assetType,
  })
}
