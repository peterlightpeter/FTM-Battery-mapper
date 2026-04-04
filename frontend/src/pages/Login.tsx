import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const VALID_PASSWORD = 'Lumen2026'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password === VALID_PASSWORD) {
      setAuth('local-session', { id: 'user-001', email: 'analyst@lumen.energy', name: 'Analyst', role: 'analyst' })
      navigate('/screener')
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-lumen-concrete-100">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-8 shadow-sm w-full max-w-sm">
        <img src="/logo-black.svg" alt="Lumen Energy" className="h-8 mx-auto mb-6" />
        <h1 className="font-display text-2xl text-center mb-6">FOM Screener</h1>

        {error && (
          <div className="bg-lumen-danger/10 text-lumen-danger text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 border border-lumen-concrete-200 rounded-lg text-sm focus:outline-none focus:border-lumen-sky-blue-400"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-lumen-sky-blue text-lumen-graphite-black font-medium rounded-lg text-sm hover:bg-lumen-sky-blue-400 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  )
}
