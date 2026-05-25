import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Session } from '../lib/api'
import Layout from '../components/Layout'
import MessagesLog from './MessagesLog'
import WebhooksTab from './WebhooksTab'

type Tab = 'settings' | 'messages' | 'webhooks'

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('settings')
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const sessionId = Number(id)

  const load = () => {
    if (!id) return
    api.getSession(sessionId)
      .then(s => { setSession(s); setName(s.name); setPhone(s.phone_number || ''); setError('') })
      .catch(() => navigate('/sessions'))
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
      const updated = await api.updateSession(session.id, {
        name,
        phone_number: phone || undefined,
      })
      setSession(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  if (!session) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'settings', label: 'Settings' },
    { key: 'messages', label: 'Messages' },
    { key: 'webhooks', label: 'Webhooks' },
  ]

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{session.name}</h1>
          <button onClick={() => navigate('/sessions')} className="text-sm text-muted-foreground hover:text-foreground">Back to Sessions</button>
        </div>

        {error && <p className="text-destructive text-sm mb-3">{error}</p>}

        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            session.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
            session.status === 'connecting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
            session.status === 'banned' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>{session.status}</span>

          {session.status === 'disconnected' && (
            <button onClick={handleStart} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Connect</button>
          )}
          {session.status === 'connecting' && (
            <>
              <button onClick={handleStop} className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700">Cancel</button>
              {qrCode && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  QR ready
                </div>
              )}
            </>
          )}
          {session.status === 'connected' && (
            <>
              <button onClick={handleStop} className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700">Disconnect</button>
              <button onClick={handleLogout} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Logout</button>
            </>
          )}
        </div>

        {qrCode && (
          <div className="mb-4 p-4 bg-card border rounded-lg inline-block">
            <p className="text-xs text-muted-foreground mb-2">Scan with WhatsApp:</p>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCode)}&size=200x200`} alt="QR" className="w-40 h-40" />
          </div>
        )}

        <div className="border-b mb-4">
          <div className="flex gap-4">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-2 text-sm border-b-2 transition-colors ${
                  tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'settings' && (
          <div className="bg-card border rounded-lg p-4">
            <form onSubmit={handleUpdate}>
              <label className="block mb-1 text-sm font-medium">Name</label>
              <input type="text" className="w-full border rounded px-3 py-2 mb-3 bg-background" value={name} onChange={e => setName(e.target.value)} required />

              <label className="block mb-1 text-sm font-medium">Phone number</label>
              <input type="text" className="w-full border rounded px-3 py-2 mb-4 bg-background" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" />

              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:opacity-90">Save</button>
            </form>
          </div>
        )}

        {tab === 'messages' && <MessagesLog sessionId={sessionId} />}
        {tab === 'webhooks' && <WebhooksTab sessionId={sessionId} />}
      </div>
    </Layout>
  )
}
