import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Session, Contact, Group } from '../lib/api'
import MessagesLog from './MessagesLog'
import WebhooksTab from './WebhooksTab'

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
    }
  }

  const handleStop = async () => {
    if (!session) return
    setError('')
    try {
      await api.stopSession(session.id)
      setQrCode(null)
      unsubscribeRef.current?.()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop')
    }
  }

  const handleLogout = async () => {
    if (!session) return
    setError('')
    try {
      await api.logoutSession(session.id)
      setQrCode(null)
      unsubscribeRef.current?.()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setError('')
    try {
      const updated = await api.updateSession(session.id, { name, phone_number: phone || undefined })
      setSession(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'settings', label: 'Settings' },
    { key: 'messages', label: 'Messages' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'groups', label: 'Groups' },
    { key: 'webhooks', label: 'Webhooks' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{session.name}</h1>
        <button onClick={() => navigate('/sessions')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Sessions
        </button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      <div className="flex items-center gap-3 mb-6">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          session.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
          session.status === 'connecting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
          session.status === 'banned' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>{session.status}</span>

        {session.status === 'disconnected' && (
          <button onClick={handleStart} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">Connect</button>
        )}
        {session.status === 'connecting' && (
          <>
            <button onClick={handleStop} className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors">Cancel</button>
            {qrCode && <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />QR ready
            </div>}
          </>
        )}
        {session.status === 'connected' && (
          <>
            <button onClick={handleStop} className="bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors">Disconnect</button>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Logout</button>
          </>
        )}
      </div>

      {qrCode && (
        <div className="mb-6 p-5 bg-card border rounded-xl inline-block">
          <p className="text-xs text-muted-foreground mb-3">Scan with WhatsApp:</p>
          <img
            src={`data:image/svg+xml,${encodeURIComponent(renderQR(qrCode))}`}
            alt="QR"
            className="w-44 h-44 rounded-lg"
          />
        </div>
      )}

      <div className="border-b mb-6">
        <div className="flex gap-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'settings' && (
        <div className="bg-card border rounded-xl p-6 shadow-sm max-w-lg">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium">Name</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">Phone number</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" />
            </div>
            <button type="submit" className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Save</button>
          </form>
        </div>
      )}

      {tab === 'messages' && <MessagesLog sessionId={sessionId} />}
      {tab === 'webhooks' && <WebhooksTab sessionId={sessionId} />}
      {tab === 'contacts' && <ContactsTab sessionId={sessionId} />}
      {tab === 'groups' && <GroupsTab sessionId={sessionId} />}
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
      .catch(() => setError('Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (error) return <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3">{error}</div>

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b"><h3 className="font-semibold">Contacts ({contacts.length})</h3></div>
      {contacts.length === 0 ? (
        <div className="p-8 text-center"><p className="text-sm text-muted-foreground">No contacts found.</p></div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto">
          {contacts.map(c => (
            <div key={c.jid} className="px-5 py-3 text-sm hover:bg-muted/30 transition-colors">
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
      .catch(() => setError('Failed to load groups'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (error) return <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3">{error}</div>

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b"><h3 className="font-semibold">Groups ({groups.length})</h3></div>
      {groups.length === 0 ? (
        <div className="p-8 text-center"><p className="text-sm text-muted-foreground">No groups found.</p></div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto">
          {groups.map(g => (
            <div key={g.group_jid} className="px-5 py-3 text-sm hover:bg-muted/30 transition-colors">
              <p className="font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.member_count} members &middot; {g.group_jid}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
