import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { User } from '../lib/api'

export default function Account() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () => {
    api.getMe()
      .then(u => { setUser(u); setName(u.name); setEmail(u.email) })
      .catch(() => navigate('/login'))
  }

  useEffect(load, [navigate])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      const updated = await api.updateMe({ name, email })
      setUser(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  if (!user) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Account</h1>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-3 mb-6">
          Settings saved successfully.
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 shadow-sm mb-6 max-w-lg">
        <h2 className="font-semibold mb-1">{user.plan.name} Plan</h2>
        <p className="text-sm text-muted-foreground">
          {user.plan.max_sessions} max sessions &middot; {user.plan.max_api_keys} max API keys &middot; {user.plan.max_webhooks} max webhooks
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm max-w-lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium">Name</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
