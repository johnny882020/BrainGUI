import { useCallback, useMemo } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useBrainStore } from '@/stores/brainStore'
import { N_VERTICES } from '@/lib/constants'

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Timeline() {
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const duration = usePlaybackStore((s) => s.duration)
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime)
  const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying)
  const { vertexBuffer, totalFrames, isLoaded } = useBrainStore()

  const activityStrip = useMemo(() => {
    if (!isLoaded || !vertexBuffer || totalFrames === 0) return null
    const strip: number[] = []
    for (let t = 0; t < totalFrames; t++) {
      let sum = 0
      const offset = t * N_VERTICES
      for (let v = 0; v < N_VERTICES; v++) sum += Math.abs(vertexBuffer[offset + v])
      strip.push(sum / N_VERTICES)
    }
    const max = Math.max(...strip) || 1
    return strip.map((v) => v / max)
  }, [vertexBuffer, totalFrames, isLoaded])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = parseFloat(e.target.value)
      setCurrentTime(t)
      setIsPlaying(false)
      const video = document.querySelector('video')
      if (video) video.currentTime = t
    },
    [setCurrentTime, setIsPlaying],
  )

  return (
    <div className="flex flex-col gap-1 w-full h-full bg-white/5 rounded-lg px-3 py-2 border border-white/10">
      {activityStrip && (
        <div className="flex items-end gap-px h-8" title="Mean absolute predicted BOLD activity">
          {activityStrip.map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-blue-400/60 rounded-sm"
              style={{ height: `${Math.max(2, v * 100)}%` }}
            />
          ))}
        </div>
      )}
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        className="w-full accent-blue-400 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-white/40">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
