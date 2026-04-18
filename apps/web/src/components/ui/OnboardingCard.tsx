import { useState, useEffect } from 'react'

const STORAGE_KEY = 'braingui_onboarding_v1'

export function OnboardingCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#14141f] border border-white/15 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-xs font-semibold text-blue-400/80 uppercase tracking-wider mb-3">
          Before you begin
        </div>
        <h2 className="text-lg font-semibold text-white mb-3">
          What you're about to see
        </h2>
        <p className="text-sm text-white/70 leading-relaxed mb-4">
          You're about to see a <strong className="text-white">prediction</strong> of how an average fMRI subject's
          cortex would respond to this video. This is <strong className="text-white">not your brain</strong>.
          This is <strong className="text-white">not real-time neural activity</strong>.
        </p>
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          It is the output of Meta's TRIBE v2 model, trained on hundreds of hours of fMRI recordings
          from people watching naturalistic movies and podcasts.
        </p>
        <ul className="text-xs text-white/50 space-y-1.5 mb-5 list-disc list-inside">
          <li>Predictions represent an average cohort response, not any individual</li>
          <li>BOLD signal peaks ~5s after stimulus — we correct this by default</li>
          <li>Out-of-distribution content (gaming, animation) may predict less accurately</li>
        </ul>
        <button
          onClick={dismiss}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors text-sm"
        >
          I understand — show me the brain
        </button>
      </div>
    </div>
  )
}
