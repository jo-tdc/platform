import { createServiceClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/admin-auth'
import { z } from 'zod'

const ContentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  position: z.number().int().min(1),
  is_published: z.boolean().optional(),
  starter_pack_accessible: z.boolean().optional(),
})

export async function GET() {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const service = createServiceClient()
  const { data, error } = await service.from('contents').select('*').order('position')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ contents: data })
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = ContentSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('contents')
    .insert({ ...parsed.data, is_published: parsed.data.is_published ?? false, starter_pack_accessible: parsed.data.starter_pack_accessible ?? false })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ content: data }, { status: 201 })
}
