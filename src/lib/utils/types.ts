import type { Database } from '@/types/database.types'

// Raccourcis pour les types de tables
export type User = Database['public']['Tables']['users']['Row']
export type UserPlan = Database['public']['Tables']['user_plans']['Row']
export type Week = Database['public']['Tables']['weeks']['Row']
export type Module = Database['public']['Tables']['modules']['Row']
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type LessonCompletion = Database['public']['Tables']['lesson_completions']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectFile = Database['public']['Tables']['project_files']['Row']
export type AgentTemplate = Database['public']['Tables']['agent_templates']['Row']
export type ProjectAgent = Database['public']['Tables']['project_agents']['Row']
export type AiSession = Database['public']['Tables']['ai_sessions']['Row']
export type AiMessage = Database['public']['Tables']['ai_messages']['Row']

// Type du plan utilisateur
export type PlanType = UserPlan['plan']

// Groupes de plans pour les vérifications d'accès
export const PLANS_LEARN = ['bootcamp', 'free', 'pro', 'editor', 'admin'] as const satisfies PlanType[]
export const PLANS_PRACTICE = ['bootcamp', 'trial', 'pro', 'editor', 'admin'] as const satisfies PlanType[]
export const PLANS_ADMIN = ['editor', 'admin'] as const satisfies PlanType[]

// Type de réponse d'erreur API standard
export type ApiError = {
  error: string
}

// Type de message de chat
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}
