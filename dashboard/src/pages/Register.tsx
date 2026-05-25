import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.register({ email, password, name })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Create account</h1>
        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        <input
          type="text"
          placeholder="Name"
          className="w-full border rounded px-3 py-2 mb-3 bg-background"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
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
          placeholder="Password (min 8 chars)"
          className="w-full border rounded px-3 py-2 mb-4 bg-background"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded hover:opacity-90">
          Register
        </button>
        <p className="text-sm text-center mt-4">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
