import { createServiceClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/admin-auth'
import { z } from 'zod'

const ModuleUpdateSchema = z.object({
  week_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).nullable().optional(),
  ai_context: z.string().max(2000).nullable().optional(),
  required_plan: z.enum(['free', 'pro']).optional(),
  position: z.number().int().min(1).optional(),
  is_published: z.boolean().optional(),
  figma_url: z.string().url().nullable().optional(),
  preview_url: z.string().url().nullable().optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = ModuleUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('modules')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ module: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const service = createServiceClient()
  const { error } = await service.from('modules').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
