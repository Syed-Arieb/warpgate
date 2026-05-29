import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-sm animate-slideUp">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mb-4 transform hover:scale-110 transition-transform">
            <span className="text-2xl font-bold text-white">W</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Warpgate</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-8 shadow-xl animate-slideUp">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 mb-6 flex items-start gap-3 animate-slideDown border border-destructive/20">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-medium">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full border rounded-lg px-4 py-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full border rounded-lg px-4 py-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-primary-foreground py-3 rounded-lg text-sm font-semibold hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-sm text-center mt-7 space-y-2 text-muted-foreground">
            <p>No account? <Link to="/register" className="text-primary hover:underline font-semibold">Create one</Link></p>
            <p><Link to="/forgot-password" className="text-primary hover:underline font-semibold">Forgot password?</Link></p>
          </div>
        </form>
      </div>
    </div>
  )
}

