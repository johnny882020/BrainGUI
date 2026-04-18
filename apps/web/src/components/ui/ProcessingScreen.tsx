import type { Job } from '@braingui/types'

const STATUS_LABELS: Record<string, string> = {
  queued: 'Waiting in queue…',
  downloading: 'Downloading video…',
  processing: 'Normalizing video and audio…',
  running_inference: 'Running TRIBE v2 brain predictions…',
  stitching: 'Stitching prediction chunks…',
  uploading: 'Uploading results…',
  complete: 'Done!',
  failed: 'Processing failed',
}

interface ProcessingScreenProps {
  job: Job
  error: string | null
}

export function ProcessingScreen({ job, error }: ProcessingScreenProps) {
  const shareUrl = `${window.location.origin}/j/${job.id}`

  return (
    <div className="flex items-center justify-center h-screen bg-[#0d0d12]">
      <div className="bg-[#14141f] border border-white/10 rounded-xl p-8 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-2xl mb-2">🧠</div>
          <h2 className="text-lg font-semibold text-white mb-1">Processing your video</h2>
          <p className="text-xs text-white/40">
            TRIBE v2 is predicting neural responses. This takes 1–5 minutes.
          </p>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>{STATUS_LABELS[job.status] ?? job.status}</span>
            <span>{job.progressPct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${job.progressPct}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="border border-white/10 rounded-lg p-3 bg-white/5">
          <div className="text-[10px] text-white/40 mb-1">Shareable link — you can close this tab</div>
          <div className="text-xs text-blue-400 break-all font-mono">{shareUrl}</div>
          <button
            onClick={() => void navigator.clipboard.writeText(shareUrl)}
            className="mt-2 text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  )
}
