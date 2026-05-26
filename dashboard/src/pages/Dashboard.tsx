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

  const cards = [
    { label: 'Total Sessions', value: total, color: '' },
    { label: 'Connected', value: connected, color: 'text-green-600 dark:text-green-400' },
    { label: 'Connecting', value: connecting, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Max Sessions', value: user?.plan.max_sessions ?? '-', color: 'text-muted-foreground' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">
        {user ? `Welcome${user.name ? `, ${user.name.split(' ')[0]}` : ''}` : 'Dashboard'}
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map(card => (
          <div key={card.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {user && (
        <div className="rounded-xl border bg-card p-5 shadow-sm mb-8">
          <h2 className="font-semibold mb-1">{user.plan.name} Plan</h2>
          <p className="text-sm text-muted-foreground">
            {user.plan.max_sessions} max sessions &middot; {user.plan.max_api_keys} max API keys &middot; {user.plan.max_webhooks} max webhooks
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          View Sessions
        </Link>
        <Link
          to="/api-keys"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          Manage API Keys
        </Link>
      </div>
    </div>
  )
}
