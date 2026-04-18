import { usePlaybackStore } from '@/stores/playbackStore'

export function TopBar() {
  const hemodynamicOffset = usePlaybackStore((s) => s.hemodynamicOffset)
  const setHemodynamicOffset = usePlaybackStore((s) => s.setHemodynamicOffset)

  const lagEnabled = hemodynamicOffset === 0

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-sm">
      <span className="font-semibold text-white/80">BrainGUI</span>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={lagEnabled}
            onChange={(e) => setHemodynamicOffset(e.target.checked ? 0 : 5)}
            className="rounded"
          />
          <span className="text-white/60 group-hover:text-white/90 transition-colors text-xs">
            Show real hemodynamic delay
          </span>
          <span
            className="text-[10px] text-white/30 hover:text-white/60 cursor-help"
            title="BOLD signal peaks ~5s after stimulus due to blood oxygenation dynamics. When unchecked, brain display is shifted +5s so peaks appear synchronized with the video."
          >
            ⓘ
          </span>
        </label>
      </div>
    </div>
  )
}
