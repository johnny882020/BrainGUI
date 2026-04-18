import { useMemo, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useBrainStore } from '@/stores/brainStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import { PARCELS } from '@/lib/parcels'

interface RegionChartProps {
  parcelId: number
}

const N_VERTICES = 20484

export function RegionChart({ parcelId }: RegionChartProps) {
  const { vertexBuffer, totalFrames } = useBrainStore()
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const hemodynamicOffset = usePlaybackStore((s) => s.hemodynamicOffset)
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const parcel = PARCELS.find((p) => p.id === parcelId)

  const timeseries = useMemo(() => {
    if (!vertexBuffer || !parcel || parcel.vertices.length === 0) return []
    return Array.from({ length: totalFrames }, (_, t) => {
      const offset = t * N_VERTICES
      const mean =
        parcel.vertices.reduce((sum, v) => sum + vertexBuffer[offset + v], 0) /
        parcel.vertices.length
      return { t, value: mean }
    })
  }, [vertexBuffer, parcel, totalFrames])

  const peaks = useMemo(() => {
    if (timeseries.length < 3) return []
    const sorted = [...timeseries].sort((a, b) => b.value - a.value)
    const top3: typeof timeseries = []
    for (const pt of sorted) {
      if (top3.every((p) => Math.abs(p.t - pt.t) > 3)) {
        top3.push(pt)
        if (top3.length === 3) break
      }
    }
    return top3.sort((a, b) => a.t - b.t)
  }, [timeseries])

  const seekToPeak = useCallback(
    (t: number) => {
      const seekTime = Math.max(0, t - hemodynamicOffset)
      setCurrentTime(seekTime)
      const video = videoRef.current ?? document.querySelector('video')
      if (video) video.currentTime = seekTime
    },
    [hemodynamicOffset, setCurrentTime],
  )

  if (!parcel) return null

  const brainTime = currentTime + hemodynamicOffset

  return (
    <div className="p-3">
      <div className="text-xs font-medium text-white/80 mb-1">{parcel.commonName}</div>
      <div className="text-[10px] text-white/40 mb-2">{parcel.name}</div>
      {timeseries.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={timeseries} margin={{ top: 2, right: 4, bottom: 2, left: -20 }}>
              <XAxis dataKey="t" hide />
              <YAxis tickCount={3} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }}
                formatter={(v: number) => [v.toFixed(3), 'BOLD']}
                labelFormatter={(t: number) => `t=${t}s`}
              />
              <ReferenceLine x={Math.floor(brainTime)} stroke="rgba(96,165,250,0.5)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#60a5fa"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          {peaks.length > 0 && (
            <div className="mt-2">
              <div className="text-[9px] text-white/30 mb-1">Top activation peaks</div>
              <div className="flex gap-1">
                {peaks.map((pk) => (
                  <button
                    key={pk.t}
                    onClick={() => seekToPeak(pk.t)}
                    className="text-[9px] bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded px-2 py-0.5 text-blue-300 transition-colors"
                  >
                    {pk.t}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-[10px] text-white/30">No data yet</div>
      )}
    </div>
  )
}
