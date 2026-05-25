import { useEffect, useState } from 'react'
import { api, type Webhook, type WebhookLog } from '../lib/api'

interface Props {
  sessionId: number
}

export default function WebhooksTab({ sessionId }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [logs, setLogs] = useState<WebhookLog[]>([])

  const eventOptions = [
    'message.received', 'message.sent', 'message.delivered', 'message.read',
    'session.connected', 'session.disconnected', 'session.qr',
    'group.joined', 'group.left',
  ]

  const load = () => {
    api.listWebhooks(sessionId).then(setWebhooks).catch(() => {})
  }

  useEffect(load, [sessionId])

  const toggleEvent = (evt: string) => {
    setEvents(prev => prev.includes(evt) ? prev.filter(e => e !== evt) : [...prev, evt])
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.createWebhook(sessionId, { name, url, events })
      setName('')
      setUrl('')
      setEvents([])
      setShowCreate(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    }
  }

  const handleToggleActive = async (wh: Webhook) => {
    try {
      await api.updateWebhook(sessionId, wh.id, { active: !wh.active })
      load()
    } catch {}
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this webhook?')) return
    try {
      await api.deleteWebhook(sessionId, id)
      load()
    } catch {}
  }

  const toggleLogs = async (whId: number) => {
    if (expandedId === whId) {
      setExpandedId(null)
      return
    }
    setExpandedId(whId)
    try {
      const res = await api.getWebhookLogs(sessionId, whId, 1, 10)
      setLogs(res.logs)
    } catch {}
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Webhooks</h3>
        <button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90">
          + Add Webhook
        </button>
      </div>

      {error && <p className="text-destructive text-sm mb-2">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card border rounded-lg p-4 mb-4 space-y-3">
          <input
            type="text" placeholder="Name" className="w-full border rounded px-3 py-2 bg-background text-sm"
            value={name} onChange={e => setName(e.target.value)} required
          />
          <input
            type="url" placeholder="https://example.com/webhook" className="w-full border rounded px-3 py-2 bg-background text-sm"
            value={url} onChange={e => setUrl(e.target.value)} required
          />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Events</p>
            <div className="flex flex-wrap gap-1">
              {eventOptions.map(evt => (
                <button
                  key={evt} type="button"
                  onClick={() => toggleEvent(evt)}
                  className={`text-xs px-2 py-1 rounded border ${
                    events.includes(evt) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                  }`}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground">Cancel</button>
          </div>
        </form>
      )}

      {webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No webhooks configured.</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => (
            <div key={wh.id} className="border rounded-lg bg-card">
              <div className="p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${wh.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="font-medium text-sm">{wh.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {JSON.parse(wh.events || '[]').map((evt: string) => (
                      <span key={evt} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{evt}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleActive(wh)} className="text-xs text-muted-foreground hover:text-foreground">
                    {wh.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => toggleLogs(wh.id)} className="text-xs text-muted-foreground hover:text-foreground">
                    Logs
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="text-xs text-destructive hover:text-destructive">
                    Delete
                  </button>
                </div>
              </div>

              {expandedId === wh.id && (
                <div className="border-t p-3 bg-muted/30">
                  <h4 className="text-xs font-medium mb-2">Delivery Logs</h4>
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No delivery attempts yet.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {logs.map(log => (
                        <div key={log.id} className="text-xs p-2 rounded bg-card border">
                          <div className="flex justify-between">
                            <span className="font-medium">{log.event_type}</span>
                            <span className={log.success ? 'text-green-600' : 'text-destructive'}>
                              HTTP {log.response_status} · attempt {log.attempt}/{log.max_attempts}
                            </span>
                          </div>
                          {log.error && <p className="text-destructive mt-0.5">{log.error}</p>}
                          <p className="text-muted-foreground mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
