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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6">
        <h1 className="text-xl font-bold mb-4">Reset Password</h1>

        {sent ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              If an account with that email exists, we've sent a reset link to <strong>{email}</strong>.
            </p>
            <Link to="/login" className="text-sm text-primary hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 mb-4 bg-background"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded hover:opacity-90">
              Send Reset Link
            </button>
            <p className="text-center mt-3 text-sm">
              <Link to="/login" className="text-primary hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
