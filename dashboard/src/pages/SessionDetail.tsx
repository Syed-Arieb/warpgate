import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Session, Contact, Group } from '../lib/api'
import MessagesLog from './MessagesLog'
import WebhooksTab from './WebhooksTab'
import { ChevronLeft, Power, LogOut, Zap, AlertCircle, Loader2, Trash2 } from 'lucide-react'

type Tab = 'settings' | 'messages' | 'webhooks' | 'contacts' | 'groups'

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('settings')
  const [actionLoading, setActionLoading] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const sessionId = Number(id)

  const load = () => {
    if (!id) return
    setLoading(true)
    api.getSession(sessionId)
      .then(s => { setSession(s); setName(s.name); setPhone(s.phone_number || ''); setError('') })
      .catch(() => navigate('/sessions'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id, navigate])

  useEffect(() => {
    return () => { unsubscribeRef.current?.() }
  }, [])

  const handleStart = async () => {
    if (!session) return
    setError('')
    setQrCode(null)
    setActionLoading(true)
    try {
      await api.startSession(session.id)
      setSession(prev => prev ? { ...prev, status: 'connecting' } : prev)

      unsubscribeRef.current?.()
      const unsub = api.subscribeQRSession(session.id, (code) => {
        setQrCode(code)
      })
      unsubscribeRef.current = unsub
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start')
      load()
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    if (!session) return
    setError('')
    setActionLoading(true)
    try {
      await api.stopSession(session.id)
      setQrCode(null)
      unsubscribeRef.current?.()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!session) return
    setError('')
    setActionLoading(true)
    try {
      await api.logoutSession(session.id)
      setQrCode(null)
      unsubscribeRef.current?.()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setError('')
    setActionLoading(true)
    try {
      const updated = await api.updateSession(session.id, { name, phone_number: phone || undefined })
      setSession(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'settings', label: 'Settings' },
    { key: 'messages', label: 'Messages' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'groups', label: 'Groups' },
    { key: 'webhooks', label: 'Webhooks' },
  ]

  const statusColor = {
    connected: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    connecting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    disconnected: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/sessions')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/40 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Sessions
        </button>
        <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
        <div className="w-20" />
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-3 animate-slideDown border border-destructive/20">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor[session.status as keyof typeof statusColor] || statusColor.disconnected}`}>
          {session.status}
        </span>

        {session.status === 'disconnected' && (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Power className="w-4 h-4" />
            Connect
          </button>
        )}

        {session.status === 'connecting' && (
          <>
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Zap className="w-4 h-4" />
              Cancel
            </button>
            {qrCode && (
              <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300 px-3 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                QR ready to scan
              </div>
            )}
          </>
        )}

        {session.status === 'connected' && (
          <>
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Power className="w-4 h-4" />
              Disconnect
            </button>
            <button
              onClick={handleLogout}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </>
        )}

        {session.status === 'banned' && (
          <div className="text-sm text-destructive px-3 py-2 rounded-lg bg-destructive/10">
            This session has been banned. Please create a new one.
          </div>
        )}
      </div>

      {qrCode && (
        <div className="rounded-2xl border border-border bg-card p-6 animate-slideUp inline-block shadow-sm">
          <p className="text-sm text-muted-foreground mb-4 font-medium">Scan with WhatsApp:</p>
          <img
            src={`data:image/svg+xml,${encodeURIComponent(renderQR(qrCode))}`}
            alt="QR"
            className="w-52 h-52 rounded-lg border-2 border-border"
          />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden animate-slideUp shadow-sm">
        <div className="border-b border-border flex">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                tab === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'settings' && (
            <form onSubmit={handleUpdate} className="space-y-5 max-w-lg">
              <div>
                <label className="block mb-2 text-sm font-medium">Session Name</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Phone Number (Optional)</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all shadow-sm"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 bg-wa hover:bg-[#1da851] text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-wa/20 hover:shadow-xl hover:shadow-wa/30 transition-all disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </form>
          )}

          {tab === 'messages' && <MessagesLog sessionId={sessionId} />}
          {tab === 'webhooks' && <WebhooksTab sessionId={sessionId} />}
          {tab === 'contacts' && <ContactsTab sessionId={sessionId} />}
          {tab === 'groups' && <GroupsTab sessionId={sessionId} />}
        </div>
      </div>
    </div>
  )
}

function renderQR(code: string): string {
  const size = 11
  const cells: boolean[][] = []
  for (let y = 0; y < size; y++) {
    cells[y] = []
    for (let x = 0; x < size; x++) {
      const idx = y * size + x
      const char = code.charCodeAt(idx % code.length)
      cells[y][x] = (char + x * 7 + y * 13) % 3 !== 0
    }
  }
  const cellSize = 20
  const totalSize = size * cellSize
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">`
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="white" rx="4"/>`
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cells[y][x]) {
        svg += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black" rx="3"/>`
      }
    }
  }
  svg += '</svg>'
  return svg
}

function ContactsTab({ sessionId }: { sessionId: number }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.listContacts(sessionId)
      .then(setContacts)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-3 border border-destructive/20">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold mb-4">Contacts ({contacts.length})</h3>
      {contacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No contacts found.</p>
        </div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto rounded-lg border border-border">
          {contacts.map((c, i) => (
            <div key={c.jid} className="px-5 py-3 text-sm hover:bg-muted/30 transition-colors animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
              <p className="font-medium">{c.name || c.push_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.jid}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupsTab({ sessionId }: { sessionId: number }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.listGroups(sessionId)
      .then(setGroups)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load groups'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-3 border border-destructive/20">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold mb-4">Groups ({groups.length})</h3>
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No groups found.</p>
        </div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto rounded-lg border border-border">
          {groups.map((g, i) => (
            <div key={g.group_jid} className="px-5 py-3 text-sm hover:bg-muted/30 transition-colors animate-slideUp" style={{ animationDelay: `${i * 30}ms` }}>
              <p className="font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.member_count} members</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
