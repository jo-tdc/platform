import { createClient } from '@/lib/supabase/server'
import { buildBriefSummaryFromDocsPrompt } from '@/lib/ai/prompts/brief-summary'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquante')
  return new Anthropic({ apiKey })
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const MAX_FILES = 10

type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

function isSupportedImage(type: string): type is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type)
}

// POST /api/practice/brief-from-docs — génère un brief à partir de documents uploadés
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Données invalides' }, { status: 400 })
  }

  const projectName = (formData.get('name') as string | null)?.trim()
  if (!projectName) return Response.json({ error: 'Nom du projet requis' }, { status: 422 })

  const rawFiles = formData.getAll('files') as File[]
  if (rawFiles.length === 0) return Response.json({ error: 'Aucun fichier fourni' }, { status: 422 })
  if (rawFiles.length > MAX_FILES) return Response.json({ error: `Maximum ${MAX_FILES} fichiers` }, { status: 422 })

  // Construire les blocs de contenu pour Anthropic
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: SupportedImageType; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

  const contentBlocks: ContentBlock[] = [
    {
      type: 'text',
      text: `Projet : "${projectName}"\n\nVoici les documents fournis. Génère un brief structuré à partir de leur contenu.`,
    },
  ]

  for (const file of rawFiles) {
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: `Fichier "${file.name}" trop volumineux (max 20 MB)` }, { status: 422 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    if (file.type === 'application/pdf') {
      contentBlocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      })
    } else if (isSupportedImage(file.type)) {
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: file.type, data: base64 },
      })
    } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const text = new TextDecoder().decode(buffer)
      contentBlocks.push({
        type: 'text',
        text: `--- Contenu de "${file.name}" ---\n${text}\n---`,
      })
    } else {
      return Response.json({ error: `Type de fichier non supporté : ${file.name}` }, { status: 422 })
    }
  }

  const messages: MessageParam[] = [{ role: 'user', content: contentBlocks as MessageParam['content'] }]

  try {
    const anthropic = getAnthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildBriefSummaryFromDocsPrompt(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text : ''
    return Response.json({ brief_summary: summary })
  } catch (err) {
    console.error('[brief-from-docs] Anthropic error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
