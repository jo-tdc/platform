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

const MAX_SIZE_MB = 500

// POST /api/admin/modules/upload — upload un fichier vers Supabase Storage
export async function POST(request: Request) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return Response.json({ error: 'Fichier manquant' }, { status: 400 })

  const assetType = ALLOWED_TYPES[file.type]
  if (!assetType) {
    return Response.json({ error: `Type non supporté : ${file.type}` }, { status: 422 })
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json({ error: `Fichier trop lourd (max ${MAX_SIZE_MB} Mo)` }, { status: 422 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const service = createServiceClient()
  const { error: uploadError } = await service.storage
    .from('module-assets')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = service.storage.from('module-assets').getPublicUrl(path)

  return Response.json({ url: urlData.publicUrl, asset_type: assetType })
}
