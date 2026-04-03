import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage } from '@/lib/utils/types'

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquante')
  return new Anthropic({ apiKey })
}

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 2048

/**
 * Crée une réponse streamée depuis l'API Anthropic.
 * Retourne un Response avec Content-Type text/plain pour le streaming.
 */
export function createStreamResponse(
  messages: ChatMessage[],
  systemPrompt: string
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        const anthropicStream = getAnthropic().messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
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
