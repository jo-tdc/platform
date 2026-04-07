import { createServiceClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/admin-auth'
import { z } from 'zod'

const ContentUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  position: z.number().int().min(1).optional(),
  is_published: z.boolean().optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = ContentUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()
  const { data, error } = await service.from('contents').update(parsed.data).eq('id', id).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ content: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const service = createServiceClient()
  const { error } = await service.from('contents').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
