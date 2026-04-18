import { useRef, useEffect, useCallback } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'

interface VideoPlayerProps {
  src: string | null
}

export function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime)
  const setDuration = usePlaybackStore((s) => s.setDuration)
  const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    video.src = src
    video.load()
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    setCurrentTime(videoRef.current?.currentTime ?? 0)
  }, [setCurrentTime])

  const handleLoadedMetadata = useCallback(() => {
    setDuration(videoRef.current?.duration ?? 0)
  }, [setDuration])

  const handlePlay = useCallback(() => setIsPlaying(true), [setIsPlaying])
  const handlePause = useCallback(() => setIsPlaying(false), [setIsPlaying])

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
      {src ? (
        <video
          ref={videoRef}
          className="max-w-full max-h-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          controls
          playsInline
        />
      ) : (
        <div className="text-white/30 text-sm text-center px-6">
          Video will appear here after processing
        </div>
      )}
    </div>
  )
}

export function useVideoSeek() {
  return useCallback((time: number) => {
    const video = document.querySelector('video')
    if (video) video.currentTime = time
  }, [])
}
