import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Warpgate</h1>
          <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If an account with that email exists, we've sent a reset link to <strong>{email}</strong>.
              </p>
              <Link to="/login" className="inline-block text-sm text-primary hover:underline font-medium">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Send Reset Link
              </button>
              <p className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline font-medium">Back to login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
