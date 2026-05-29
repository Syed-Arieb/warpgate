import { useEffect, useState } from 'react'
import { api, type Message } from '../lib/api'

interface Props {
  sessionId: number
}

export default function MessagesLog({ sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const limit = 20

  const load = () => {
    setLoading(true)
    api.getMessageHistory(sessionId, page, limit)
      .then(res => { setMessages(res.messages); setTotal(res.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [sessionId, page])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await api.sendTextMessage(sessionId, to, text)
      setTo('')
      setText('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <form onSubmit={handleSend} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
        <h3 className="font-semibold mb-3">Send Message</h3>
        {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Recipient JID (e.g. 1234567890@s.whatsapp.net)"
            className="w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={to}
            onChange={e => setTo(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Message text"
              className="flex-1 border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={text}
              onChange={e => setText(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold">Messages ({total})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className="px-5 py-4 text-sm hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    msg.direction === 'out' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {msg.direction === 'out' ? 'Out' : 'In'}
                  </span>
                  <span className="text-xs text-muted-foreground">{msg.message_type}</span>
                  <span className={`text-xs ml-auto font-medium ${
                    msg.status === 'sent' ? 'text-primary' :
                    msg.status === 'delivered' ? 'text-wa-dark' :
                    msg.status === 'read' ? 'text-wa-darker' :
                    'text-muted-foreground'
                  }`}>{msg.status}</span>
                </div>
                <p className="text-foreground">{msg.content || '(media)'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {msg.to_jid || msg.from_jid}
                  {msg.sent_at && <> &middot; {new Date(msg.sent_at).toLocaleString()}</>}
                </p>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-4 flex items-center justify-center gap-3 border-t">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-30 transition-colors font-medium"
            >
              Previous
            </button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-30 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
