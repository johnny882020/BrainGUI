import { useMemo } from 'react'
import { useBrainStore } from '@/stores/brainStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useJobStore } from '@/stores/jobStore'
import { PARCELS, computeParcelActivity } from '@/lib/parcels'
import type { Parcel } from '@braingui/types'

const N_VERTICES = 20484
const ACTIVE_PERCENTILE = 0.90

export function ParcelPanel() {
  const { vertexBuffer, totalFrames, isLoaded } = useBrainStore()
  const currentTime = usePlaybackStore((s) => s.currentTime)
  const hemodynamicOffset = usePlaybackStore((s) => s.hemodynamicOffset)
  const selectedParcelId = useJobStore((s) => s.selectedParcelId)
  const setSelectedParcel = useJobStore((s) => s.setSelectedParcel)

  const brainFrame = Math.min(
    Math.max(0, Math.floor(currentTime + hemodynamicOffset)),
    totalFrames - 1,
  )

  const { activeParcelIds, activityMap } = useMemo(() => {
    if (!isLoaded || !vertexBuffer) return { activeParcelIds: new Set<number>(), activityMap: new Map<number, number>() }

    const activityMap = computeParcelActivity(vertexBuffer, brainFrame, N_VERTICES)
    const values = [...activityMap.values()].sort((a, b) => a - b)
    const threshold = values[Math.floor(values.length * ACTIVE_PERCENTILE)] ?? 0
    const activeParcelIds = new Set(
      [...activityMap.entries()].filter(([, v]) => v >= threshold).map(([id]) => id),
    )
    return { activeParcelIds, activityMap }
  }, [vertexBuffer, brainFrame, isLoaded])

  if (!isLoaded) {
    return (
      <div className="p-3 text-xs text-white/30">
        Region labels will appear here once brain data is loaded.
      </div>
    )
  }

  const sortedParcels = [...PARCELS].sort((a, b) => {
    const aActive = activeParcelIds.has(a.id) ? 1 : 0
    const bActive = activeParcelIds.has(b.id) ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return (activityMap.get(b.id) ?? 0) - (activityMap.get(a.id) ?? 0)
  })

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-[10px] text-white/30 uppercase tracking-wider px-1 mb-1">
        Active Regions
      </div>
      {sortedParcels.slice(0, 12).map((parcel) => (
        <ParcelCard
          key={parcel.id}
          parcel={parcel}
          activity={activityMap.get(parcel.id) ?? 0}
          isActive={activeParcelIds.has(parcel.id)}
          isSelected={selectedParcelId === parcel.id}
          onSelect={() => setSelectedParcel(parcel.id === selectedParcelId ? null : parcel.id)}
        />
      ))}
    </div>
  )
}

function ParcelCard({
  parcel,
  activity,
  isActive,
  isSelected,
  onSelect,
}: {
  parcel: Parcel
  activity: number
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-md px-2 py-1.5 transition-all border text-xs ${
        isSelected
          ? 'bg-blue-500/20 border-blue-500/50'
          : isActive
          ? 'bg-white/8 border-white/20 hover:bg-white/12'
          : 'bg-transparent border-transparent hover:bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`font-medium truncate ${isActive ? 'text-white/90' : 'text-white/40'}`}>
          {parcel.commonName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isActive && (
            <span className="text-[9px] text-green-400/80 bg-green-400/10 rounded px-1 py-0.5">
              Active
            </span>
          )}
          <span className="text-[9px] text-white/25 font-mono">
            {activity > 0 ? `+${activity.toFixed(2)}` : activity.toFixed(2)}
          </span>
        </div>
      </div>
      {isSelected && (
        <p className="mt-1 text-[9px] text-white/50 leading-relaxed">{parcel.description}</p>
      )}
    </button>
  )
}
