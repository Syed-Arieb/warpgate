import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Session } from '../lib/api'
import Layout from '../components/Layout'

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
    <Layout>
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Sessions</h1>
        </div>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:opacity-90 mb-4"
        >
          + New Session
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-card border rounded-lg p-4 mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Session name"
              className="flex-1 border rounded px-3 py-2 bg-background"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm hover:opacity-90">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground px-3 py-2">
              Cancel
            </button>
          </form>
        )}

        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[session.status] || statusColors.disconnected}`}>
                    {session.status}
                  </span>
                  <div>
                    <Link to={`/sessions/${session.id}`} className="font-medium hover:text-primary">
                      {session.name}
                    </Link>
                    {session.phone_number && (
                      <p className="text-sm text-muted-foreground">{session.phone_number}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(session.id)} className="text-destructive hover:underline text-sm">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
