import { BrainViewer } from '@/components/brain/BrainViewer'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { ContextPane } from './ContextPane'
import { Timeline } from '@/components/timeline/Timeline'
import { TopBar } from './TopBar'

interface AppShellProps {
  videoUrl: string | null
}

export function AppShell({ videoUrl }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-[#0d0d12] text-white overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        <div className="flex-[2] min-w-0">
          <BrainViewer />
        </div>
        <div className="flex-[2] min-w-0">
          <VideoPlayer src={videoUrl} />
        </div>
        <div className="flex-[1] min-w-0 overflow-y-auto">
          <ContextPane />
        </div>
      </div>
      <div className="h-32 px-2 pb-2">
        <Timeline />
      </div>
    </div>
  )
}
