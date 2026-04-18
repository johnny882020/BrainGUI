import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/components/ui/LandingPage'
import { ViewerPage } from '@/components/layout/ViewerPage'
import { OnboardingCard } from '@/components/ui/OnboardingCard'

export default function App() {
  return (
    <BrowserRouter>
      <OnboardingCard />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/j/:jobId" element={<ViewerPage />} />
      </Routes>
    </BrowserRouter>
  )
}
