import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useJobStore } from '@/stores/jobStore'
import { useJobSSE } from '@/hooks/useJobSSE'
import { useVertexData } from '@/hooks/useVertexData'
import { AppShell } from './AppShell'
import { ProcessingScreen } from '@/components/ui/ProcessingScreen'

export function ViewerPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { currentJob, loadJob } = useJobStore()

  useJobSSE(jobId)

  useEffect(() => {
    if (jobId) void loadJob(jobId)
  }, [jobId, loadJob])

  const isComplete = currentJob?.status === 'complete'
  const { error } = useVertexData(jobId, isComplete)

  if (!currentJob) {
    return (
      <div className="flex items-center justify-center h-screen text-white/50">
        Loading job…
      </div>
    )
  }

  if (!isComplete) {
    return <ProcessingScreen job={currentJob} error={error} />
  }

  return <AppShell videoUrl={currentJob.vertexBlobUrl} />
}
