import { useEffect, useState } from 'react'
import { useBrainStore } from '@/stores/brainStore'
import { api } from '@/lib/api'
import { parseVertexBin } from '@/lib/decodeFloat16'
import type { VertexUrlResponse } from '@braingui/types'

export function useVertexData(jobId: string | undefined, isComplete: boolean) {
  const [error, setError] = useState<string | null>(null)
  const setVertexBuffer = useBrainStore((s) => s.setVertexBuffer)

  useEffect(() => {
    if (!jobId || !isComplete) return

    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      try {
        const { url } = await api.get<VertexUrlResponse>(`/api/v1/jobs/${jobId}/vertex-url`, { signal })
        const res = await fetch(url, { signal })
        if (!res.ok) throw new Error(`Failed to fetch vertex data: ${res.status}`)
        const buffer = await res.arrayBuffer()
        if (signal.aborted) return
        const { header, data } = parseVertexBin(buffer)
        setVertexBuffer(data, header.totalFrames)
      } catch (err) {
        if (signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    void load()
    return () => controller.abort()
  }, [jobId, isComplete, setVertexBuffer])

  return { error }
}
