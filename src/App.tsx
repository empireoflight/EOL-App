import { Navigate, Route, Routes } from 'react-router-dom'
import { Logo } from './components/shared/Logo'
import { TierBadge } from './components/shared/TierBadge'
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute'

import LoginPage from './pages/auth/LoginPage'
import SignUpPage from './pages/auth/SignUpPage'
import InviteLandingPage from './pages/InviteLandingPage'
import CreateOrgPage from './pages/onboarding/CreateOrgPage'
import TeamListPage from './pages/teams/TeamListPage'
import TeamLayout from './pages/teams/TeamLayout'
import TeamHomePage from './pages/teams/TeamHomePage'
import InvitePage from './pages/teams/InvitePage'
import VisionStartPage from './pages/vision/VisionStartPage'
import VisionReflectPage from './pages/vision/VisionReflectPage'
import VisionSessionStatusPage from './pages/vision/VisionSessionStatusPage'
import VisionHomePage from './pages/vision/VisionHomePage'
import VisionCommitPage from './pages/vision/VisionCommitPage'
import ExperimentsPage from './pages/experiments/ExperimentsPage'
import PulseCheckPage from './pages/checkin/PulseCheckPage'
import RollupPage from './pages/rollup/RollupPage'
import GroundingToolsPage from './pages/friction/GroundingToolsPage'
import FrictionHubPage from './pages/friction/FrictionHubPage'
import FrictionStartPage from './pages/friction/FrictionStartPage'
import FrictionMitigatorPage from './pages/friction/FrictionMitigatorPage'
import FrictionRespondPage from './pages/friction/FrictionRespondPage'
import FrictionSessionStatusPage from './pages/friction/FrictionSessionStatusPage'

function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-6 py-24 text-center">
      <Logo size={44} />
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-eol-accent-label)' }}>
        Collective Intelligence Platform
      </div>
      <h1 className="m-0 text-[46px] font-semibold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
        Empire of Light
      </h1>
      <p className="max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
        Reimagine &rarr; Do &rarr; Unlearn &rarr; Evolve &mdash; vision co-creation, task
        rhythm, and friction processing, with privacy tiers built into the
        product itself.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <TierBadge tier={0} />
        <TierBadge tier={1} />
        <TierBadge tier={2} />
        <TierBadge tier={3} />
        <TierBadge tier={4} />
      </div>
      <div className="mt-4 flex gap-3">
        <a href="/signup" className="rounded-lg px-4 py-2.5 text-[13px] font-semibold" style={{ background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)' }}>
          Get started
        </a>
        <a href="/login" className="rounded-lg px-4 py-2.5 text-[13px] font-semibold" style={{ border: '1px solid var(--color-eol-border-strong)', color: 'var(--color-eol-text-secondary)' }}>
          Sign in
        </a>
      </div>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><SignUpPage /></GuestRoute>} />
      <Route path="/invite/:token" element={<InviteLandingPage />} />

      <Route path="/onboarding" element={<ProtectedRoute><CreateOrgPage /></ProtectedRoute>} />
      <Route path="/teams" element={<ProtectedRoute><TeamListPage /></ProtectedRoute>} />

      <Route path="/teams/:teamId" element={<ProtectedRoute><TeamLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<TeamHomePage />} />
        <Route path="invite" element={<InvitePage />} />
        <Route path="vision/start" element={<VisionStartPage />} />
        <Route path="vision/sessions/:sessionId/reflect" element={<VisionReflectPage />} />
        <Route path="vision/sessions/:sessionId" element={<VisionSessionStatusPage />} />
        <Route path="vision/commit" element={<VisionCommitPage />} />
        <Route path="vision" element={<VisionHomePage />} />
        <Route path="experiments" element={<ExperimentsPage />} />
        <Route path="pulse" element={<PulseCheckPage />} />
        <Route path="rollup" element={<RollupPage />} />
        <Route path="friction" element={<FrictionHubPage />} />
        <Route path="friction/tools" element={<GroundingToolsPage />} />
        <Route path="friction/start" element={<FrictionStartPage />} />
        <Route path="friction/mitigate" element={<FrictionMitigatorPage />} />
        <Route path="friction/sessions/:sessionId/mitigate" element={<FrictionMitigatorPage />} />
        <Route path="friction/sessions/:sessionId/respond" element={<FrictionRespondPage />} />
        <Route path="friction/sessions/:sessionId" element={<FrictionSessionStatusPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
