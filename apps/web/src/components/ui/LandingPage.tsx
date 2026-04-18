import { SubmitForm } from './SubmitForm'

const DEMO_JOBS = [
  { id: 'demo_movie', label: 'Movie Clip', description: 'A narrative film excerpt — face areas, language, emotion', icon: '🎬' },
  { id: 'demo_podcast', label: 'Podcast', description: 'Conversation audio — auditory cortex, language networks', icon: '🎙️' },
  { id: 'demo_nature', label: 'Nature Video', description: 'Silent nature footage — visual cortex, motion areas', icon: '🌿' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d0d12] text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center">
        <div className="text-5xl mb-4">🧠</div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          BrainGUI
        </h1>
        <p className="text-lg text-white/70 mb-2">
          See how a brain responds to any video.
        </p>
        <p className="text-sm text-white/40 mb-10 max-w-md mx-auto">
          Powered by Meta TRIBE v2 — a foundation model trained on fMRI recordings.
          Predictions represent an average cortical response, not any individual brain.
        </p>

        <div className="mb-10 flex justify-center">
          <SubmitForm />
        </div>

        <div className="mb-12">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-4">Or try a demo</div>
          <div className="grid grid-cols-3 gap-3">
            {DEMO_JOBS.map((demo) => (
              <a
                key={demo.id}
                href={`/j/${demo.id}`}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-left transition-all group"
              >
                <div className="text-2xl mb-2">{demo.icon}</div>
                <div className="text-sm font-medium text-white/80 group-hover:text-white mb-1">
                  {demo.label}
                </div>
                <div className="text-[10px] text-white/40">{demo.description}</div>
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left text-xs text-white/50 border border-white/10 rounded-xl p-5 bg-white/3">
          <div>
            <div className="text-white/70 font-medium mb-1">What this is</div>
            <ul className="space-y-0.5">
              <li>• TRIBE v2 predicted fMRI activity</li>
              <li>• Average across trained subjects</li>
              <li>• fsaverage5 cortical surface</li>
              <li>• HCP Glasser 360-parcel atlas</li>
            </ul>
          </div>
          <div>
            <div className="text-white/70 font-medium mb-1">What this is not</div>
            <ul className="space-y-0.5">
              <li>• Your brain</li>
              <li>• Real-time neural activity</li>
              <li>• A diagnostic tool</li>
              <li>• Guaranteed accurate for all content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
