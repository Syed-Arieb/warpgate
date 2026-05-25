import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { User } from '../lib/api'
import Layout from '../components/Layout'

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
    <Layout>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-6">Account</h1>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        {saved && <p className="text-green-600 text-sm mb-4">Saved!</p>}

        <div className="bg-card border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-1">Plan: {user.plan.name}</h2>
          <p className="text-sm text-muted-foreground">
            {user.plan.max_sessions} max sessions · {user.plan.max_api_keys} max API keys
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <form onSubmit={handleUpdate}>
            <label className="block mb-1 text-sm font-medium">Name</label>
            <input type="text" className="w-full border rounded px-3 py-2 mb-3 bg-background" value={name} onChange={e => setName(e.target.value)} required />

            <label className="block mb-1 text-sm font-medium">Email</label>
            <input type="email" className="w-full border rounded px-3 py-2 mb-4 bg-background" value={email} onChange={e => setEmail(e.target.value)} required />

            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:opacity-90">Save</button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
