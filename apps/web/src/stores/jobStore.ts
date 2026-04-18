import { create } from 'zustand'
import type { Job, JobStatus, SSEProgressEvent } from '@braingui/types'
import { api } from '@/lib/api'

interface JobState {
  currentJob: Job | null
  isSubmitting: boolean
  selectedParcelId: number | null
  setCurrentJob: (job: Job | null) => void
  updateJobProgress: (event: SSEProgressEvent) => void
  submitUrl: (videoUrl: string) => Promise<string>
  loadJob: (jobId: string) => Promise<void>
  setSelectedParcel: (id: number | null) => void
}

export const useJobStore = create<JobState>((set, get) => ({
  currentJob: null,
  isSubmitting: false,
  selectedParcelId: null,

  setCurrentJob: (job) => set({ currentJob: job }),

  updateJobProgress: (event) => {
    const current = get().currentJob
    if (!current || current.id !== event.jobId) return
    set({
      currentJob: {
        ...current,
        status: event.status as JobStatus,
        progressPct: event.progressPct,
      },
    })
  },

  submitUrl: async (videoUrl) => {
    set({ isSubmitting: true })
    try {
      const res = await api.post<{ id: string; shareUrl: string }>('/api/v1/jobs', { videoUrl })
      const job = await api.get<Job>(`/api/v1/jobs/${res.id}`)
      set({ currentJob: job, isSubmitting: false })
      return res.id
    } catch (err) {
      set({ isSubmitting: false })
      throw err
    }
  },

  loadJob: async (jobId) => {
    const job = await api.get<Job>(`/api/v1/jobs/${jobId}`)
    set({ currentJob: job })
  },

  setSelectedParcel: (id) => set({ selectedParcelId: id }),
}))
