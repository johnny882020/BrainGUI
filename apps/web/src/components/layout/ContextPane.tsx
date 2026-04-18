import { ParcelPanel } from '@/components/parcels/ParcelPanel'
import { RegionChart } from '@/components/timeline/RegionChart'
import { useJobStore } from '@/stores/jobStore'

export function ContextPane() {
  const selectedParcelId = useJobStore((s) => s.selectedParcelId)

  return (
    <div className="flex flex-col gap-3 h-full">
      {selectedParcelId !== null && (
        <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
          <RegionChart parcelId={selectedParcelId} />
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ParcelPanel />
      </div>
    </div>
  )
}
