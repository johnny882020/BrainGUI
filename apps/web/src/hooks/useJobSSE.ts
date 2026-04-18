import { useEffect } from 'react'
import { useJobStore } from '@/stores/jobStore'
import type { SSEProgressEvent } from '@braingui/types'

const TERMINAL = new Set(['complete', 'failed'])

export function useJobSSE(jobId: string | undefined) {
  const updateJobProgress = useJobStore((s) => s.updateJobProgress)
  const loadJob = useJobStore((s) => s.loadJob)

  useEffect(() => {
    if (!jobId) return

    const es = new EventSource(`/api/v1/jobs/${jobId}/stream`)
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const stopPoll = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    }

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as SSEProgressEvent
        updateJobProgress(event)
        if (TERMINAL.has(event.status)) {
          es.close()
          stopPoll()
        }
      } catch {
        // ignore malformed events
      }
    }

    // SSE connection failed (Redis down, server restart, etc.)
    // Fall back to polling GET /api/v1/jobs/:id every 2 s
    es.onerror = () => {
      es.close()
      if (pollTimer !== null) return // already polling

      const poll = () => {
        loadJob(jobId)
          .then(() => {
            const status = useJobStore.getState().currentJob?.status
            if (status && TERMINAL.has(status)) stopPoll()
          })
          .catch(() => {})
      }

      poll() // immediate first fetch
      pollTimer = setInterval(poll, 2000)
    }

    return () => {
      es.close()
      stopPoll()
    }
  }, [jobId, updateJobProgress, loadJob])
}
