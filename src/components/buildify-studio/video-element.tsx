'use client'

import React from 'react'

interface VideoElementProps {
  content: string
  borderRadius?: number
  videoAutoplay?: boolean
  videoLoop?: boolean
  videoMuted?: boolean
}

export function VideoElement({
  content,
  borderRadius = 8,
  videoAutoplay,
  videoLoop,
  videoMuted = true,
}: VideoElementProps) {
  const ytMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  const ytId = ytMatch?.[1]
  const isDirectVid = content && (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(content) || content.includes('blob:') || content.startsWith('/'))

  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        style={{ width: '100%', height: '100%', border: 'none', borderRadius }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  if (isDirectVid && content) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={content}
        controls={!videoAutoplay}
        autoPlay={!!videoAutoplay}
        loop={!!videoLoop}
        muted={videoMuted !== false}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius,
          backgroundColor: '#0f0f0f',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0f0f0f',
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: 14,
      }}
    >
      Upload a video or paste YouTube URL
    </div>
  )
}