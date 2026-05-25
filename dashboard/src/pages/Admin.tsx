import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useState } from 'react'

export default function Admin() {
  const [userPage, setUserPage] = useState(1)
  const [sessionPage, setSessionPage] = useState(1)

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.adminGetStats(),
    refetchInterval: 10000,
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users', userPage],
    queryFn: () => api.adminListUsers(userPage),
  })

  const { data: sessions } = useQuery({
    queryKey: ['admin-sessions', sessionPage],
    queryFn: () => api.adminListSessions(sessionPage),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Users</p>
            <p className="text-2xl font-bold">{stats.total_users}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Sessions</p>
            <p className="text-2xl font-bold">{stats.total_sessions}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Connected</p>
            <p className="text-2xl font-bold">{stats.connected_sessions}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Messages</p>
            <p className="text-2xl font-bold">{stats.total_messages}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Webhooks</p>
            <p className="text-2xl font-bold">{stats.total_webhooks}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Active Engines</p>
            <p className="text-2xl font-bold">{stats.active_engines}</p>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Users</h2>
        <div className="space-y-2">
          {users?.users.map(u => (
            <div key={u.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{u.plan?.name || 'free'}</Badge>
                <span className="text-xs text-muted-foreground">ID: {u.id}</span>
              </div>
            </div>
          ))}
        </div>
        {users && users.total > users.page * users.limit && (
          <Button variant="outline" className="mt-3" onClick={() => setUserPage(p => p + 1)}>
            Load More
          </Button>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Sessions</h2>
        <div className="space-y-2">
          {sessions?.sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">User #{s.user_id}</p>
              </div>
              <Badge>{s.status}</Badge>
            </div>
          ))}
        </div>
        {sessions && sessions.total > sessions.page * sessions.limit && (
          <Button variant="outline" className="mt-3" onClick={() => setSessionPage(p => p + 1)}>
            Load More
          </Button>
        )}
      </Card>
    </div>
  )
}
