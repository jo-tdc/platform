import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getUserActivePlan, canAccessModule } from '@/lib/utils/access'
import LessonViewer from '@/components/learn/LessonViewer'
import ChatWindow from '@/components/chat/ChatWindow'
import type { Lesson, PlanType } from '@/lib/utils/types'

type Props = {
  params: Promise<{ weekSlug: string; moduleSlug: string; lessonId: string }>
}

type ModuleRef = {
  id: string
  title: string
  slug: string
  required_plan: string
  ai_context: string | null
  weeks: { id: string; position: number; title: string } | null
}

type LessonWithModule = Lesson & {
  modules: ModuleRef | null
}

async function markLessonCompleted(formData: FormData) {
  'use server'
  const lessonId = formData.get('lessonId') as string
  const userId = formData.get('userId') as string
  const redirectPath = formData.get('redirectPath') as string

  if (!lessonId || !userId) return

  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()

  // Cast nécessaire : bug d'inférence Supabase sur les tables à clé composite
  await (supabase
    .from('lesson_completions') as unknown as {
      upsert: (
        v: { user_id: string; lesson_id: string },
        o: { onConflict: string }
      ) => Promise<unknown>
    })
    .upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' })

  redirect(redirectPath)
}

export default async function LessonPage({ params }: Props) {
  const { weekSlug, moduleSlug, lessonId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const lessonResult = await supabase
    .from('lessons')
    .select('*, modules(id, title, slug, required_plan, ai_context, weeks(id, position, title))')
    .eq('id', lessonId)
    .eq('is_published', true)
    .limit(1)

  const lesson = (lessonResult.data as LessonWithModule[] | null)?.[0]
  if (!lesson) notFound()

  const module = lesson.modules
  if (!module) notFound()
  if (module.slug !== moduleSlug || !module.weeks || module.weeks.id !== weekSlug) notFound()

  const plan = await getUserActivePlan(user.id)
  if (!canAccessModule(plan as PlanType, module.required_plan as 'free' | 'pro')) {
    redirect('/learn')
  }

  // Vérification verrouillage linéaire
  const prevLessonsResult = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', module.id)
    .eq('is_published', true)
    .lt('position', lesson.position)

  const previousLessons = prevLessonsResult.data as Array<{ id: string }> | null ?? []

  if (previousLessons.length > 0) {
    const prevIds = previousLessons.map((l) => l.id)
    const completionCheckResult = await supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', user.id)
      .in('lesson_id', prevIds)

    const completionCheck = completionCheckResult.data as Array<{ lesson_id: string }> | null ?? []
    if (completionCheck.length !== previousLessons.length) {
      redirect(`/learn/${weekSlug}/${moduleSlug}`)
    }
  }

  // État de complétion
  const completionResult = await supabase
    .from('lesson_completions')
    .select('completed_at')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .limit(1)

  const isCompleted = (completionResult.data?.length ?? 0) > 0

  // Leçon suivante
  const nextResult = await supabase
    .from('lessons')
    .select('id')
    .eq('module_id', module.id)
    .eq('is_published', true)
    .gt('position', lesson.position)
    .order('position')
    .limit(1)

  const nextLesson = (nextResult.data as Array<{ id: string }> | null)?.[0]
  const nextPath = nextLesson
    ? `/learn/${weekSlug}/${moduleSlug}/${nextLesson.id}`
    : `/learn/${weekSlug}/${moduleSlug}`

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Fil d'Ariane */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
            <Link href="/learn" className="hover:text-gray-600 transition-colors">
              Curriculum
            </Link>
            <span>/</span>
            <Link href={`/learn/${weekSlug}/${moduleSlug}`} className="hover:text-gray-600 transition-colors">
              {module.title}
            </Link>
            <span>/</span>
            <span className="text-gray-600">{lesson.title}</span>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">{lesson.title}</h1>
          {lesson.estimated_minutes && (
            <p className="text-xs text-gray-400 mb-6">{lesson.estimated_minutes} min</p>
          )}

          <LessonViewer lesson={lesson} />

          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
            <Link
              href={`/learn/${weekSlug}/${moduleSlug}`}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Retour au module
            </Link>

            {isCompleted ? (
              <Link
                href={nextPath}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                {nextLesson ? 'Leçon suivante →' : 'Terminer le module →'}
              </Link>
            ) : (
              <form action={markLessonCompleted}>
                <input type="hidden" name="lessonId" value={lessonId} />
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="redirectPath" value={nextPath} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Marquer comme terminé ✓
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Chat Tuteur */}
      <aside className="w-80 border-l border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <p className="text-sm font-medium text-gray-900">Tuteur IA</p>
          <p className="text-xs text-gray-400">Pose tes questions sur cette leçon</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            apiRoute="/api/ai/tutor"
            contextPayload={{ moduleId: module.id }}
            placeholder="Pose ta question..."
            welcomeMessage="Bonjour ! Je suis ton tuteur. Pose-moi toutes tes questions sur ce module."
          />
        </div>
      </aside>
    </div>
  )
}
