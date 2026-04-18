import { useEffect } from 'react'
import { useJobStore } from '@/stores/jobStore'
import type { SSEProgressEvent } from '@braingui/types'

export function useJobSSE(jobId: string | undefined) {
  const updateJobProgress = useJobStore((s) => s.updateJobProgress)

  useEffect(() => {
    if (!jobId) return

    const es = new EventSource(`/api/v1/jobs/${jobId}/stream`)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as SSEProgressEvent
        updateJobProgress(event)
        if (event.status === 'complete' || event.status === 'failed') {
          es.close()
        }
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [jobId, updateJobProgress])
}
