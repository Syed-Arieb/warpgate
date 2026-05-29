import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { Loader2, Users, Wifi, AlertCircle } from 'lucide-react'

export default function Admin() {
  const [userPage, setUserPage] = useState(1)
  const [sessionPage, setSessionPage] = useState(1)

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.adminGetStats(),
    refetchInterval: 10000,
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userPage],
    queryFn: () => api.adminListUsers(userPage),
  })

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['admin-sessions', sessionPage],
    queryFn: () => api.adminListSessions(sessionPage),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">System overview and management</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card/50 p-6 h-28 animate-shimmer" />
          ))}
        </div>
      ) : statsError ? (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-3 border border-destructive/20">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Failed to load system stats</span>
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-slideUp">
          <StatBox label="Users" value={stats.total_users} color="from-blue-600 to-cyan-600" />
          <StatBox label="Sessions" value={stats.total_sessions} color="from-purple-600 to-pink-600" />
          <StatBox label="Connected" value={stats.connected_sessions} color="from-green-600 to-emerald-600" />
          <StatBox label="Messages" value={stats.total_messages} color="from-yellow-600 to-amber-600" />
          <StatBox label="Webhooks" value={stats.total_webhooks} color="from-indigo-600 to-blue-600" />
          <StatBox label="Active" value={stats.active_engines} color="from-rose-600 to-red-600" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden animate-slideUp">
          <div className="px-6 py-4 border-b border-border/40 dark:border-border/20 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recent Users</h2>
          </div>

          {usersLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : !users || users.users.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No users yet
            </div>
          ) : (
            <div className="divide-y divide-border/40 dark:divide-border/20 max-h-96 overflow-y-auto">
              {users.users.map((u, i) => (
                <div key={u.id} className="px-6 py-4 hover:bg-muted/20 transition-colors animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        u.plan?.name === 'Premium' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {u.plan?.name || 'Free'}
                      </span>
                      <span className="text-xs text-muted-foreground">#{u.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {users && users.total > users.page * users.limit && (
            <div className="px-6 py-4 border-t border-border/40 dark:border-border/20">
              <button
                onClick={() => setUserPage(p => p + 1)}
                className="w-full text-sm font-medium text-primary hover:underline transition-colors"
              >
                Load More Users
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden animate-slideUp">
          <div className="px-6 py-4 border-b border-border/40 dark:border-border/20 flex items-center gap-3">
            <Wifi className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recent Sessions</h2>
          </div>

          {sessionsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : !sessions || sessions.sessions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No sessions yet
            </div>
          ) : (
            <div className="divide-y divide-border/40 dark:divide-border/20 max-h-96 overflow-y-auto">
              {sessions.sessions.map((s, i) => (
                <div key={s.id} className="px-6 py-4 hover:bg-muted/20 transition-colors animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">User #{s.user_id}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        s.status === 'connecting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        s.status === 'banned' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {s.status}
                      </span>
                      <span className="text-xs text-muted-foreground">#{s.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sessions && sessions.total > sessions.page * sessions.limit && (
            <div className="px-6 py-4 border-t border-border/40 dark:border-border/20">
              <button
                onClick={() => setSessionPage(p => p + 1)}
                className="w-full text-sm font-medium text-primary hover:underline transition-colors"
              >
                Load More Sessions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-2xl border border-border/40 bg-gradient-to-br ${color}/5 backdrop-blur-sm p-5 shadow-sm hover:shadow-lg hover:border-${color.split('-')[1]}-600/20 transition-all hover:scale-105 transform`}>
      <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>
      <p className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</p>
    </div>
  )
}
