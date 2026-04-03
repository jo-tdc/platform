import type { AgentTemplate } from '@/lib/utils/types'

/**
 * Compile le prompt final d'un agent en injectant les valeurs de contexte
 * et le brief du projet dans le prompt de base du template.
 */
export function compileAgentPrompt(
  template: AgentTemplate,
  contextValues: Record<string, string>,
  briefSummary: string
): string {
  const contextBlock = Object.entries(contextValues)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  return `${template.base_system_prompt}

---
CONTEXTE SPÉCIFIQUE AU PROJET :
${contextBlock}

BRIEF PROJET :
${briefSummary}
---`
}
