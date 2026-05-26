import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Session } from '../lib/api'

const statusColors: Record<string, string> = {
  disconnected: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  connecting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  connected: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  banned: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = () => {
    api.listSessions()
      .then(setSessions)
      .catch(() => navigate('/login'))
  }

  useEffect(load, [navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.createSession(newName)
      setNewName('')
      setShowCreate(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session?')) return
    try {
      await api.deleteSession(id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Session
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card border rounded-xl p-5 mb-6 flex gap-3">
          <input
            type="text"
            placeholder="Session name"
            className="flex-1 border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Create
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground px-3 py-2 hover:text-foreground transition-colors">
            Cancel
          </button>
        </form>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <p className="text-muted-foreground">No sessions yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-card border rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[session.status] || statusColors.disconnected}`}>
                  {session.status}
                </span>
                <div>
                  <Link to={`/sessions/${session.id}`} className="font-medium hover:text-primary transition-colors">
                    {session.name}
                  </Link>
                  {session.phone_number && (
                    <p className="text-sm text-muted-foreground mt-0.5">{session.phone_number}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(session.id)}
                className="text-sm text-destructive hover:underline px-3 py-1 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
