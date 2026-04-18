import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/components/ui/LandingPage'
import { ViewerPage } from '@/components/layout/ViewerPage'
import { OnboardingCard } from '@/components/ui/OnboardingCard'

function LandingWithOnboarding() {
  return (
    <>
      <OnboardingCard />
      <LandingPage />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingWithOnboarding />} />
        <Route path="/j/:jobId" element={<ViewerPage />} />
      </Routes>
    </BrowserRouter>
  )
}
