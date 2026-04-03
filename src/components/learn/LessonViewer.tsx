import type { Lesson } from '@/lib/utils/types'

type Props = {
  lesson: Lesson
}

export default function LessonViewer({ lesson }: Props) {
  switch (lesson.type) {
    case 'video':
      return <VideoLesson url={lesson.content_url} title={lesson.title} />
    case 'figma':
      return <FigmaLesson url={lesson.content_url} title={lesson.title} />
    case 'resource':
      return <ResourceLesson url={lesson.content_url} title={lesson.title} />
    case 'text':
      return <TextLesson body={lesson.content_body} />
    case 'ui_challenge':
      return <UiChallengeLesson body={lesson.content_body} url={lesson.content_url} />
    default:
      return <p className="text-gray-500 text-sm">Type de leçon non supporté.</p>
  }
}

function VideoLesson({ url, title }: { url: string | null; title: string }) {
  if (!url) return <p className="text-gray-500 text-sm">Vidéo non disponible.</p>

  // Support YouTube et Vimeo
  const embedUrl = getEmbedUrl(url)

  if (!embedUrl) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
        Voir la vidéo →
      </a>
    )
  }

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}

function FigmaLesson({ url, title }: { url: string | null; title: string }) {
  if (!url) return <p className="text-gray-500 text-sm">Fichier Figma non disponible.</p>

  const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-200">
      <iframe
        src={embedUrl}
        title={title}
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}

function ResourceLesson({ url, title }: { url: string | null; title: string }) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl flex items-center gap-4">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
        📎
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline mt-1 inline-block"
          >
            Ouvrir la ressource →
          </a>
        )}
      </div>
    </div>
  )
}

function TextLesson({ body }: { body: string | null }) {
  if (!body) return <p className="text-gray-500 text-sm">Contenu non disponible.</p>

  return (
    <div className="prose prose-gray max-w-none text-sm leading-relaxed">
      <div className="whitespace-pre-wrap">{body}</div>
    </div>
  )
}

function UiChallengeLesson({ body, url }: { body: string | null; url: string | null }) {
  return (
    <div className="space-y-4">
      {body && (
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Challenge</p>
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{body}</div>
        </div>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          Ouvrir dans Figma →
        </a>
      )}
    </div>
  )
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return null
}
