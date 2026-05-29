import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Session, type User } from '../lib/api'
import { Zap, MessageCircle, Plus, TrendingUp } from 'lucide-react'

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
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            {user ? `Welcome back, ${user.name?.split(' ')[0] || 'there'}!` : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-2">Manage your WhatsApp sessions and integrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          loading={loadingSessions}
          label="Total Sessions"
          value={total}
          icon={MessageCircle}
          color="from-blue-600 to-cyan-600"
          trend={`${connected} connected`}
        />
        <StatCard 
          loading={loadingSessions}
          label="Connected"
          value={connected}
          icon={Zap}
          color="from-green-600 to-emerald-600"
          trend={`${(connected/total*100).toFixed(0)}%`}
        />
        <StatCard 
          loading={loadingSessions}
          label="Connecting"
          value={connecting}
          icon={TrendingUp}
          color="from-yellow-600 to-amber-600"
          trend="In progress"
        />
        <StatCard 
          loading={loadingUser}
          label="Max Sessions"
          value={user?.plan.max_sessions ?? '-'}
          icon={MessageCircle}
          color="from-purple-600 to-pink-600"
          trend={user?.plan.name || 'Plan'}
        />
      </div>

      {loadingUser ? (
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-8 shadow-sm animate-shimmer" style={{ height: '120px' }} />
      ) : user && (
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 backdrop-blur-sm p-8 shadow-sm hover:shadow-md transition-shadow animate-slideUp">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-lg mb-1">{user.plan.name} Plan</h2>
              <p className="text-sm text-muted-foreground">
                {user.plan.max_sessions} sessions &middot; {user.plan.max_api_keys} API keys &middot; {user.plan.max_webhooks} webhooks
              </p>
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {user.role === 'admin' ? '⚙ Admin' : user.plan.name}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/sessions" className="group rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all animate-slideUp">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-1">View Sessions</h3>
                <p className="text-sm text-muted-foreground">Manage all your WhatsApp sessions</p>
              </div>
              <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
          
          <Link to="/api-keys" className="group rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all animate-slideUp">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-1">API Keys</h3>
                <p className="text-sm text-muted-foreground">Create and manage API keys</p>
              </div>
              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      {!loadingSessions && sessions.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden animate-slideUp">
          <div className="px-6 py-4 border-b border-border/40 dark:border-border/20">
            <h3 className="font-semibold">Recent Sessions</h3>
          </div>
          <div className="divide-y divide-border/40 dark:divide-border/20 max-h-96 overflow-y-auto">
            {sessions.slice(0, 5).map((session, i) => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors animate-slideUp"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    session.status === 'connected' ? 'bg-green-500 animate-pulse' :
                    session.status === 'connecting' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{session.name}</p>
                    {session.phone_number && <p className="text-xs text-muted-foreground">{session.phone_number}</p>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  session.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  session.status === 'connecting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {session.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ 
  loading, 
  label, 
  value, 
  icon: Icon, 
  color,
  trend 
}: { 
  loading: boolean
  label: string
  value: number | string
  icon: React.ComponentType<{ className: string }>
  color: string
  trend?: string
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 shadow-sm animate-shimmer" style={{ height: '140px' }} />
    )
  }

  return (
    <div className={`rounded-2xl border border-border/40 bg-gradient-to-br ${color}/5 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg hover:border-${color.split('-')[1]}-600/20 transition-all animate-slideUp hover:scale-105 transform`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-2">{label}</p>
          <p className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-2">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color} text-white shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
