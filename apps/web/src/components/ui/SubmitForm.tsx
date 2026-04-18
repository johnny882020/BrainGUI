import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobStore } from '@/stores/jobStore'

export function SubmitForm() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { isSubmitting, submitUrl } = useJobStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const jobId = await submitUrl(url.trim())
      navigate(`/j/${jobId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xl">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          required
          disabled={isSubmitting}
          className="flex-1 bg-white/8 border border-white/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSubmitting || !url.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
        >
          {isSubmitting ? 'Submitting…' : 'Predict brain →'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <p className="text-[10px] text-white/30 text-center">
        Videos up to 10 minutes • YouTube URLs only in v1 • CC-BY-NC licensed predictions
      </p>
    </form>
  )
}
