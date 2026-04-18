import { useRef, useEffect } from 'react'
import { useNiivue } from './useNiivue'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useBrainStore } from '@/stores/brainStore'
import { useJobStore } from '@/stores/jobStore'
import { getFrameSlice } from '@/lib/decodeFloat16'

const N_VERTICES = 20484

export function BrainViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const hemodynamicOffset = usePlaybackStore((s) => s.hemodynamicOffset)
  const { vertexBuffer, totalFrames, isLoaded, colormap, calMin, calMax } = useBrainStore()
  const setSelectedParcel = useJobStore((s) => s.setSelectedParcel)

  const { setVertexColors, setColormap } = useNiivue(canvasRef, {
    onMeshNodeClick: (_meshId, nodeIndex) => {
      setSelectedParcel(nodeIndex)
    },
  })

  const brainFrame = Math.min(
    Math.max(0, Math.floor(currentTime + hemodynamicOffset)),
    totalFrames - 1,
  )

  const prevFrameRef = useRef(-1)

  useEffect(() => {
    if (!isLoaded || !vertexBuffer || brainFrame === prevFrameRef.current) return
    prevFrameRef.current = brainFrame
    const slice = getFrameSlice(vertexBuffer, brainFrame, N_VERTICES)
    setVertexColors(slice)
  }, [brainFrame, isLoaded, vertexBuffer, setVertexColors])

  useEffect(() => {
    setColormap(colormap, calMin, calMax)
  }, [colormap, calMin, calMax, setColormap])

  return (
    <div className="relative w-full h-full bg-[#14141a] rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[10px] text-white/30 cursor-pointer hover:text-white/60 transition-colors select-none">
          Predicted group-averaged BOLD — TRIBE v2 (unseen subject mode)
        </span>
      </div>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
          Brain viewer ready — submit a video to begin
        </div>
      )}
    </div>
  )
}
