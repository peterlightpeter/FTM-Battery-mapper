import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Screener from './pages/Screener'
import ProtectedRoute from './components/shared/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/screener/:siteId?"
        element={
          <ProtectedRoute>
            <Screener />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/screener" replace />} />
    </Routes>
  )
}
