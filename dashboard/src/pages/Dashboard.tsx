import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Session, type User } from '../lib/api'

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    api.getMe().then(setUser).catch(() => {})
    api.listSessions().then(setSessions).catch(() => {})
  }, [])

  const total = sessions.length
  const connected = sessions.filter(s => s.status === 'connected').length
  const connecting = sessions.filter(s => s.status === 'connecting').length

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {user ? `Welcome${user.name ? `, ${user.name.split(' ')[0]}` : ''}` : 'Dashboard'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Sessions</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Connected</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{connected}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Connecting</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{connecting}</p>
        </div>
      </div>

      {user && (
        <div className="rounded-lg border bg-card p-4 mb-6">
          <h2 className="font-semibold mb-1">Plan: {user.plan.name}</h2>
          <p className="text-sm text-muted-foreground">
            {user.plan.max_sessions} max sessions · {user.plan.max_api_keys} max API keys
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/sessions" className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">
          View Sessions
        </Link>
        <Link to="/api-keys" className="inline-flex items-center px-4 py-2 rounded-md border text-sm hover:bg-muted">
          Manage API Keys
        </Link>
      </div>
    </div>
  )
}
