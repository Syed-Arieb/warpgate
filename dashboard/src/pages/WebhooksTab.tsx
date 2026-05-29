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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Webhooks</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add Webhook
        </button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <input
            type="text" placeholder="Webhook name"
            className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={name} onChange={e => setName(e.target.value)} required
          />
          <input
            type="url" placeholder="https://example.com/webhook"
            className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={url} onChange={e => setUrl(e.target.value)} required
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Events</p>
            <div className="flex flex-wrap gap-1.5">
              {eventOptions.map(evt => (
                <button
                  key={evt} type="button"
                  onClick={() => toggleEvent(evt)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    events.includes(evt) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                  }`}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground px-3 py-2 hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No webhooks configured.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="border border-border rounded-xl bg-card shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${wh.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="font-medium text-sm">{wh.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {JSON.parse(wh.events || '[]').map((evt: string) => (
                      <span key={evt} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{evt}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button onClick={() => handleToggleActive(wh)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
                    {wh.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => toggleLogs(wh.id)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
                    Logs
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="text-xs text-destructive hover:text-destructive px-2 py-1 rounded hover:bg-destructive/10 transition-colors">
                    Delete
                  </button>
                </div>
              </div>

              {expandedId === wh.id && (
                <div className="border-t p-4 bg-muted/30">
                  <h4 className="text-xs font-medium mb-3">Delivery Logs</h4>
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No delivery attempts yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {logs.map(log => (
                          <div key={log.id} className="text-xs p-3 rounded-lg bg-card border border-border">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{log.event_type}</span>
                            <span className={log.success ? 'text-green-600' : 'text-destructive'}>
                              HTTP {log.response_status} &middot; attempt {log.attempt}/{log.max_attempts}
                            </span>
                          </div>
                          {log.error && <p className="text-destructive mt-1">{log.error}</p>}
                          <p className="text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString()}</p>
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
