import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute'
import { ScrollToTop } from './components/shared/ScrollToTop'

import AppHomePage from './pages/AppHomePage'
import TermsPage from './pages/TermsPage'
import LoginPage from './pages/auth/LoginPage'
import SignUpPage from './pages/auth/SignUpPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import InviteLandingPage from './pages/InviteLandingPage'
import JoinTeamPage from './pages/JoinTeamPage'
import CreateOrgPage from './pages/onboarding/CreateOrgPage'
import TeamListPage from './pages/teams/TeamListPage'
import TeamLayout from './pages/teams/TeamLayout'
import TeamHomePage from './pages/teams/TeamHomePage'
import InvitePage from './pages/teams/InvitePage'
import VisionStartPage from './pages/vision/VisionStartPage'
import VisionReflectPage from './pages/vision/VisionReflectPage'
import VisionHomePage from './pages/vision/VisionHomePage'
import VisionCommitPage from './pages/vision/VisionCommitPage'
import ExperimentsPage from './pages/experiments/ExperimentsPage'
import PulseCheckPage from './pages/checkin/PulseCheckPage'
import RollupPage from './pages/rollup/RollupPage'
import MomentPlayerPage from './pages/friction/MomentPlayerPage'
import FrictionHubPage from './pages/friction/FrictionHubPage'
import FrictionStartPage from './pages/friction/FrictionStartPage'
import FrictionMitigatorPage from './pages/friction/FrictionMitigatorPage'
import FrictionRespondPage from './pages/friction/FrictionRespondPage'
import FrictionSessionStatusPage from './pages/friction/FrictionSessionStatusPage'

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AppHomePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignUpPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite/:token" element={<InviteLandingPage />} />
        <Route path="/join/:token" element={<JoinTeamPage />} />

        <Route path="/onboarding" element={<ProtectedRoute><CreateOrgPage /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute><TeamListPage /></ProtectedRoute>} />

        <Route path="/teams/:teamId" element={<ProtectedRoute><TeamLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<TeamHomePage />} />
          <Route path="invite" element={<InvitePage />} />
          <Route path="vision/start" element={<VisionStartPage />} />
          <Route path="vision/sessions/:sessionId/reflect" element={<VisionReflectPage />} />
          <Route path="vision/commit" element={<VisionCommitPage />} />
          <Route path="vision" element={<VisionHomePage />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="pulse" element={<PulseCheckPage />} />
          <Route path="rollup" element={<RollupPage />} />
          <Route path="friction" element={<FrictionHubPage />} />
          <Route path="friction/tools/:momentId" element={<MomentPlayerPage />} />
          <Route path="friction/start" element={<FrictionStartPage />} />
          <Route path="friction/mitigate" element={<FrictionMitigatorPage />} />
          <Route path="friction/sessions/:sessionId/mitigate" element={<FrictionMitigatorPage />} />
          <Route path="friction/sessions/:sessionId/respond" element={<FrictionRespondPage />} />
          <Route path="friction/sessions/:sessionId" element={<FrictionSessionStatusPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
