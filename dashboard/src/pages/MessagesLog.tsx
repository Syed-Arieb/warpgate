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
      <form onSubmit={handleSend} className="bg-card border rounded-lg p-4 mb-4">
        <h3 className="font-semibold mb-2">Send Message</h3>
        {error && <p className="text-destructive text-sm mb-2">{error}</p>}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Recipient JID (e.g. 1234567890@s.whatsapp.net)"
            className="flex-1 border rounded px-3 py-2 bg-background text-sm"
            value={to}
            onChange={e => setTo(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Message text"
            className="flex-1 border rounded px-3 py-2 bg-background text-sm"
            value={text}
            onChange={e => setText(e.target.value)}
            required
          />
          <button type="submit" disabled={sending} className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:opacity-90 disabled:opacity-50">
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>

      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Messages ({total})</h3>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className="p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    msg.direction === 'out' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {msg.direction === 'out' ? '→' : '←'}
                  </span>
                  <span className="text-xs text-muted-foreground">{msg.message_type}</span>
                  <span className={`text-xs ml-auto ${
                    msg.status === 'sent' ? 'text-blue-500' :
                    msg.status === 'delivered' ? 'text-green-500' :
                    msg.status === 'read' ? 'text-green-600' :
                    'text-gray-400'
                  }`}>{msg.status}</span>
                </div>
                <p className="text-foreground">{msg.content || '(media)'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {msg.to_jid || msg.from_jid}
                  {msg.sent_at && <> · {new Date(msg.sent_at).toLocaleString()}</>}
                </p>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-3 flex justify-center gap-2 border-t">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="text-xs px-2 py-1 rounded border hover:bg-muted disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-xs py-1 text-muted-foreground">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-xs px-2 py-1 rounded border hover:bg-muted disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
