import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Session } from '../lib/api'
import { Plus, Search, Trash2, AlertCircle, Loader2, ChevronRight } from 'lucide-react'

const statusConfig = {
  disconnected: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-300', dot: 'bg-gray-500' },
  connecting: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-300', dot: 'bg-yellow-500 animate-pulse' },
  connected: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-300', dot: 'bg-green-500 animate-pulse' },
  banned: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-300', dot: 'bg-red-500' },
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api.listSessions()
      .then(setSessions)
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.createSession(newName)
      setNewName('')
      setShowCreate(false)
      setSuccess('Session created successfully!')
      setTimeout(() => setSuccess(''), 3000)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session? This action cannot be undone.')) return
    setDeleting(id)
    setError('')
    try {
      await api.deleteSession(id)
      setSuccess('Session deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
      setDeleting(null)
    }
  }

  const filtered = sessions.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone_number?.includes(search) ?? false)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground mt-1">Create and manage WhatsApp sessions</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-primary-foreground text-sm font-semibold hover:shadow-lg transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-3 animate-slideDown border border-destructive/20">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-3 flex items-start gap-3 animate-slideDown border border-green-200 dark:border-green-900/40">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 p-6 animate-slideDown shadow-sm">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter session name"
              className="flex-1 border rounded-lg px-4 py-2.5 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3 animate-slideUp">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card/50 p-5 h-20 animate-shimmer" />
          ))}
        </div>
      ) : (
        <>
          {sessions.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm px-4 py-2.5 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sessions..."
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center animate-slideUp">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No sessions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create one to get started with WhatsApp integration</p>
            </div>
          ) : (
            <div className="space-y-3 animate-slideUp">
              {filtered.map((session, i) => {
                const config = statusConfig[session.status as keyof typeof statusConfig] || statusConfig.disconnected
                return (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 hover:shadow-lg hover:border-primary/20 transition-all group cursor-pointer animate-slideUp hover:scale-[1.01] transform"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`flex-shrink-0 w-3 h-3 rounded-full ${config.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium group-hover:text-primary transition-colors truncate">{session.name}</p>
                          {session.phone_number && (
                            <p className="text-sm text-muted-foreground mt-0.5">{session.phone_number}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${config.bg} ${config.text}`}>
                          {session.status}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => {
                              e.preventDefault()
                              handleDelete(session.id)
                            }}
                            disabled={deleting === session.id}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete session"
                          >
                            {deleting === session.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MessageCircle(props: { className: string }) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  )
}
