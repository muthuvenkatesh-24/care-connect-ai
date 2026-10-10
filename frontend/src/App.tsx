import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { AppShell } from './layouts/AppShell'
import { PatientDataProvider } from './patient/PatientDataProvider'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { HealthScorePage } from './pages/HealthScorePage'
import { ProfilePage } from './pages/ProfilePage'
import { Icon } from './components/Icon'

function AuthLoading() {
  return <div className="auth-loading"><span className="loading-mark"><Icon name="heart" size={22} /></span><p>Preparing your care space…</p></div>
}

function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

function PatientOnly() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.role !== 'patient') {
    return <main className="role-blocked"><span className="role-blocked-icon"><Icon name="shield" size={28} /></span><h1>This space is for patients</h1><p>This account role does not have an enabled workspace in this stage.</p><button className="button button-primary" onClick={() => void logout()}>Sign out</button></main>
  }
  return <PatientDataProvider><Outlet /></PatientDataProvider>
}

export default function App() {
  return <AuthProvider><Routes>
    <Route element={<GuestOnly />}>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage registration />} />
    </Route>
    <Route element={<PatientOnly />}>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="health-score" element={<HealthScorePage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider>
}
