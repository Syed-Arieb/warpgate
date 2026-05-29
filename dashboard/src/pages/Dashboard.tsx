import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Session, type User } from '../lib/api'

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(() => navigate('/login'))
      .finally(() => setLoadingUser(false))

    api.listSessions()
      .then(setSessions)
      .catch(() => navigate('/login'))
      .finally(() => setLoadingSessions(false))
  }, [navigate])

  const total = sessions.length
  const connected = sessions.filter(s => s.status === 'connected').length
  const connecting = sessions.filter(s => s.status === 'connecting').length

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">
        {user ? `Welcome${user.name ? `, ${user.name.split(' ')[0]}` : ''}` : 'Dashboard'}
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Total Sessions" value={loadingSessions ? '...' : total} />
        <StatCard label="Connected" value={loadingSessions ? '...' : connected} color="text-green-600 dark:text-green-400" />
        <StatCard label="Connecting" value={loadingSessions ? '...' : connecting} color="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="Max Sessions" value={user?.plan.max_sessions ?? '-'} color="text-muted-foreground" />
      </div>

      {loadingUser ? (
        <div className="rounded-xl border bg-card p-5 shadow-sm mb-8 animate-pulse">
          <div className="h-5 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      ) : user && (
        <div className="rounded-xl border bg-card p-5 shadow-sm mb-8">
          <h2 className="font-semibold mb-1">{user.plan.name} Plan</h2>
          <p className="text-sm text-muted-foreground">
            {user.plan.max_sessions} max sessions &middot; {user.plan.max_api_keys} max API keys &middot; {user.plan.max_webhooks} max webhooks
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Link to="/sessions" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          View Sessions
        </Link>
        <Link to="/api-keys" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          Manage API Keys
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color || ''}`}>{value}</p>
    </div>
  )
}
