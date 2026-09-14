import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import ConfigurationErrorScreen from './components/ConfigurationErrorScreen'
import LoadingScreen from './components/LoadingScreen'
import { useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function ProtectedRoute() {
  const { user } = useAuth()

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function PublicRoute() {
  const { user } = useAuth()

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function AppRoutes() {
  const { configurationError, loading, user } = useAuth()

  if (configurationError) {
    return <ConfigurationErrorScreen message={configurationError} />
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return <AppRoutes />
}

export default App
