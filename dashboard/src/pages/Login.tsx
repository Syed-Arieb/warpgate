import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign in</h1>
        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded px-3 py-2 mb-3 bg-background"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border rounded px-3 py-2 mb-4 bg-background"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded hover:opacity-90">
          Sign in
        </button>
        <div className="text-sm text-center mt-4 space-y-1">
          <p>No account? <Link to="/register" className="text-primary hover:underline">Register</Link></p>
          <p><Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link></p>
        </div>
      </form>
    </div>
  )
}
