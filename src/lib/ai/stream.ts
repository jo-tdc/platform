import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage } from '@/lib/utils/types'

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquante')
  return new Anthropic({ apiKey })
}

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 2048

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

export type FileAttachment = {
  name: string
  type: string   // MIME type
  base64: string // base64-encoded content
}

function buildStreamResponse(anthropicMessages: Anthropic.MessageParam[], systemPrompt: string): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        const anthropicStream = getAnthropic().messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: anthropicMessages,
        })
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur streaming'
        controller.enqueue(encoder.encode(`\n\n[Erreur: ${message}]`))
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

/**
 * Crée une réponse streamée depuis l'API Anthropic.
 * Retourne un Response avec Content-Type text/plain pour le streaming.
 */
export function createStreamResponse(
  messages: ChatMessage[],
  systemPrompt: string
): Response {
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))
  return buildStreamResponse(anthropicMessages, systemPrompt)
}

/**
 * Variante avec pièces jointes sur le dernier message utilisateur.
 * Les fichiers (images, PDFs, texte) sont injectés comme blocs de contenu.
 */
export function createStreamResponseWithAttachments(
  messages: ChatMessage[],
  systemPrompt: string,
  attachments: FileAttachment[]
): Response {
  const anthropicMessages: Anthropic.MessageParam[] = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const lastMessage = messages[messages.length - 1]
  type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.RequestDocumentBlock

  const contentBlocks: ContentBlock[] = []

  for (const file of attachments) {
    if (file.type === 'application/pdf') {
      contentBlocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.base64 },
      } as Anthropic.RequestDocumentBlock)
    } else if ((SUPPORTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: file.type as SupportedImageType, data: file.base64 },
      } as Anthropic.ImageBlockParam)
    } else {
      // Texte brut, markdown, etc.
      contentBlocks.push({
        type: 'text',
        text: `--- Fichier joint : "${file.name}" ---\n${Buffer.from(file.base64, 'base64').toString('utf-8')}\n---`,
      } as Anthropic.TextBlockParam)
    }
  }

  contentBlocks.push({ type: 'text', text: lastMessage.content } as Anthropic.TextBlockParam)

  anthropicMessages.push({ role: 'user', content: contentBlocks })

  return buildStreamResponse(anthropicMessages, systemPrompt)
}
