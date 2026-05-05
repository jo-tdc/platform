import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserActivePlans } from '@/lib/utils/access'
import type { PlanType } from '@/lib/utils/types'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })
  const plans = await getUserActivePlans(user.id)
  if (!plans.some((p) => (['editor', 'admin'] as PlanType[]).includes(p))) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('photo') as File | null
  if (!file) return Response.json({ error: 'Fichier manquant' }, { status: 400 })

  const service = createServiceClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `mentors/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await service.storage.from('Images').upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data } = service.storage.from('Images').getPublicUrl(path)
  return Response.json({ url: data.publicUrl })
}
