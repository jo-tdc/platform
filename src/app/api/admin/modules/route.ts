import { createServiceClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/admin-auth'
import { z } from 'zod'

const ModuleSchema = z.object({
  week_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug invalide (minuscules, chiffres, tirets)'),
  description: z.string().max(500).nullable().optional(),
  ai_context: z.string().max(2000).nullable().optional(),
  required_plan: z.enum(['free', 'pro']).optional(),
  position: z.number().int().min(1),
  is_published: z.boolean().optional(),
  figma_url: z.string().url().nullable().optional(),
  preview_url: z.string().url().nullable().optional(),
  asset_url: z.string().url().nullable().optional(),
  asset_type: z.enum(['video', 'pdf', 'image']).nullable().optional(),
})

export async function GET() {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  const service = createServiceClient()
  const { data, error } = await service.from('modules').select('*').order('position')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ modules: data })
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth()
  if (auth.error) return auth.error

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = ModuleSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('modules')
    .insert({ ...parsed.data, required_plan: parsed.data.required_plan ?? 'free', is_published: parsed.data.is_published ?? false })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ module: data }, { status: 201 })
}
