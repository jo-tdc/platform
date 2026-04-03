import { createServiceClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/admin-auth'
import { z } from 'zod'

const LessonUpdateSchema = z.object({
  module_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['video', 'figma', 'resource', 'ui_challenge', 'text']).optional(),
  content_url: z.string().url().nullable().optional(),
  content_body: z.string().nullable().optional(),
  estimated_minutes: z.number().int().min(1).nullable().optional(),
  position: z.number().int().min(1).optional(),
  is_published: z.boolean().optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const service = createServiceClient()
  const { data, error } = await service.from('lessons').select('*').eq('id', id).single()

  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json({ lesson: data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = LessonUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('lessons')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ lesson: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const service = createServiceClient()
  const { error } = await service.from('lessons').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
