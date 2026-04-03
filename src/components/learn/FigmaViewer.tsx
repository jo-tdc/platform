'use client'

type Props = {
  url: string
  title: string
}

export default function FigmaViewer({ url, title }: Props) {
  const embedUrl = `https://www.figma.com/embed?embed_host=astra&url=${encodeURIComponent(url)}`

  return (
    <iframe
      src={embedUrl}
      title={title}
      allowFullScreen
      className="w-full h-full border-0"
      style={{ display: 'block' }}
    />
  )
}
