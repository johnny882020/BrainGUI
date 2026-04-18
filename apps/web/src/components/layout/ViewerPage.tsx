import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useJobStore } from '@/stores/jobStore'
import { useJobSSE } from '@/hooks/useJobSSE'
import { useVertexData } from '@/hooks/useVertexData'
import { AppShell } from './AppShell'
import { ProcessingScreen } from '@/components/ui/ProcessingScreen'

export function ViewerPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { currentJob, loadJob } = useJobStore()
  const navigate = useNavigate()
  const [loadError, setLoadError] = useState<string | null>(null)

  useJobSSE(jobId)

  useEffect(() => {
    if (!jobId) return
    loadJob(jobId).catch(() => {
      setLoadError(`Job "${jobId}" not found.`)
    })
  }, [jobId, loadJob])

  const isComplete = currentJob?.status === 'complete'
  const { error } = useVertexData(jobId, isComplete)

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-white/70 bg-[#0d0d12]">
        <div className="text-4xl">🔍</div>
        <p className="text-sm">{loadError}</p>
        <button
          onClick={() => navigate('/')}
          className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          ← Back to home
        </button>
      </div>
    )
  }

  if (!currentJob) {
    return (
      <div className="flex items-center justify-center h-screen text-white/50 bg-[#0d0d12]">
        Loading job…
      </div>
    )
  }

  if (!isComplete) {
    return <ProcessingScreen job={currentJob} error={error} />
  }

  return <AppShell videoUrl={currentJob.videoUrl} />
}
