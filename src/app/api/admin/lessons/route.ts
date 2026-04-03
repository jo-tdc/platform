import { createServiceClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/admin-auth'
import { z } from 'zod'

const LessonSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: z.enum(['video', 'figma', 'resource', 'ui_challenge', 'text']),
  content_url: z.string().url().nullable().optional(),
  content_body: z.string().nullable().optional(),
  estimated_minutes: z.number().int().min(1).nullable().optional(),
  position: z.number().int().min(1),
  is_published: z.boolean().optional(),
})

export async function GET() {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const service = createServiceClient()
  const { data, error } = await service.from('lessons').select('*').order('position')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ lessons: data })
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = LessonSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('lessons')
    .insert({ ...parsed.data, is_published: parsed.data.is_published ?? false })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ lesson: data }, { status: 201 })
}
